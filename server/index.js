// Load environment variables from the root .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const setupSocket = require('./sockets');

// Import routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const githubRoutes = require('./routes/github.routes');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  frameguard: false,
}));

// Cross-origin isolation headers required by WebContainers (SharedArrayBuffer)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// Rate limiting: max 100 requests per minute per IP for the API
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per minute)
  message: { error: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware
app.use(express.json());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CLIENT_URL,
  process.env.VITE_SOCKET_URL, // Render production URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl / mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/github', githubRoutes);

// Proxy route: forwards requests to user-started servers in the terminal
app.use('/api/proxy/:port', (req, res) => {
  const port = parseInt(req.params.port);
  if (isNaN(port) || port < 1024 || port > 65535) {
    return res.status(400).json({ error: 'Invalid port' });
  }

  const http = require('http');
  const targetPath = req.url || '/';
  const proxyBase = `/api/proxy/${port}`;
  const options = {
    hostname: '127.0.0.1',
    port,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${port}` },
    timeout: 15000,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    const contentType = headers['content-type'] || '';

    // For HTML responses, inject script that patches fetch/XHR to rewrite URLs through proxy
    if (contentType.includes('text/html')) {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => body += chunk);
      proxyRes.on('end', () => {
        // Inject script that rewrites fetch('/...') and XHR to go through proxy
        const patchScript = `<script>(function(){
var B='${proxyBase}';
var _f=window.fetch;
window.fetch=function(u,o){
if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
return _f.call(this,u,o);
};
var _o=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;
return _o.apply(this,arguments);
};
})();</script>`;
        if (body.includes('<head>')) {
          body = body.replace('<head>', `<head>${patchScript}`);
        } else if (body.includes('<HEAD>')) {
          body = body.replace('<HEAD>', `<HEAD>${patchScript}`);
        } else {
          body = patchScript + body;
        }
        if (!contentType.includes('charset')) {
          headers['content-type'] = contentType + '; charset=utf-8';
        }
        delete headers['content-length'];
        headers['content-length'] = Buffer.byteLength(body);
        res.writeHead(proxyRes.statusCode, headers);
        res.end(body);
      });
      return;
    }

    // Non-HTML: pipe directly
    if (contentType.includes('text/') && !contentType.includes('charset')) {
      headers['content-type'] = contentType + '; charset=utf-8';
    }
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).send('<h2>Server timeout</h2><p>The server took too long to respond.</p>');
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).send(`<meta charset="utf-8"><h2>No server running on port ${port}</h2><p>Start a server in the terminal first, e.g.:<br><code>node server.js</code></p>`);
    }
  });

  req.pipe(proxyReq);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  
  // Only serve index.html for frontend routes (not API, not files with extensions)
  app.get('*', (req, res, next) => {
    // Skip if the request looks like an API call or a file with an extension
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket handlers
setupSocket(io);

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  // Connect to MongoDB
  await connectDB();

  // Connect to Redis (optional — won't crash if unavailable)
  await connectRedis();

  server.listen(PORT, () => {
    console.log(`\n🚀 CollabCode server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

start();

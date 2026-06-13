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

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CLIENT_URL,
  process.env.VITE_SOCKET_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, try again in a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════════════════════════════════════
// PROXY ROUTE — MUST be BEFORE express.json() so req body stream is preserved
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api/proxy/:port', (req, res) => {
  const port = parseInt(req.params.port);
  if (isNaN(port) || port < 1024 || port > 65535) {
    return res.status(400).json({ error: 'Invalid port' });
  }

  const httpLib = require('http');
  const targetPath = req.url || '/';
  const proxyBase = `/api/proxy/${port}`;

  // Build headers — remove problematic ones
  const fwdHeaders = { ...req.headers };
  delete fwdHeaders['host'];
  delete fwdHeaders['content-length']; // let Node recalculate
  fwdHeaders['host'] = `127.0.0.1:${port}`;

  const options = {
    hostname: '127.0.0.1',
    port,
    path: targetPath,
    method: req.method,
    headers: fwdHeaders,
    timeout: 30000,
  };

  const proxyReq = httpLib.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    const contentType = headers['content-type'] || '';

    // Remove security headers that block proxy pages
    delete headers['cross-origin-opener-policy'];
    delete headers['cross-origin-embedder-policy'];
    delete headers['cross-origin-resource-policy'];

    // For HTML: inject fetch/XHR monkey-patch so absolute URLs route through proxy
    if (contentType.includes('text/html')) {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => body += chunk);
      proxyRes.on('end', () => {
        const patch = `<script>(function(){var B='${proxyBase}';var _f=window.fetch;window.fetch=function(u,o){if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;return _f.call(this,u,o);};var _o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith(B))u=B+u;return _o.apply(this,arguments);};})();<\/script>`;
        // Inject after <head> or at the very start
        if (body.includes('<head>')) {
          body = body.replace('<head>', '<head>' + patch);
        } else if (body.includes('<html>')) {
          body = body.replace('<html>', '<html><head>' + patch + '</head>');
        } else {
          body = patch + body;
        }
        if (!contentType.includes('charset')) {
          headers['content-type'] = contentType + '; charset=utf-8';
        }
        delete headers['content-length'];
        headers['content-length'] = Buffer.byteLength(body, 'utf8');
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
    if (!res.headersSent) res.status(504).send('<h2>Server timeout</h2>');
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.status(502).send(`<meta charset="utf-8"><h2>No server running on port ${port}</h2><p>Start a server in the terminal: <code>node server.js</code></p>`);
    }
  });

  // Pipe the raw request body (works because express.json() hasn't consumed it yet)
  req.pipe(proxyReq);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BODY PARSER — AFTER proxy so proxy can pipe raw body
// ═══════════════════════════════════════════════════════════════════════════════
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/github', githubRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }
    res.sendFile(path.resolve(clientDist, 'index.html'));
  });
}

// Create HTTP server and Socket.IO
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
  await connectDB();
  await connectRedis();

  server.listen(PORT, () => {
    console.log(`\n🚀 CollabCode server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

start();

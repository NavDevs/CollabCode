<div align="center">

# 🚀 CollabCode — Real-Time Collaborative Code Editor

### Build Full-Stack Apps Together — Live in Your Browser

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-collabcode--ihw7.onrender.com-059669?style=for-the-badge&logoColor=white)](https://collabcode-ihw7.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)

---

**CollabCode** is a full-featured, browser-based collaborative code editor — like **VS Code in the cloud** — where multiple developers can build full-stack applications together in real time. It features a Monaco code editor, an integrated VS Code-style Linux terminal, real-time Yjs CRDT collaboration, GitHub integration, team chat with typing indicators, and multi-language code execution with live preview.

</div>

---

## 🌐 Live Website

### **[https://collabcode-ihw7.onrender.com](https://collabcode-ihw7.onrender.com)**

> Sign up, create a room, share the link, and start building together! No installation required.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🖥️ **Monaco Editor** | VS Code's editor engine with syntax highlighting, IntelliSense, and multi-language support |
| 👥 **Real-Time Collaboration** | Multiple users edit the same file simultaneously with conflict-free merging (Yjs CRDT) |
| 📁 **Multi-File Workspace** | Create unlimited files — JS, TS, Python, HTML, CSS, Bash — all in one room |
| ▶️ **Code Execution** | Run JavaScript, Python, TypeScript, C++, Java, Go, Rust, Ruby, PHP, and Bash |
| 🌐 **Live Preview** | Start a web server (`node server.js`) and preview it via built-in proxy — full-stack apps work! |
| 🖥️ **VS Code Terminal** | Full Linux shell with tabs, drag-to-resize, sync button, `npm install`, `node`, `python3`, `git` |
| 🔗 **GitHub Integration** | Connect GitHub, import repos, and push entire workspaces as commits (OAuth2) |
| 💬 **Team Chat** | Built-in chat panel with avatars, typing indicators, date separators, and member list |
| 🔐 **Authentication** | Secure sign-in with Google via Clerk |
| 🎨 **VS Code Dark Theme** | Premium dark UI with glassmorphism, micro-animations, and gradient accents |
| 🔔 **Notifications** | Real-time notifications when collaborators join, leave, or run code |
| 📊 **Presence Indicators** | See who's online with colored avatars and live cursor positions |
| 💾 **Auto-Save** | Code auto-saves to database every 1.5 seconds — never lose work on page refresh |
| 🔄 **File Sync** | Bi-directional sync between editor and terminal filesystem |

---

## 🛠️ Supported Languages

| Language | Run ▶ | Terminal | Syntax Highlighting |
|---|---|---|---|
| **JavaScript** | ✅ | ✅ `node file.js` | ✅ |
| **TypeScript** | ✅ | ✅ `npx tsx file.ts` | ✅ |
| **Python** | ✅ | ✅ `python3 file.py` | ✅ |
| **HTML/CSS** | ✅ (Live Preview) | ✅ | ✅ |
| **Bash/Shell** | ✅ | ✅ `bash file.sh` | ✅ |
| **C++** | ✅ | ✅ `g++ -o out file.cpp && ./out` | ✅ |
| **Java** | ✅ | ✅ `javac File.java && java File` | ✅ |
| **Go** | ✅ | ✅ `go run file.go` | ✅ |
| **Rust** | ✅ | ✅ `rustc file.rs && ./file` | ✅ |
| **Ruby** | ✅ | ✅ `ruby file.rb` | ✅ |
| **PHP** | ✅ | ✅ `php file.php` | ✅ |

> Rooms are **language-agnostic** — create any combination of files and build full-stack applications!

---

## 🧪 Example: Full-Stack Todo App (Multi-File)

Create a room, add these 3 files, then run `node server.js` in the terminal:

<details>
<summary>📄 <strong>server.js</strong> — Node.js backend with REST API</summary>

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

let todos = [
  { id: 1, text: 'Learn CollabCode', done: true },
  { id: 2, text: 'Build a full-stack app', done: false },
  { id: 3, text: 'Deploy to production', done: false },
];

const server = http.createServer((req, res) => {
  if (req.url === '/api/todos' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(todos));
  }
  if (req.url === '/api/todos' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { text } = JSON.parse(body);
      todos.push({ id: Date.now(), text, done: false });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(todos));
    });
    return;
  }
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html.replace('</head>', `<style>${css}</style></head>`));
});

server.listen(3001, () => console.log('Server running at http://localhost:3001'));
```
</details>

<details>
<summary>📄 <strong>index.html</strong> — Frontend with fetch API</summary>

```html
<!DOCTYPE html>
<html><head><title>Todo App</title></head>
<body>
  <div class="app">
    <h1>📝 Todo App</h1>
    <p class="sub">Built with CollabCode — 3 files working together</p>
    <div class="add-row">
      <input id="inp" placeholder="Add a new task..." />
      <button onclick="addTodo()">Add</button>
    </div>
    <div id="list">Loading...</div>
  </div>
  <script>
    const load = () => fetch('/api/todos').then(r=>r.json()).then(render);
    const render = todos => {
      document.getElementById('list').innerHTML = todos.map(t =>
        `<div class="item ${t.done?'done':''}"><span>${t.done?'✅':'⬜'} ${t.text}</span></div>`
      ).join('');
    };
    const addTodo = () => {
      const inp = document.getElementById('inp');
      if (!inp.value.trim()) return;
      fetch('/api/todos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text:inp.value}) })
        .then(r=>r.json()).then(render);
      inp.value = '';
    };
    document.getElementById('inp').addEventListener('keydown', e => { if(e.key==='Enter') addTodo(); });
    load();
  </script>
</body></html>
```
</details>

<details>
<summary>📄 <strong>style.css</strong> — Dark theme styles</summary>

```css
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0f0f17;color:#e5e5e5;min-height:100vh;display:flex;justify-content:center;padding-top:60px}
.app{max-width:440px;width:100%}
h1{font-size:36px;margin-bottom:4px}
.sub{color:#666;font-size:14px;margin-bottom:24px}
.add-row{display:flex;gap:8px;margin-bottom:20px}
.add-row input{flex:1;padding:12px 16px;border-radius:10px;border:1px solid #333;background:#1a1a24;color:#fff;font-size:14px;outline:none}
.add-row input:focus{border-color:#6366f1}
.add-row button{padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;cursor:pointer}
.item{padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:8px;font-size:15px}
.item.done span{text-decoration:line-through;color:#666}
```
</details>

### Steps:
1. Create room → create 3 files → paste code  
2. Open terminal → type `node server.js`  
3. Click the **🌐 Live Preview** link → see the full Todo app!  
4. Add todos, they persist across refreshes of the preview page

---

## 🧪 Example: Real-Time Chat Server (Bigger Multi-File Project)

A WebSocket-based chat app with Express, multiple routes, and a styled frontend:

<details>
<summary>📄 <strong>app.js</strong> — Express + WebSocket server (run this file)</summary>

```javascript
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory store
const messages = [];
const users = new Map();

// Serve static files
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, 'public/styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'public/client.js'), 'utf8');
  html = html.replace('</head>', `<style>${css}</style></head>`);
  html = html.replace('</body>', `<script>${js}</script></body>`);
  res.send(html);
});

// REST API
app.get('/api/messages', (req, res) => {
  res.json({ messages: messages.slice(-50), userCount: users.size });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalMessages: messages.length,
    activeUsers: users.size,
    uptime: process.uptime().toFixed(0) + 's',
  });
});

// WebSocket handling
wss.on('connection', (ws) => {
  let username = 'User' + Math.floor(Math.random() * 1000);
  users.set(ws, username);
  broadcast({ type: 'system', text: `${username} joined the chat`, users: users.size });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'setName') {
        const old = username;
        username = msg.name.slice(0, 20);
        users.set(ws, username);
        broadcast({ type: 'system', text: `${old} is now ${username}`, users: users.size });
      } else if (msg.type === 'chat') {
        const chatMsg = { type: 'chat', user: username, text: msg.text.slice(0, 500), time: Date.now() };
        messages.push(chatMsg);
        broadcast(chatMsg);
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    users.delete(ws);
    broadcast({ type: 'system', text: `${username} left the chat`, users: users.size });
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(json); });
}

server.listen(3001, () => console.log('Chat server at http://localhost:3001'));
```
</details>

<details>
<summary>📄 <strong>public/index.html</strong> — Chat UI</summary>

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Live Chat</title></head>
<body>
  <div id="app">
    <header>
      <h1>💬 Live Chat</h1>
      <div id="stats">Connecting...</div>
    </header>
    <div id="messages"></div>
    <div id="input-bar">
      <input id="msg" placeholder="Type a message..." autocomplete="off" />
      <button onclick="sendMsg()">Send</button>
    </div>
    <div id="name-bar">
      <input id="name" placeholder="Change name..." />
      <button onclick="changeName()">Set</button>
    </div>
  </div>
</body>
</html>
```
</details>

<details>
<summary>📄 <strong>public/styles.css</strong> — Dark chat theme</summary>

```css
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0d1117; color: #c9d1d9; height: 100vh; display: flex; justify-content: center; align-items: center; }
#app { width: 100%; max-width: 520px; height: 90vh; display: flex; flex-direction: column; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; background: #161b22; }
header { padding: 16px 20px; background: #0d1117; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
h1 { font-size: 20px; }
#stats { font-size: 12px; color: #8b949e; }
#messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.msg { padding: 10px 14px; border-radius: 12px; max-width: 80%; animation: fadeIn 0.3s ease; }
.msg.chat { background: #21262d; border: 1px solid #30363d; align-self: flex-start; }
.msg.mine { background: #1f6feb; border: none; align-self: flex-end; color: #fff; }
.msg.system { align-self: center; font-size: 12px; color: #8b949e; font-style: italic; background: none; padding: 4px; }
.msg .user { font-size: 11px; font-weight: 700; color: #58a6ff; margin-bottom: 4px; }
.msg .time { font-size: 10px; color: #8b949e; margin-top: 4px; text-align: right; }
#input-bar, #name-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #30363d; }
#input-bar input, #name-bar input { flex: 1; padding: 10px 14px; border-radius: 10px; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; font-size: 14px; outline: none; }
#input-bar input:focus, #name-bar input:focus { border-color: #1f6feb; }
button { padding: 10px 20px; border-radius: 10px; border: none; background: #1f6feb; color: #fff; font-weight: 600; cursor: pointer; }
button:hover { background: #388bfd; }
#name-bar { background: #0d1117; }
#name-bar button { background: #238636; font-size: 12px; padding: 8px 14px; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
```
</details>

<details>
<summary>📄 <strong>public/client.js</strong> — WebSocket client</summary>

```javascript
const ws = new WebSocket(location.origin.replace('http', 'ws'));
const msgDiv = document.getElementById('messages');
let myName = 'User' + Math.floor(Math.random() * 1000);

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.users !== undefined) {
    document.getElementById('stats').textContent = msg.users + ' online';
  }
  const el = document.createElement('div');
  el.className = 'msg ' + msg.type;
  if (msg.type === 'system') {
    el.textContent = msg.text;
  } else {
    const isMine = msg.user === myName;
    if (isMine) el.classList.add('mine');
    el.innerHTML = (isMine ? '' : `<div class="user">${msg.user}</div>`) +
      `<div>${msg.text}</div>` +
      `<div class="time">${new Date(msg.time).toLocaleTimeString()}</div>`;
  }
  msgDiv.appendChild(el);
  msgDiv.scrollTop = msgDiv.scrollHeight;
};

function sendMsg() {
  const inp = document.getElementById('msg');
  if (!inp.value.trim()) return;
  ws.send(JSON.stringify({ type: 'chat', text: inp.value }));
  inp.value = '';
}

function changeName() {
  const inp = document.getElementById('name');
  if (!inp.value.trim()) return;
  myName = inp.value.trim();
  ws.send(JSON.stringify({ type: 'setName', name: myName }));
  inp.value = '';
}

document.getElementById('msg').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMsg();
});

document.getElementById('name').addEventListener('keydown', e => {
  if (e.key === 'Enter') changeName();
});
```
</details>

### Steps:
1. Create a room → create 4 files: `app.js`, `public/index.html`, `public/styles.css`, `public/client.js`
2. Open terminal → `npm init -y && npm install express ws`
3. Run: `node app.js`
4. Click the 🌐 Live Preview link
5. Open in multiple tabs to chat with yourself!

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework with hooks and functional components |
| **Vite 8** | Lightning-fast build tool and dev server |
| **Monaco Editor** | VS Code's editor component (`@monaco-editor/react`) |
| **Yjs** | CRDT library for real-time collaborative editing |
| **Xterm.js** | Terminal emulator for the integrated VS Code-style shell |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Clerk React** | Authentication UI components (Google OAuth) |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client for API requests |
| **React Hot Toast** | Beautiful toast notifications |
| **Canvas Confetti** | Celebratory effects on room creation |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server and static file serving |
| **Socket.IO** | Real-time bidirectional communication (WebSocket) |
| **MongoDB + Mongoose** | Database for users, rooms, files, messages, and documents |
| **Yjs (Server)** | Server-side CRDT document management and persistence |
| **Clerk (Backend)** | JWT verification and user authentication |
| **GitHub API** | OAuth, repo import/export (native `fetch`) |
| **Redis (ioredis)** | Optional caching and session management |
| **Helmet** | Security headers middleware |
| **Zod** | Request validation schemas |
| **bcryptjs** | Password hashing |
| **nanoid** | Unique room ID generation |

### DevOps & Deployment
| Technology | Purpose |
|---|---|
| **Render** | Cloud hosting (single native Node Web Service) |
| **GitHub** | Version control and CI/CD trigger |
| **MongoDB Atlas** | Cloud-hosted database |

---

## ⚙️ How It Works

### 1. Real-Time Collaboration (Yjs CRDT)

```
User A types "Hello"  ──→  Yjs Update  ──→  Socket.IO  ──→  User B sees "Hello"
User B types "World"  ──→  Yjs Update  ──→  Socket.IO  ──→  User A sees "World"
```

- Each file gets a **separate Y.Doc** scoped by `roomId + filePath`
- Changes are encoded as **binary Yjs updates** and broadcast via Socket.IO
- Yjs **auto-merges concurrent edits** without conflicts
- Documents are **persisted to MongoDB** (debounced)
- **Local cache** ensures instant file switching with zero blank flashes

### 2. Multi-File Full-Stack Workspace

```
my-project/
├── server.js          # Node.js backend
├── index.html         # Frontend page
├── style.css          # Styles
├── utils/helper.js    # Utility module
└── data.py            # Python script
```

Click **▶ Run** or type commands in the terminal — the editor auto-detects the language.

### 3. VS Code-Style Terminal

```
Browser (Xterm.js)  ←──Socket.IO──→  Server (bash via pseudo-TTY)
     ↓                                        ↓
  User types                           Shell executes
  "node server.js"                     actual commands
     ↓                                        ↓
  Sees output                          Streams stdout/stderr
  + 🌐 Live Preview link              back to browser
```

- **Terminal and Run share the same workspace** — `npm install` in terminal works for ▶ Run
- **Bi-directional file sync**: Editor → Disk (before run) and Disk → DB (on session end)
- **Port auto-detection** generates Live Preview links when web servers start
- **Drag-to-resize**, tab bar, clear/kill/restart buttons

### 4. Live Preview Proxy

When a user starts a web server (e.g., `node server.js` listening on port 3001):

1. Port is **auto-detected** from terminal output
2. A **🌐 Live Preview** link is generated: `/api/proxy/3001`
3. The proxy **patches `fetch()` and `XMLHttpRequest`** in HTML responses
4. This makes absolute URLs like `fetch('/api/todos')` → `/api/proxy/3001/api/todos`
5. POST bodies are **properly piped** (proxy runs before body parser)

### 5. Team Chat

- **CHAT tab**: Messages with avatars, date separators, smart grouping
- **MEMBERS tab**: Online users with avatars, online dots, "YOU" badge
- **Typing indicators**: See "username typing..." with animated dots
- **Persistent history**: Messages saved to MongoDB, loaded on room join

### 6. GitHub Integration

```
Connect GitHub → Select Repo → Import to Workspace
                             → Push Workspace to Repo (atomic commit)
```

### 7. Authentication Flow

```
User clicks Sign In → Clerk Google OAuth → Session cookie set
API request         → Clerk middleware verifies JWT → syncUser creates MongoDB record
Socket connects     → Clerk token verified → User attached to socket
```

---

## 📂 Project Structure

```
CollabCode/
├── 📄 package.json              # Root: build & deploy scripts
├── 📄 .env                      # Environment variables (not in git)
├── 📄 .env.example              # Template for env vars
├── 📄 .gitignore
│
├── 📁 client/                   # ⚛️ React Frontend (Vite)
│   ├── 📄 index.html
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   └── 📁 src/
│       ├── 📄 main.jsx          # App entry point (Clerk provider)
│       ├── 📄 App.jsx           # Routes & providers
│       ├── 📄 App.css           # Global styles & animations
│       │
│       ├── 📁 components/       # Reusable UI Components
│       │   ├── BrandMark.jsx        # Animated logo
│       │   ├── ChatPanel.jsx        # Team chat + members sidebar
│       │   ├── FileTree.jsx         # File explorer (create/rename/delete)
│       │   ├── Footer.jsx           # Status bar
│       │   ├── GithubPanel.jsx      # GitHub import/export panel
│       │   ├── MonacoEditor.jsx     # Monaco editor wrapper
│       │   ├── NotificationDropdown.jsx  # Notification bell
│       │   ├── RoomSettingsModal.jsx # Room configuration
│       │   ├── SideNav.jsx          # Left sidebar navigation
│       │   ├── TopNav.jsx           # Top navigation bar
│       │   └── WebTerminal.jsx      # VS Code-style terminal (Xterm.js)
│       │
│       ├── 📁 context/          # React Context Providers
│       │   ├── AuthContext.jsx      # Authentication state (Clerk + DB sync)
│       │   └── SocketContext.jsx    # Socket.IO connection management
│       │
│       ├── 📁 pages/            # Page Components
│       │   ├── Landing.jsx          # Homepage with animated demo
│       │   ├── Dashboard.jsx        # Room management dashboard
│       │   ├── EditorPage.jsx       # Main coding workspace
│       │   ├── Login.jsx            # Clerk sign-in (Google OAuth)
│       │   ├── Register.jsx         # Clerk sign-up
│       │   ├── Rooms.jsx            # Room listing
│       │   ├── History.jsx          # Activity history
│       │   └── Profile.jsx          # User profile
│       │
│       └── 📁 services/         # API & Utility Services
│           └── api.js               # Axios instance with Clerk token
│
└── 📁 server/                   # 🟢 Node.js Backend (Express)
    ├── 📄 index.js              # Server entry: Express + Socket.IO + Proxy
    ├── 📄 package.json
    │
    ├── 📁 config/               # Configuration
    │   ├── db.js                    # MongoDB connection
    │   ├── redis.js                 # Redis connection (optional)
    │   └── gitConfig.js             # GitHub OAuth configuration
    │
    ├── 📁 models/               # Mongoose Schemas
    │   ├── User.js                  # User profile (Clerk + GitHub fields)
    │   ├── Room.js                  # Coding room
    │   ├── Message.js               # Chat messages
    │   ├── Document.js              # Legacy document model
    │   ├── Notification.js          # Notification records
    │   └── WorkspaceFile.js         # File storage with Yjs state
    │
    ├── 📁 controllers/          # Route Handlers
    │   ├── auth.controller.js       # Profile retrieval
    │   ├── room.controller.js       # CRUD rooms, join/leave
    │   ├── execute.controller.js    # Multi-language code execution (11 languages)
    │   ├── notification.controller.js
    │   ├── user.controller.js
    │   └── workspace.controller.js  # File CRUD with 14 language templates
    │
    ├── 📁 routes/               # Express Routes
    │   ├── auth.routes.js           # /api/auth/*
    │   ├── room.routes.js           # /api/rooms/*
    │   ├── github.routes.js         # /api/github/* (OAuth, import, push)
    │   ├── user.routes.js           # /api/users/*
    │   ├── notification.routes.js   # /api/notifications/*
    │   └── workspace.routes.js      # /api/workspaces/* (+ auto-save)
    │
    ├── 📁 middleware/           # Express Middleware
    │   ├── auth.js                  # Clerk JWT verification + user sync
    │   └── gitHubAuth.js            # GitHub webhook signature verification
    │
    ├── 📁 services/             # Business Logic
    │   ├── yjs.service.js           # Yjs document management & persistence
    │   ├── githubService.js         # GitHub API interactions
    │   └── notification.service.js  # Real-time notification delivery
    │
    ├── 📁 sockets/              # Socket.IO Event Handlers
    │   ├── index.js                 # Socket setup & auth middleware
    │   ├── room.handler.js          # join-room, leave-room, presence
    │   ├── yjs.handler.js           # Yjs sync & updates
    │   ├── chat.handler.js          # Chat messages + typing indicators
    │   ├── cursor.handler.js        # Live cursor positions
    │   ├── execute.handler.js       # Code execution events
    │   └── terminal.handler.js      # Server-side shell + file sync + port detection
    │
    └── 📁 utils/                # Utilities
        ├── helpers.js
        └── versionControl.js        # Yjs-GitHub version bridging
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js** v18+ 
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **Clerk** account ([clerk.com](https://clerk.com))

### 1. Clone the Repository

```bash
git clone https://github.com/NavDevs/CollabCode.git
cd CollabCode
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB
MONGODB_URI=mongodb+srv://your-connection-string

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key

# GitHub Integration (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Client (Vite)
VITE_API_URL=/api
VITE_SOCKET_URL=
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 4. Run Development Servers

```bash
# Terminal 1: Start the backend
cd server && npm run dev

# Terminal 2: Start the frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Deployment (Render)

CollabCode is deployed as a **single native Node Web Service** on Render:

### Build Command
```bash
npm run install:all && npm run prebuild:client && cd client && npm run build
```

### Start Command
```bash
npm start
```

### Environment Variables on Render
Set all variables from `.env.example` in Render's dashboard, plus:
```
NODE_ENV=production
RENDER_EXTERNAL_URL=https://collabcode-ihw7.onrender.com
CLIENT_URL=https://collabcode-ihw7.onrender.com
VITE_API_URL=https://collabcode-ihw7.onrender.com/api
VITE_SOCKET_URL=https://collabcode-ihw7.onrender.com
GITHUB_REDIRECT_URI=https://collabcode-ihw7.onrender.com/api/github/callback
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Get current user profile |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms` | List user's rooms |
| `GET` | `/api/rooms/:roomId` | Get room details |
| `POST` | `/api/rooms/:roomId/join` | Join a room |
| `DELETE` | `/api/rooms/:roomId/leave` | Leave a room |
| `DELETE` | `/api/rooms/:roomId` | Delete a room (owner only) |

### Workspace Files
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workspaces/:roomId/files` | List all files |
| `POST` | `/api/workspaces/:roomId/files` | Create a file |
| `PUT` | `/api/workspaces/:roomId/files/rename` | Rename a file |
| `PUT` | `/api/workspaces/:roomId/files/content` | Auto-save file content |
| `DELETE` | `/api/workspaces/:roomId/files` | Delete a file |

### GitHub
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/github/auth-url` | Get GitHub OAuth URL |
| `GET` | `/api/github/callback` | OAuth callback |
| `GET` | `/api/github/status` | Check connection status |
| `GET` | `/api/github/repos` | List connected repos |
| `POST` | `/api/github/room/:roomId/import` | Import repo into workspace |
| `POST` | `/api/github/room/:roomId/push-all` | Push workspace to repo |

### Proxy
| Method | Endpoint | Description |
|---|---|---|
| `ANY` | `/api/proxy/:port/*` | Proxy to user-started web servers (with fetch/XHR patching) |

---

## 🔌 Socket.IO Events

### Room & Presence
| Event | Direction | Description |
|---|---|---|
| `join-room` | Client → Server | Join a coding room |
| `leave-room` | Client → Server | Leave a room |
| `user-joined` | Server → Client | Notification when user joins |
| `user-left` | Server → Client | Notification when user leaves |
| `room-users` | Server → Client | Full list of online users |

### Collaboration
| Event | Direction | Description |
|---|---|---|
| `yjs-sync-request` | Client → Server | Request file's Yjs state |
| `yjs-sync-init` | Server → Client | Send full Yjs document state |
| `yjs-update` | Bidirectional | Incremental document changes |
| `cursor-change` / `cursor-updated` | Bidirectional | Live cursor positions |

### Terminal
| Event | Direction | Description |
|---|---|---|
| `terminal-start` | Client → Server | Start a shell session |
| `terminal-input` | Client → Server | Send keystrokes |
| `terminal-output` | Server → Client | Shell output stream |
| `terminal-sync` | Client → Server | Re-sync files from DB to disk |
| `terminal-kill` | Client → Server | Kill the session |

### Chat
| Event | Direction | Description |
|---|---|---|
| `chat-message` | Bidirectional | Send/receive chat messages |
| `user-typing` | Bidirectional | Typing indicator |

---

## 🛡️ Security

- **Clerk Authentication** — Industry-standard auth with Google OAuth & JWT tokens
- **Helmet** — Security headers (XSS, CSRF, clickjacking protection)
- **Rate Limiting** — 1000 requests/minute per IP
- **Input Validation** — Zod schemas on all API inputs
- **CORS** — Restricted to allowed origins
- **Sandboxed Execution** — Code runs in temp directories with 120s timeout
- **Proxy Isolation** — Security headers stripped from proxy responses
- **Password Hashing** — bcryptjs with salt rounds

---

## 👥 Team

**NavDevs** — Building the future of collaborative development.

---

## 📄 License

This project is built as a **College Project** for educational purposes.

---

<div align="center">

### ⭐ Star this repo if you found it useful!

**[🌐 Try CollabCode Live](https://collabcode-ihw7.onrender.com)**

</div>
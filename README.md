<div align="center">

# 🚀 CollabCode — Real-Time Collaborative Code Editor

### Build, Code, and Collaborate — All in Your Browser

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-collabcode--ihw7.onrender.com-059669?style=for-the-badge&logoColor=white)](https://collabcode-ihw7.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)

---

**CollabCode** is a full-featured, browser-based collaborative code editor — similar to **VS Code Online** — where multiple developers can write, run, and debug code together in real time. It features a Monaco code editor, an integrated Linux terminal, real-time collaboration powered by Yjs CRDTs, team chat, and multi-language code execution.

</div>

---

## 🌐 Live Website

### **[https://collabcode-ihw7.onrender.com](https://collabcode-ihw7.onrender.com)**

> Sign up, create a room, share the link, and start coding together!

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🖥️ **Monaco Editor** | VS Code's editor engine with syntax highlighting, IntelliSense, and multi-language support |
| 👥 **Real-Time Collaboration** | Multiple users edit the same file simultaneously with conflict-free merging (Yjs CRDT) |
| 💬 **Team Chat** | Built-in chat panel for communication within coding rooms |
| 🖥️ **Integrated Terminal** | Full Linux shell (bash) with `ls`, `cd`, `npm install`, `node`, `python3`, etc. |
| ▶️ **Code Execution** | Run JavaScript, Python, TypeScript, Go directly from the editor |
| 🌐 **Live Preview** | Start a web server in the terminal and preview it via built-in proxy |
| 📁 **File Explorer** | Create, rename, delete files and folders — just like VS Code |
| 🔐 **Authentication** | Secure sign-up/login powered by Clerk |
| 🎨 **Dark Theme** | Premium VS Code-inspired dark UI with glassmorphism effects |
| 🔔 **Notifications** | Real-time notifications when collaborators join, leave, or run code |
| 📊 **Presence Indicators** | See who's online with colored avatars and live cursor positions |

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework with hooks and functional components |
| **Vite 8** | Lightning-fast build tool and dev server |
| **Monaco Editor** | VS Code's editor component (`@monaco-editor/react`) |
| **Yjs** | CRDT library for real-time collaborative editing |
| **Xterm.js** | Terminal emulator for the integrated shell |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Clerk React** | Authentication UI components |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client for API requests |
| **React Hot Toast** | Beautiful toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server and static file serving |
| **Socket.IO** | Real-time bidirectional communication (WebSocket) |
| **MongoDB + Mongoose** | Database for users, rooms, files, and documents |
| **Yjs (Server)** | Server-side CRDT document management and persistence |
| **Clerk (Backend)** | JWT verification and user authentication |
| **Redis (ioredis)** | Optional caching and session management |
| **Helmet** | Security headers middleware |
| **Zod** | Request validation schemas |
| **bcryptjs** | Password hashing |
| **nanoid** | Unique room ID generation |

### DevOps & Deployment
| Technology | Purpose |
|---|---|
| **Render** | Cloud hosting (single Web Service deployment) |
| **GitHub** | Version control and CI/CD trigger |
| **MongoDB Atlas** | Cloud-hosted database |

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
│       ├── 📄 main.jsx          # App entry point
│       ├── 📄 App.jsx           # Routes & providers
│       ├── 📄 index.css         # Global styles
│       │
│       ├── 📁 components/       # Reusable UI Components
│       │   ├── ChatPanel.jsx        # Team chat sidebar
│       │   ├── FileTree.jsx         # File explorer (create/rename/delete)
│       │   ├── Footer.jsx           # Status bar
│       │   ├── GithubPanel.jsx      # GitHub integration panel
│       │   ├── MonacoEditor.jsx     # Monaco editor wrapper
│       │   ├── NotificationDropdown.jsx  # Notification bell
│       │   ├── RoomSettingsModal.jsx # Room configuration
│       │   ├── SideNav.jsx          # Left sidebar navigation
│       │   └── WebTerminal.jsx      # Integrated terminal (Xterm.js + Socket.IO)
│       │
│       ├── 📁 context/          # React Context Providers
│       │   ├── AuthContext.jsx      # Authentication state (Clerk)
│       │   └── SocketContext.jsx    # Socket.IO connection management
│       │
│       ├── 📁 pages/            # Page Components
│       │   ├── LandingPage.jsx      # Homepage / marketing
│       │   ├── DashboardPage.jsx    # Room management dashboard
│       │   ├── EditorPage.jsx       # Main coding workspace
│       │   ├── LoginPage.jsx        # Clerk sign-in
│       │   └── RegisterPage.jsx     # Clerk sign-up
│       │
│       └── 📁 services/         # API & Utility Services
│           ├── api.js               # Axios instance with auth interceptor
│           └── webcontainer.js      # (Legacy) WebContainer service
│
└── 📁 server/                   # 🟢 Node.js Backend (Express)
    ├── 📄 index.js              # Server entry: Express + Socket.IO + static serving
    ├── 📄 package.json
    │
    ├── 📁 config/               # Configuration
    │   ├── db.js                    # MongoDB connection
    │   └── redis.js                 # Redis connection (optional)
    │
    ├── 📁 models/               # Mongoose Schemas
    │   ├── User.js                  # User profile
    │   ├── Room.js                  # Coding room
    │   ├── Document.js              # Legacy document model
    │   ├── Notification.js          # Notification records
    │   └── WorkspaceFile.js         # File storage with Yjs state
    │
    ├── 📁 controllers/          # Route Handlers
    │   ├── auth.controller.js       # Register, login, profile
    │   ├── room.controller.js       # CRUD rooms, join/leave
    │   ├── execute.controller.js    # Server-side code execution
    │   ├── notification.controller.js
    │   ├── user.controller.js
    │   └── workspace.controller.js  # File CRUD operations
    │
    ├── 📁 routes/               # Express Routes
    │   ├── auth.routes.js           # POST /api/auth/*
    │   ├── room.routes.js           # /api/rooms/*
    │   ├── user.routes.js           # /api/users/*
    │   ├── notification.routes.js   # /api/notifications/*
    │   └── workspace.routes.js      # /api/workspaces/*
    │
    ├── 📁 middleware/           # Express Middleware
    │   └── auth.js                  # Clerk JWT verification
    │
    ├── 📁 validators/           # Zod Validation Schemas
    │   └── auth.validator.js
    │
    ├── 📁 services/             # Business Logic
    │   ├── yjs.service.js           # Yjs document management & persistence
    │   └── notification.service.js  # Real-time notification delivery
    │
    ├── 📁 sockets/              # Socket.IO Event Handlers
    │   ├── index.js                 # Socket setup & auth middleware
    │   ├── room.handler.js          # join-room, leave-room, presence
    │   ├── yjs.handler.js           # Yjs sync & updates
    │   ├── chat.handler.js          # Real-time chat messages
    │   ├── cursor.handler.js        # Live cursor positions
    │   ├── execute.handler.js       # Code execution events
    │   └── terminal.handler.js      # Server-side shell terminal
    │
    └── 📁 utils/                # Utilities
        └── helpers.js
```

---

## ⚙️ How It Works

### 1. Real-Time Collaboration (Yjs CRDT)

CollabCode uses **Yjs**, a Conflict-free Replicated Data Type (CRDT) library, to enable real-time collaborative editing without conflicts.

```
User A types "Hello"  ──→  Yjs Update  ──→  Socket.IO  ──→  User B sees "Hello"
User B types "World"  ──→  Yjs Update  ──→  Socket.IO  ──→  User A sees "World"
```

- Each file has a **Y.Doc** (Yjs Document) managed on the server
- When a user types, the change is encoded as a **binary Yjs update**
- The update is broadcast to all users in the room via **Socket.IO**
- Yjs automatically **merges concurrent edits** without conflicts
- Documents are **persisted to MongoDB** every 5 seconds (debounced)

### 2. Integrated Terminal

The terminal provides a **real Linux shell** running on the server:

```
Browser (Xterm.js)  ←──Socket.IO──→  Server (bash via pseudo-TTY)
     ↓                                        ↓
  User types                           Shell executes
  "node main.js"                       actual commands
     ↓                                        ↓
  Sees output                          Streams stdout/stderr
  in terminal                          back to browser
```

- When a terminal starts, **workspace files are synced from MongoDB to disk**
- The server spawns a **bash shell** with a pseudo-TTY (via Linux `script` command)
- Keystrokes are forwarded from the browser to the server in real-time
- Output is streamed back and rendered in Xterm.js
- Supports **command history** (up/down arrows), tab completion, and Ctrl+C

### 3. Code Execution

When you click **▶ Run**:

1. Server fetches **all workspace files** from MongoDB
2. Files are written to a **temporary directory** on the server
3. The appropriate runtime is invoked (`node`, `python3`, `go run`, etc.)
4. **stdout/stderr** are streamed to the client via Socket.IO
5. Execution is **time-limited** (10 seconds) for safety
6. Temp files are **cleaned up** after execution

### 4. Live Web Server Preview

When you run a web server (e.g., `http.createServer`) in the terminal:

```
Terminal: node main.js → "Server running on port 3001"
                              ↓ (auto-detected)
Terminal shows: 🌐 Live Preview: https://collabcode-ihw7.onrender.com/api/proxy/3001
                              ↓
Browser opens proxy URL → Express proxy → localhost:3001 on server
```

### 5. Authentication Flow

```
User clicks Sign Up → Clerk handles registration → Webhook/API syncs to MongoDB
User clicks Sign In → Clerk issues JWT → JWT sent with every API request
Socket connects     → JWT verified     → User attached to socket
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

CollabCode is deployed as a **single Web Service** on Render:

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
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/auth/sync` | Sync Clerk user to MongoDB |

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms` | List user's rooms |
| `GET` | `/api/rooms/:roomId` | Get room details |
| `POST` | `/api/rooms/:roomId/join` | Join a room |
| `DELETE` | `/api/rooms/:roomId/leave` | Leave a room |

### Workspace Files
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workspaces/:roomId/files` | List all files |
| `POST` | `/api/workspaces/:roomId/files` | Create a file |
| `PUT` | `/api/workspaces/:roomId/files` | Update file content |
| `DELETE` | `/api/workspaces/:roomId/files` | Delete a file |

### Proxy
| Method | Endpoint | Description |
|---|---|---|
| `ANY` | `/api/proxy/:port/*` | Proxy to user-started servers |

---

## 🔌 Socket.IO Events

### Room Events
| Event | Direction | Description |
|---|---|---|
| `join-room` | Client → Server | Join a coding room |
| `leave-room` | Client → Server | Leave a room |
| `user-joined` | Server → Client | Notify when user joins |
| `user-left` | Server → Client | Notify when user leaves |
| `room-users` | Server → Client | Full list of online users |

### Collaboration Events
| Event | Direction | Description |
|---|---|---|
| `yjs-sync-request` | Client → Server | Request initial document state |
| `yjs-sync-init` | Server → Client | Send full Yjs document state |
| `yjs-update` | Bidirectional | Incremental document changes |
| `cursor-change` | Client → Server | User's cursor position |
| `cursor-updated` | Server → Client | Other user's cursor moved |

### Terminal Events
| Event | Direction | Description |
|---|---|---|
| `terminal-start` | Client → Server | Start a shell session |
| `terminal-input` | Client → Server | Send keystrokes |
| `terminal-output` | Server → Client | Shell output stream |
| `terminal-ready` | Server → Client | Shell is ready |
| `terminal-kill` | Client → Server | Kill the session |

### Execution Events
| Event | Direction | Description |
|---|---|---|
| `code-execute` | Client → Server | Run a file |
| `exec-start` | Server → Client | Execution started |
| `exec-output` | Server → Client | stdout/stderr stream |
| `exec-done` | Server → Client | Execution completed |

### Chat Events
| Event | Direction | Description |
|---|---|---|
| `chat-message` | Bidirectional | Send/receive chat messages |

---

## 🛡️ Security

- **Clerk Authentication** — Industry-standard auth with JWT tokens
- **Helmet** — Security headers (XSS, CSRF, clickjacking protection)
- **Rate Limiting** — 1000 requests/minute per IP
- **Input Validation** — Zod schemas on all API inputs
- **CORS** — Restricted to allowed origins
- **Sandboxed Execution** — Code runs in temp directories with 10s timeout
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
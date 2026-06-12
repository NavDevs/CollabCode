const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WorkspaceFile = require('../models/WorkspaceFile');

// Store active terminal sessions: Map<socketId, { process, roomId }>
const terminalSessions = new Map();

// Detect port patterns in terminal output
const PORT_REGEX = /(?:localhost|127\.0\.0\.1):(\d{4,5})/gi;
const PORT_REGEX2 = /(?:port|PORT)\s+(\d{4,5})/g;

// Sync workspace files from MongoDB to the terminal's working directory
async function syncFilesToDisk(roomId, workDir) {
  try {
    const files = await WorkspaceFile.find({ roomId });
    for (const file of files) {
      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const absPath = path.join(workDir, relativePath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, file.content || '', 'utf8');
    }
    console.log(`📂 Synced ${files.length} files to ${workDir}`);
  } catch (err) {
    console.error('[terminal] Failed to sync files:', err.message);
  }
}

function registerTerminalHandler(io, socket) {
  
  // Start a new terminal session
  socket.on('terminal-start', async ({ roomId }) => {
    if (!roomId) return;

    // Kill existing session if any
    if (terminalSessions.has(socket.id)) {
      const old = terminalSessions.get(socket.id);
      try { old.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
    }

    // Create a workspace directory for this room
    const workDir = path.join(os.tmpdir(), `collabcode_ws_${roomId}`);
    try {
      fs.mkdirSync(workDir, { recursive: true });
    } catch {}

    // Sync workspace files from DB to disk
    await syncFilesToDisk(roomId, workDir);

    // Create a .bashrc for command history and prompt
    const bashrc = `
export PS1='\\033[1;32mcollabcode\\033[0m:\\033[1;34m\\w\\033[0m$ '
export HISTSIZE=1000
export HISTFILESIZE=2000
export HISTFILE="${workDir}/.bash_history"
shopt -s histappend
`;
    fs.writeFileSync(path.join(workDir, '.bashrc'), bashrc, 'utf8');

    try {
      // Use 'script' to allocate a pseudo-TTY on Linux
      const proc = spawn('script', ['-qfc', `bash --rcfile ${path.join(workDir, '.bashrc')} -i`, '/dev/null'], {
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          HOME: workDir,
          PATH: process.env.PATH,
          LANG: 'en_US.UTF-8',
        },
      });

      const detectedPorts = new Set();
      terminalSessions.set(socket.id, { process: proc, roomId });

      // Stream stdout to client and detect server ports
      proc.stdout.on('data', (data) => {
        const text = data.toString('utf8');
        socket.emit('terminal-output', text);

        // Detect server ports in output
        const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || '';
        
        let match;
        PORT_REGEX.lastIndex = 0;
        PORT_REGEX2.lastIndex = 0;
        
        while ((match = PORT_REGEX.exec(text)) !== null) {
          const port = match[1];
          if (!detectedPorts.has(port)) {
            detectedPorts.add(port);
            const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
            socket.emit('terminal-output', `\r\n\x1b[1;36m🌐 Live Preview: \x1b[4m${proxyUrl}\x1b[0m\r\n`);
          }
        }
        while ((match = PORT_REGEX2.exec(text)) !== null) {
          const port = match[1];
          if (!detectedPorts.has(port)) {
            detectedPorts.add(port);
            const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
            socket.emit('terminal-output', `\r\n\x1b[1;36m🌐 Live Preview: \x1b[4m${proxyUrl}\x1b[0m\r\n`);
          }
        }
      });

      // Stream stderr to client
      proc.stderr.on('data', (data) => {
        socket.emit('terminal-output', data.toString('utf8'));
      });

      // Handle process exit
      proc.on('close', (code) => {
        socket.emit('terminal-output', `\r\n\x1b[90m[Session ended]\x1b[0m\r\n`);
        terminalSessions.delete(socket.id);
      });

      proc.on('error', (err) => {
        socket.emit('terminal-output', `\r\n\x1b[31m[Terminal error: ${err.message}]\x1b[0m\r\n`);
        terminalSessions.delete(socket.id);
      });

      socket.emit('terminal-ready');
      console.log(`📟 Terminal started for ${socket.user.username} in room ${roomId}`);

    } catch (err) {
      console.error('[terminal] Failed to start shell:', err.message);
      socket.emit('terminal-output', `\x1b[31mFailed to start terminal: ${err.message}\x1b[0m\r\n`);
    }
  });

  // Receive input from client
  socket.on('terminal-input', (data) => {
    const session = terminalSessions.get(socket.id);
    if (session && session.process && !session.process.killed) {
      try {
        session.process.stdin.write(data);
      } catch (err) {
        console.error('[terminal] stdin write error:', err.message);
      }
    }
  });

  // Resize terminal
  socket.on('terminal-resize', ({ cols, rows }) => {
    // Resize not supported without node-pty
  });

  // Kill terminal
  socket.on('terminal-kill', () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      try { session.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
      console.log(`📟 Terminal killed for ${socket.user.username}`);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      try { session.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
    }
  });
}

module.exports = { registerTerminalHandler };

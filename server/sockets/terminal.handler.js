const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WorkspaceFile = require('../models/WorkspaceFile');

// Store active terminal sessions: Map<socketId, { process, roomId, workDir }>
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
    return files.length;
  } catch (err) {
    console.error('[terminal] Failed to sync files:', err.message);
    return 0;
  }
}

// Save changed files back from disk to MongoDB
async function syncFilesFromDisk(roomId, workDir) {
  try {
    const files = await WorkspaceFile.find({ roomId });
    for (const file of files) {
      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const absPath = path.join(workDir, relativePath);
      if (fs.existsSync(absPath)) {
        const diskContent = fs.readFileSync(absPath, 'utf8');
        if (diskContent !== file.content) {
          file.content = diskContent;
          file.updatedAt = new Date();
          await file.save();
        }
      }
    }
  } catch (err) {
    console.error('[terminal] Failed to sync files from disk:', err.message);
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
    const fileCount = await syncFilesToDisk(roomId, workDir);

    // Create a .bashrc with VS Code-like prompt, PATH, and auto-sync
    const bashrc = `
# CollabCode Shell Configuration
export PS1='\\[\\033[1;32m\\]collabcode\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '
export HISTSIZE=5000
export HISTFILESIZE=10000
export HISTFILE="${workDir}/.bash_history"
shopt -s histappend

# Aliases for convenience
alias ll='ls -la --color=auto'
alias la='ls -A --color=auto'
alias l='ls -CF --color=auto'
alias cls='clear'

# Node/Python path
export NODE_PATH="${workDir}/node_modules"
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
          SHELL: '/bin/bash',
          EDITOR: 'nano',
          COLORTERM: 'truecolor',
        },
      });

      const detectedPorts = new Set();
      let portClearTimer = null;
      terminalSessions.set(socket.id, { process: proc, roomId, workDir });

      // Stream stdout to client and detect server ports
      proc.stdout.on('data', (data) => {
        const text = data.toString('utf8');
        socket.emit('terminal-output', text);

        // Clear detected ports when user stops a server (Ctrl+C or process exits)
        if (text.includes('^C') || text.includes('SIGINT') || text.includes('SIGTERM')) {
          detectedPorts.clear();
        }

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
            clearTimeout(portClearTimer);
            portClearTimer = setTimeout(() => detectedPorts.delete(port), 5000);
          }
        }
        while ((match = PORT_REGEX2.exec(text)) !== null) {
          const port = match[1];
          if (!detectedPorts.has(port)) {
            detectedPorts.add(port);
            const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
            socket.emit('terminal-output', `\r\n\x1b[1;36m🌐 Live Preview: \x1b[4m${proxyUrl}\x1b[0m\r\n`);
            clearTimeout(portClearTimer);
            portClearTimer = setTimeout(() => detectedPorts.delete(port), 5000);
          }
        }
      });

      // Stream stderr to client
      proc.stderr.on('data', (data) => {
        socket.emit('terminal-output', data.toString('utf8'));
      });

      // Handle process exit
      proc.on('close', (code) => {
        // Sync files from disk back to DB on session end
        syncFilesFromDisk(roomId, workDir).catch(() => {});
        socket.emit('terminal-output', `\r\n\x1b[90m[Session ended]\x1b[0m\r\n`);
        terminalSessions.delete(socket.id);
      });

      proc.on('error', (err) => {
        socket.emit('terminal-output', `\r\n\x1b[31m[Terminal error: ${err.message}]\x1b[0m\r\n`);
        terminalSessions.delete(socket.id);
      });

      socket.emit('terminal-ready');
      console.log(`📟 Terminal started for ${socket.user.username} in room ${roomId} (${fileCount} files synced)`);

    } catch (err) {
      console.error('[terminal] Failed to start shell:', err.message);
      socket.emit('terminal-output', `\x1b[31mFailed to start terminal: ${err.message}\x1b[0m\r\n`);
    }
  });

  // Re-sync files from DB to disk (called before Run or manually)
  socket.on('terminal-sync', async () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      const count = await syncFilesToDisk(session.roomId, session.workDir);
      socket.emit('terminal-output', `\x1b[90m[Synced ${count} files]\x1b[0m\r\n`);
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
    // Resize not fully supported without node-pty, but the shell adapts to initial fit
  });

  // Kill terminal
  socket.on('terminal-kill', () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      // Sync files back before killing
      syncFilesFromDisk(session.roomId, session.workDir).catch(() => {});
      try { session.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
      console.log(`📟 Terminal killed for ${socket.user.username}`);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      syncFilesFromDisk(session.roomId, session.workDir).catch(() => {});
      try { session.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
    }
  });
}

module.exports = { registerTerminalHandler };

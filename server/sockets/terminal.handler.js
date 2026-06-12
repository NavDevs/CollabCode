const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Store active terminal sessions: Map<socketId, { process, roomId }>
const terminalSessions = new Map();

function registerTerminalHandler(io, socket) {
  
  // Start a new terminal session
  socket.on('terminal-start', ({ roomId }) => {
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

    try {
      // Use 'script' to allocate a pseudo-TTY on Linux
      // This gives us a real interactive bash with prompt, colors, etc.
      const proc = spawn('script', ['-qfc', 'bash --norc --noprofile -i', '/dev/null'], {
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          HOME: workDir,
          PS1: '\\033[1;32mcollabcode\\033[0m:\\033[1;34m\\w\\033[0m$ ',
          PATH: process.env.PATH,
          LANG: 'en_US.UTF-8',
        },
      });

      terminalSessions.set(socket.id, { process: proc, roomId });

      // Stream stdout to client
      proc.stdout.on('data', (data) => {
        socket.emit('terminal-output', data.toString('utf8'));
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
    // Resize not supported without node-pty, but we accept the event silently
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

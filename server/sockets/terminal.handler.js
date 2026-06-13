const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WorkspaceFile = require('../models/WorkspaceFile');

// Store active terminal sessions
const terminalSessions = new Map();

// Detect port patterns in terminal output
const PORT_REGEX = /(?:localhost|127\.0\.0\.1):(\d{4,5})/gi;
const PORT_REGEX2 = /(?:port|PORT)\s+(\d{4,5})/g;
const LISTENING_REGEX = /listening\s+(?:on\s+)?(?:port\s+)?(\d{4,5})/gi;

// Sync workspace files from MongoDB to disk
async function syncFilesToDisk(roomId, workDir) {
  try {
    const files = await WorkspaceFile.find({ roomId });
    for (const file of files) {
      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const absPath = path.join(workDir, relativePath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, file.content || '', 'utf8');
    }
    return files.length;
  } catch (err) {
    console.error('[terminal] sync to disk failed:', err.message);
    return 0;
  }
}

// Save files from disk back to MongoDB
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
    console.error('[terminal] sync from disk failed:', err.message);
  }
}

// Check if a command exists on the system
function commandExists(cmd) {
  try {
    require('child_process').execSync(`which ${cmd} 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function registerTerminalHandler(io, socket) {

  socket.on('terminal-start', async ({ roomId }) => {
    if (!roomId) return;

    // Kill existing session
    if (terminalSessions.has(socket.id)) {
      const old = terminalSessions.get(socket.id);
      try { old.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
    }

    // Create workspace directory
    const workDir = path.join(os.tmpdir(), `collabcode_ws_${roomId}`);
    fs.mkdirSync(workDir, { recursive: true });

    // Sync files from DB
    const fileCount = await syncFilesToDisk(roomId, workDir);

    // Write bashrc
    const bashrcPath = path.join(workDir, '.bashrc');
    fs.writeFileSync(bashrcPath, [
      `export PS1='\\[\\033[1;32m\\]collabcode\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '`,
      `export HISTSIZE=5000`,
      `export HISTFILESIZE=10000`,
      `export HISTFILE="${workDir}/.bash_history"`,
      `shopt -s histappend 2>/dev/null`,
      `alias ll='ls -la --color=auto'`,
      `alias la='ls -A --color=auto'`,
      `alias cls='clear'`,
      `export NODE_PATH="${workDir}/node_modules"`,
    ].join('\n'), 'utf8');

    const shellEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      HOME: workDir,
      PATH: process.env.PATH,
      LANG: 'en_US.UTF-8',
      SHELL: '/bin/bash',
      COLORTERM: 'truecolor',
    };

    let proc;
    try {
      // Try method 1: 'script' command for proper PTY
      if (commandExists('script')) {
        proc = spawn('script', ['-qfc', `bash --rcfile "${bashrcPath}" -i`, '/dev/null'], {
          cwd: workDir,
          env: shellEnv,
        });
      } else {
        // Fallback: direct bash (no PTY, but works)
        proc = spawn('bash', ['--rcfile', bashrcPath, '-i'], {
          cwd: workDir,
          env: shellEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }
    } catch (err) {
      socket.emit('terminal-output', `\x1b[31mFailed to start shell: ${err.message}\x1b[0m\r\n`);
      return;
    }

    const detectedPorts = new Set();
    terminalSessions.set(socket.id, { process: proc, roomId, workDir });

    // Detect ports in output
    function checkForPorts(text) {
      const baseUrl = process.env.RENDER_EXTERNAL_URL || '';
      const allRegexes = [PORT_REGEX, PORT_REGEX2, LISTENING_REGEX];

      for (const regex of allRegexes) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const port = match[1];
          if (!detectedPorts.has(port)) {
            detectedPorts.add(port);
            const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
            socket.emit('terminal-output', `\r\n\x1b[1;36m🌐 Live Preview: \x1b[4m${proxyUrl}\x1b[0m\r\n`);
            // Allow re-detection after 10s
            setTimeout(() => detectedPorts.delete(port), 10000);
          }
        }
      }

      // Reset on Ctrl+C
      if (text.includes('^C') || text.includes('SIGINT')) {
        detectedPorts.clear();
      }
    }

    // Stream stdout
    proc.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      socket.emit('terminal-output', text);
      checkForPorts(text);
    });

    // Stream stderr
    proc.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      socket.emit('terminal-output', text);
      checkForPorts(text);
    });

    // Handle exit
    proc.on('close', (code) => {
      syncFilesFromDisk(roomId, workDir).catch(() => {});
      socket.emit('terminal-output', `\r\n\x1b[90m[Session ended with code ${code}]\x1b[0m\r\n`);
      terminalSessions.delete(socket.id);
    });

    proc.on('error', (err) => {
      socket.emit('terminal-output', `\r\n\x1b[31m[Terminal error: ${err.message}]\x1b[0m\r\n`);
      terminalSessions.delete(socket.id);
    });

    socket.emit('terminal-ready');
    console.log(`📟 Terminal started for ${socket.user?.username || 'unknown'} in room ${roomId} (${fileCount} files)`);
  });

  // Re-sync files from DB to disk
  socket.on('terminal-sync', async () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      const count = await syncFilesToDisk(session.roomId, session.workDir);
      socket.emit('terminal-output', `\x1b[90m[Synced ${count} files to disk]\x1b[0m\r\n`);
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
    // Terminal resize requires node-pty, skipped for now
  });

  // Kill terminal
  socket.on('terminal-kill', () => {
    const session = terminalSessions.get(socket.id);
    if (session) {
      syncFilesFromDisk(session.roomId, session.workDir).catch(() => {});
      try { session.process.kill('SIGKILL'); } catch {}
      terminalSessions.delete(socket.id);
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

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ─── Language configs ───────────────────────────────────────── */
const LANG_CONFIG = {
  javascript: {
    ext: 'js',
    run: (file, dir) => ({ cmd: 'node', args: [file] }),
  },
  typescript: {
    ext: 'ts',
    run: (file, dir) => ({ cmd: 'npx', args: ['ts-node', file] }),
    fallback: (file, dir) => ({ cmd: 'node', args: [file] }),
  },
  python: {
    ext: 'py',
    run: (file, dir) => ({ cmd: 'python3', args: [file] }),
    fallback: (file, dir) => ({ cmd: 'python', args: [file] }),
  },
  go: {
    ext: 'go',
    run: (file, dir) => ({ cmd: 'go', args: ['run', file] }),
  },
  java: {
    ext: 'java',
    // Compile then run: javac File.java && java File
    compile: (file, dir) => ({ cmd: 'javac', args: [file] }),
    run: (file, dir) => {
      // Class name = filename without extension
      const className = path.basename(file, '.java');
      return { cmd: 'java', args: ['-cp', dir, className] };
    },
  },
  cpp: {
    ext: 'cpp',
    // Compile then run: g++ file.cpp -o output && ./output
    compile: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: 'g++', args: [file, '-o', outFile, '-std=c++17'] };
    },
    run: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: outFile, args: [] };
    },
  },
  c: {
    ext: 'c',
    // Compile then run: gcc file.c -o output && ./output
    compile: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: 'gcc', args: [file, '-o', outFile] };
    },
    run: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: outFile, args: [] };
    },
  },
  rust: {
    ext: 'rs',
    compile: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: 'rustc', args: [file, '-o', outFile] };
    },
    run: (file, dir) => {
      const outFile = path.join(dir, 'a.out');
      return { cmd: outFile, args: [] };
    },
  },
  ruby: {
    ext: 'rb',
    run: (file, dir) => ({ cmd: 'ruby', args: [file] }),
  },
  php: {
    ext: 'php',
    run: (file, dir) => ({ cmd: 'php', args: [file] }),
  },
  bash: {
    ext: 'sh',
    run: (file, dir) => ({ cmd: 'bash', args: [file] }),
  },
};

const TIMEOUT_MS = 15_000; // 15-second hard limit

const WorkspaceFile = require('../models/WorkspaceFile');
const yjsService = require('../services/yjs.service');

/**
 * Execute code and stream results back via Socket.IO.
 * Supports multi-file execution by dumping the workspace to disk.
 *
 * @param {object} io       - Socket.IO server instance
 * @param {string} roomId   - Room to broadcast to
 * @param {string} targetPath - Path of the file to execute (e.g., '/src/main.js')
 * @param {string} language - Language key
 * @param {object} user     - User who triggered run
 */
async function executeCode(io, roomId, targetPath, languageParam, user) {
  const started = Date.now();
  const emit = (type, data) => io.to(roomId).emit('exec-output', { type, data, ts: Date.now() });

  // Infer language from target file extension if possible
  const getLanguageFromExt = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    const map = { 
      js: 'javascript', ts: 'typescript', py: 'python', go: 'go', 
      java: 'java', cpp: 'cpp', c: 'c', rs: 'rust', rb: 'ruby', 
      php: 'php', sh: 'bash',
    };
    return map[ext];
  };

  const detectedLanguage = getLanguageFromExt(targetPath);
  const language = detectedLanguage || languageParam;
  
  const cfg = LANG_CONFIG[language];

  // Unsupported language
  if (!cfg) {
    emit('stderr', `✗ Execution not supported for language: ${language}\n`);
    emit('stderr', `  Supported: JavaScript, TypeScript, Python, Java, C++, C, Go, Rust, Ruby, PHP, Bash\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    return;
  }

  // 1. Fetch all files for this room
  let files;
  try {
    files = await WorkspaceFile.find({ roomId });
  } catch (err) {
    emit('stderr', `✗ Failed to load workspace files: ${err.message}\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    return;
  }

  // 2. Create a unique temp directory for this run
  const runId = `collabcode_${roomId}_${Date.now()}`;
  const runDir = path.join(os.tmpdir(), runId);
  fs.mkdirSync(runDir, { recursive: true });

  let entryFileAbsPath = null;

  try {
    // 3. Write all files to the temp directory
    for (const file of files) {
      // Get latest content from Yjs memory if available, otherwise fallback to DB
      let content = file.content;
      try {
        const ydoc = await yjsService.getOrCreateDoc(roomId, file.path);
        content = ydoc.getText('monaco').toString() || file.content;
      } catch (e) {}

      // file.path is relative like '/main.js' or '/src/utils.js'
      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const absPath = path.join(runDir, relativePath);

      // Ensure subdirectory exists
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, content, 'utf8');

      const normFile = file.path.startsWith('/') ? file.path : '/' + file.path;
      const normTarget = targetPath.startsWith('/') ? targetPath : '/' + targetPath;

      if (normFile === normTarget) {
        entryFileAbsPath = absPath;
      }
    }
  } catch (err) {
    emit('stderr', `✗ Failed to write workspace to disk: ${err.message}\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    cleanUpDir(runDir);
    return;
  }

  if (!entryFileAbsPath) {
    emit('stderr', `✗ Target file ${targetPath} not found in workspace.\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    cleanUpDir(runDir);
    return;
  }

  // Announce run start
  io.to(roomId).emit('exec-start', { language, runner: user.username, ts: Date.now() });

  const fileDir = path.dirname(entryFileAbsPath);

  // ── COMPILE STEP (for Java, C++, C, Rust) ──
  if (cfg.compile) {
    const compileConfig = cfg.compile(entryFileAbsPath, fileDir);
    emit('stdout', `⚙ Compiling ${path.basename(entryFileAbsPath)}...\n`);
    
    try {
      const compileResult = await runProcess(compileConfig.cmd, compileConfig.args, fileDir, TIMEOUT_MS);
      if (compileResult.stderr) {
        emit('stderr', compileResult.stderr);
      }
      if (compileResult.exitCode !== 0) {
        emit('stderr', `\n✗ Compilation failed with exit code ${compileResult.exitCode}\n`);
        io.to(roomId).emit('exec-done', { exitCode: compileResult.exitCode, duration: Date.now() - started, language, runner: user.username });
        cleanUpDir(runDir);
        return;
      }
      if (compileResult.stdout) {
        emit('stdout', compileResult.stdout);
      }
      emit('stdout', `✓ Compiled successfully\n\n`);
    } catch (err) {
      emit('stderr', `✗ Compiler not found: "${compileConfig.cmd}". Make sure ${language} is installed on the server.\n`);
      io.to(roomId).emit('exec-done', { exitCode: 1, duration: Date.now() - started, language, runner: user.username });
      cleanUpDir(runDir);
      return;
    }
  }

  // ── RUN STEP ──
  const runConfig = cfg.run(entryFileAbsPath, fileDir);
  let cmd = runConfig.cmd;
  let args = runConfig.args;

  let child;
  try {
    child = spawn(cmd, args, {
      timeout: TIMEOUT_MS,
      cwd: fileDir,
      env: { ...process.env, NODE_ENV: 'sandbox' },
    });
  } catch (err) {
    // Try fallback if available
    if (cfg.fallback) {
      const fb = cfg.fallback(entryFileAbsPath, fileDir);
      try {
        child = spawn(fb.cmd, fb.args, {
          timeout: TIMEOUT_MS,
          cwd: fileDir,
          env: { ...process.env, NODE_ENV: 'sandbox' },
        });
      } catch (fbErr) {
        emit('stderr', `✗ Could not start runtime "${cmd}" or "${fb.cmd}": ${fbErr.message}\n`);
        io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
        cleanUpDir(runDir);
        return;
      }
    } else {
      emit('stderr', `✗ Could not start runtime "${cmd}": ${err.message}\n`);
      io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
      cleanUpDir(runDir);
      return;
    }
  }

  // Port detection for live preview
  const PORT_REGEX_EXEC = /(?:localhost|127\.0\.0\.1):(\d{4,5})/gi;
  const PORT_REGEX_EXEC2 = /(?:port|PORT)\s+(\d{4,5})/g;
  const detectedPorts = new Set();

  const detectAndEmitPort = (text) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || '';
    let match;
    PORT_REGEX_EXEC.lastIndex = 0;
    PORT_REGEX_EXEC2.lastIndex = 0;
    
    while ((match = PORT_REGEX_EXEC.exec(text)) !== null) {
      const port = match[1];
      if (!detectedPorts.has(port)) {
        detectedPorts.add(port);
        const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
        emit('stdout', `\n🌐 Live Preview: ${proxyUrl}\n`);
      }
    }
    while ((match = PORT_REGEX_EXEC2.exec(text)) !== null) {
      const port = match[1];
      if (!detectedPorts.has(port)) {
        detectedPorts.add(port);
        const proxyUrl = baseUrl ? `${baseUrl}/api/proxy/${port}` : `/api/proxy/${port}`;
        emit('stdout', `\n🌐 Live Preview: ${proxyUrl}\n`);
      }
    }
  };

  // Stream stdout
  child.stdout.on('data', chunk => {
    const text = chunk.toString();
    emit('stdout', text);
    detectAndEmitPort(text);
  });

  // Stream stderr
  child.stderr.on('data', chunk => {
    const text = chunk.toString();
    emit('stderr', text);
    detectAndEmitPort(text);
  });

  // Hard timeout kill
  const killer = setTimeout(() => {
    child.kill('SIGKILL');
    emit('stderr', `\n✗ Execution timed out after ${TIMEOUT_MS / 1000}s\n`);
  }, TIMEOUT_MS);

  child.on('close', (code, signal) => {
    clearTimeout(killer);
    cleanUpDir(runDir);
    const duration = Date.now() - started;
    io.to(roomId).emit('exec-done', { exitCode: code ?? (signal ? 1 : 0), duration, language, runner: user.username });
  });

  child.on('error', err => {
    clearTimeout(killer);
    cleanUpDir(runDir);
    emit('stderr', `✗ Runtime error: ${err.message}\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: Date.now() - started, language, runner: user.username });
  });
}

/**
 * Run a process synchronously-ish and return { stdout, stderr, exitCode }
 * Used for compile steps.
 */
function runProcess(cmd, args, cwd, timeout) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(cmd, args, { cwd, timeout });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => stdout += d.toString());
      child.stderr.on('data', d => stderr += d.toString());
      child.on('close', code => resolve({ stdout, stderr, exitCode: code }));
      child.on('error', err => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

function cleanUpDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

module.exports = { executeCode };

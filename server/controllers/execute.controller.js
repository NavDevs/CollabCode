const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/* ─── Language configs ───────────────────────────────────────── */
const LANG_CONFIG = {
  javascript: {
    ext: 'js',
    cmd: 'node',
    args: (file) => [file],
  },
  typescript: {
    ext: 'ts',
    cmd: 'node',
    // ts-node might not be installed; fall back to plain node after stripping types
    args: (file) => ['--input-type=module', file],
    // Use ts-node if available
    prefer: 'ts-node',
    preferArgs: (file) => [file],
  },
  python: {
    ext: 'py',
    cmd: process.platform === 'win32' ? 'python' : 'python3',
    args: (file) => [file],
  },
  go: {
    ext: 'go',
    cmd: 'go',
    args: (file) => ['run', file],
  },
  java: {
    ext: 'java',
    // Java needs compile + run; skip for now — show helpful message
    cmd: null,
  },
  cpp: {
    ext: 'cpp',
    cmd: null, // requires gcc; show helpful message
  },
};

const TIMEOUT_MS = 10_000; // 10-second hard limit

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
    const map = { js: 'javascript', ts: 'typescript', py: 'python', go: 'go', java: 'java', cpp: 'cpp', c: 'cpp' };
    return map[ext];
  };

  const detectedLanguage = getLanguageFromExt(targetPath);
  const language = detectedLanguage || languageParam;
  
  const cfg = LANG_CONFIG[language];

  // Unsupported language
  if (!cfg) {
    emit('stderr', `✗ Execution not supported for language: ${language}\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    return;
  }
  if (!cfg.cmd) {
    emit('stderr', `✗ ${language} execution is not yet configured on this server.\n`);
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
        const fileKey = `${roomId}:${file.path}`;
        // Access docs map directly (we'll expose it or use a helper)
        // Wait, the docs map isn't exported directly. Let's use getOrCreateDoc!
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

  const cmd  = cfg.cmd;
  const args = cfg.args(entryFileAbsPath);

  let child;
  try {
    child = spawn(cmd, args, {
      timeout: TIMEOUT_MS,
      cwd: path.dirname(entryFileAbsPath), // Run from the file's directory
      env: { ...process.env, NODE_ENV: 'sandbox' },
    });
  } catch (err) {
    emit('stderr', `✗ Could not start runtime "${cmd}": ${err.message}\n`);
    io.to(roomId).emit('exec-done', { exitCode: 1, duration: 0, language, runner: user.username });
    cleanUpDir(runDir);
    return;
  }

  // Stream stdout
  child.stdout.on('data', chunk => emit('stdout', chunk.toString()));

  // Stream stderr
  child.stderr.on('data', chunk => emit('stderr', chunk.toString()));

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

function cleanUpDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

module.exports = { executeCode };

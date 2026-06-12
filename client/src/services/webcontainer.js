/**
 * webcontainer.js
 * Singleton WebContainer instance shared across the editor session.
 * Handles booting, file mounting, and command execution.
 */
import { WebContainer } from '@webcontainer/api';

let instance = null;
let bootPromise = null;

/**
 * Boot the WebContainer once and reuse it.
 * Calling this multiple times safely returns the same instance.
 */
export async function bootContainer() {
  if (instance) return instance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot({ coep: 'credentialless' }).then((wc) => {
    instance = wc;
    return wc;
  });

  return bootPromise;
}

/**
 * Mount workspace files from our DB into the WebContainer filesystem.
 * @param {WebContainer} wc - The WebContainer instance
 * @param {Array<{path: string, content: string}>} files
 */
export async function mountFiles(wc, files) {
  const tree = {};

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    let node = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) {
        node[parts[i]] = { directory: {} };
      }
      node = node[parts[i]].directory;
    }

    const filename = parts[parts.length - 1];
    node[filename] = {
      file: { contents: file.content || '' },
    };
  }

  await wc.mount(tree);
}

/**
 * Write a single file into the WebContainer (used for live sync).
 * @param {WebContainer} wc
 * @param {string} path - e.g. '/src/index.js'
 * @param {string} content
 */
export async function writeFile(wc, path, content) {
  try {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    // Ensure parent directories exist
    const parts = normalized.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      await wc.fs.mkdir(dir, { recursive: true }).catch(() => {});
    }
    await wc.fs.writeFile(normalized, content);
  } catch (e) {
    console.warn('[WebContainer] writeFile error:', e);
  }
}

/**
 * Spawn a process inside the WebContainer.
 * Returns the process object so the caller can wire up terminal I/O.
 * @param {WebContainer} wc
 * @param {string} command - e.g. 'npm'
 * @param {string[]} args  - e.g. ['run', 'dev']
 */
export async function spawnProcess(wc, command, args = []) {
  return wc.spawn(command, args, {
    terminal: { cols: 80, rows: 24 },
  });
}

export function getInstance() {
  return instance;
}

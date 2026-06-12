const Y = require('yjs');
const WorkspaceFile = require('../models/WorkspaceFile');

// In-memory store of active Y.Doc instances
// Key format: `${roomId}:${path}`
const docs = new Map();

// Debounce timers for saving
const saveTimers = new Map();

const getFileKey = (roomId, path) => `${roomId}:${path}`;

/**
 * Get or create a Y.Doc for a specific file in a room.
 * Loads persisted Yjs state from MongoDB WorkspaceFile.
 */
const getOrCreateDoc = async (roomId, path) => {
  const fileKey = getFileKey(roomId, path);
  if (docs.has(fileKey)) {
    return docs.get(fileKey);
  }

  const ydoc = new Y.Doc();

  try {
    const file = await WorkspaceFile.findOne({ roomId, path });
    if (file && file.yjsState) {
      const state = new Uint8Array(file.yjsState);
      Y.applyUpdate(ydoc, state);
    } else if (file && file.content) {
      // If no Yjs state but plain content exists (e.g., initial creation)
      const ytext = ydoc.getText('monaco');
      ydoc.transact(() => {
        ytext.insert(0, file.content);
      });
    }
  } catch (error) {
    console.error(`Error loading Yjs state for file ${fileKey}:`, error.message);
  }

  docs.set(fileKey, ydoc);
  return ydoc;
};

/**
 * Apply a binary Yjs update to the in-memory doc for a file.
 */
const applyUpdate = async (roomId, path, update) => {
  const ydoc = await getOrCreateDoc(roomId, path);
  Y.applyUpdate(ydoc, new Uint8Array(update));
};

/**
 * Get the full encoded state of the Y.Doc for a file.
 */
const getStateVector = async (roomId, path) => {
  const ydoc = await getOrCreateDoc(roomId, path);
  return Y.encodeStateAsUpdate(ydoc);
};

/**
 * Save the current Yjs state to MongoDB WorkspaceFile.
 */
const saveToDatabase = async (roomId, path) => {
  const fileKey = getFileKey(roomId, path);
  try {
    const ydoc = docs.get(fileKey);
    if (!ydoc) return;

    const state = Y.encodeStateAsUpdate(ydoc);
    const ytext = ydoc.getText('monaco');
    const plainText = ytext.toString();

    await WorkspaceFile.findOneAndUpdate(
      { roomId, path },
      {
        yjsState: Buffer.from(state),
        content: plainText,
        updatedAt: Date.now(),
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error saving Yjs state for file ${fileKey}:`, error.message);
  }
};

/**
 * Schedule a debounced save to database.
 */
const debouncedSave = (roomId, path) => {
  const fileKey = getFileKey(roomId, path);
  if (saveTimers.has(fileKey)) {
    clearTimeout(saveTimers.get(fileKey));
  }

  const timer = setTimeout(() => {
    saveToDatabase(roomId, path);
    saveTimers.delete(fileKey);
  }, 5000);

  saveTimers.set(fileKey, timer);
};

/**
 * Rename memory keys for a Y.Doc when a file is renamed.
 */
const renameDocPath = async (roomId, oldPath, newPath) => {
  const oldKey = getFileKey(roomId, oldPath);
  const newKey = getFileKey(roomId, newPath);

  // Force save old if pending
  if (saveTimers.has(oldKey)) {
    clearTimeout(saveTimers.get(oldKey));
    await saveToDatabase(roomId, oldPath);
    saveTimers.delete(oldKey);
  }

  if (docs.has(oldKey)) {
    const ydoc = docs.get(oldKey);
    docs.set(newKey, ydoc);
    docs.delete(oldKey);
  }
};

/**
 * Clean up a single file's Y.Doc (e.g. on delete).
 */
const cleanupFileDoc = async (roomId, path) => {
  const fileKey = getFileKey(roomId, path);
  if (saveTimers.has(fileKey)) {
    clearTimeout(saveTimers.get(fileKey));
    saveTimers.delete(fileKey);
  }

  const ydoc = docs.get(fileKey);
  if (ydoc) {
    ydoc.destroy();
    docs.delete(fileKey);
  }
};

/**
 * Clean up all Y.Docs for a room when it empties.
 */
const cleanupRoomDocs = async (roomId) => {
  const prefix = `${roomId}:`;
  for (const [key, ydoc] of docs.entries()) {
    if (key.startsWith(prefix)) {
      if (saveTimers.has(key)) {
        clearTimeout(saveTimers.get(key));
        saveTimers.delete(key);
      }
      
      const path = key.substring(prefix.length);
      await saveToDatabase(roomId, path);
      ydoc.destroy();
      docs.delete(key);
    }
  }
};

/**
 * Flush all pending changes for a room to the database without destroying docs.
 */
const flushRoomDocs = async (roomId) => {
  const prefix = `${roomId}:`;
  for (const [key] of docs.entries()) {
    if (key.startsWith(prefix)) {
      const path = key.substring(prefix.length);
      await saveToDatabase(roomId, path);
    }
  }
};

module.exports = {
  getOrCreateDoc,
  applyUpdate,
  getStateVector,
  saveToDatabase,
  debouncedSave,
  renameDocPath,
  cleanupFileDoc,
  cleanupRoomDocs,
  flushRoomDocs,
};

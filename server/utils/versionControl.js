const Y = require('yjs');
const yjsService = require('../services/yjs.service');
const RepoVersion = require('../models/RepoVersion');

/**
 * Version Control Utilities
 *
 * Bridges the Yjs CRDT document state with Git-based versioning from GitHub.
 * Provides helpers to snapshot, compare, and restore document content
 * when a GitHub sync event arrives.
 */

// ─── Snapshot Helpers ─────────────────────────────────────────────────────────

/**
 * Get the current plain-text content of a room's Yjs document.
 *
 * @param {string} roomId
 * @returns {Promise<string>} - Current document text
 */
const getDocumentSnapshot = async (roomId) => {
  const ydoc = await yjsService.getOrCreateDoc(roomId);
  return ydoc.getText('monaco').toString();
};

/**
 * Create a lightweight diff summary between two text strings.
 * Returns line-level added / removed counts (similar to GitHub's diff stat).
 *
 * @param {string} oldText
 * @param {string} newText
 * @returns {{ added: number, removed: number, changed: boolean }}
 */
const computeDiffStats = (oldText, newText) => {
  if (oldText === newText) {
    return { added: 0, removed: 0, changed: false };
  }

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Simple set-based diff count (not a full LCS diff, but fast and good enough)
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let added = 0;
  let removed = 0;

  for (const line of newLines) {
    if (!oldSet.has(line)) added++;
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removed++;
  }

  return { added, removed, changed: true };
};

// ─── Sync Actions ─────────────────────────────────────────────────────────────

/**
 * Called when a GitHub push event is received for a repo that is linked
 * to a CollabCode room.
 *
 * Steps:
 *   1. Snapshot the current Yjs document content.
 *   2. Record the sync event in RepoVersion with linkedRoomId.
 *   3. Return diff stats so the UI can display what changed.
 *
 * @param {string} roomId - CollabCode room ID
 * @param {object} versionData - { repoFullName, branch, commitSha, commitMessage, author, compareUrl }
 * @returns {Promise<object>} - { version, diff }
 */
const syncGitHubPushToRoom = async (roomId, versionData) => {
  // 1. Snapshot current content before applying remote changes
  const previousContent = await getDocumentSnapshot(roomId);

  // 2. Persist the sync event linked to this room
  const version = await RepoVersion.findOneAndUpdate(
    {
      repoFullName: versionData.repoFullName,
      commitSha: versionData.commitSha,
    },
    {
      ...versionData,
      linkedRoomId: roomId,
      status: 'synced',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 3. Compute diff stats (the actual content replacement would happen
  //    on the client via the Yjs update broadcast — here we just record)
  const newContent = versionData.content || previousContent;
  const diff = computeDiffStats(previousContent, newContent);

  console.log(
    `Version sync: ${versionData.repoFullName}@${versionData.commitSha.slice(0, 7)} → room ${roomId} (Δ +${diff.added}/-${diff.removed})`
  );

  return { version, diff };
};

// ─── Version History ──────────────────────────────────────────────────────────

/**
 * Get the version history for a room (all GitHub sync events linked to it).
 *
 * @param {string} roomId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getRoomVersionHistory = async (roomId, limit = 20) => {
  return RepoVersion.find({ linkedRoomId: roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get a specific version record by its commit SHA and repo name.
 *
 * @param {string} repoFullName
 * @param {string} commitSha
 * @returns {Promise<object|null>}
 */
const getVersionBySha = async (repoFullName, commitSha) => {
  return RepoVersion.findOne({ repoFullName, commitSha }).lean();
};

// ─── Yjs Binary State Helpers ─────────────────────────────────────────────────

/**
 * Encode the current Yjs document state as a binary Uint8Array.
 * Useful for creating binary snapshots that can be stored in Git or DB.
 *
 * @param {string} roomId
 * @returns {Promise<Uint8Array>}
 */
const encodeYjsState = async (roomId) => {
  const ydoc = await yjsService.getOrCreateDoc(roomId);
  return Y.encodeStateAsUpdate(ydoc);
};

/**
 * Apply a binary Yjs update to a room's document (e.g. from a restored snapshot).
 *
 * @param {string} roomId
 * @param {Uint8Array|Buffer} update
 */
const applyYjsUpdate = async (roomId, update) => {
  await yjsService.applyUpdate(roomId, update);
  yjsService.debouncedSave(roomId);
};

module.exports = {
  getDocumentSnapshot,
  computeDiffStats,
  syncGitHubPushToRoom,
  getRoomVersionHistory,
  getVersionBySha,
  encodeYjsState,
  applyYjsUpdate,
};

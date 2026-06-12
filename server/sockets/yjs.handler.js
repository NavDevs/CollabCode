const yjsService = require('../services/yjs.service');

const registerYjsHandler = (io, socket) => {
  // Client requests initial sync for a specific file
  socket.on('yjs-sync-request', async ({ roomId, path }) => {
    if (!roomId || !path) return;
    try {
      const state = await yjsService.getStateVector(roomId, path);
      socket.emit('yjs-sync-init', {
        roomId,
        path,
        state: Array.from(state), // Convert Uint8Array to regular array for transport
      });
    } catch (error) {
      console.error('yjs-sync-request error:', error.message);
    }
  });

  // Client sends an update (edit) for a file
  socket.on('yjs-update', async ({ roomId, path, update }) => {
    if (!roomId || !path) return;
    try {
      // Apply the update to the in-memory doc
      await yjsService.applyUpdate(roomId, path, update);

      // Broadcast update to others in the room
      socket.to(roomId).emit('yjs-update', {
        roomId,
        path,
        update,
      });

      // Schedule a debounced save to database
      yjsService.debouncedSave(roomId, path);
    } catch (error) {
      console.error('yjs-update error:', error.message);
    }
  });

  // Client sends awareness update (cursor position, selection, etc.)
  socket.on('yjs-awareness-update', ({ roomId, path, update }) => {
    if (!roomId) return;
    try {
      socket.to(roomId).emit('yjs-awareness-update', {
        roomId,
        path,
        update,
      });
    } catch (error) {
      console.error('yjs-awareness-update error:', error.message);
    }
  });
};

module.exports = { registerYjsHandler };

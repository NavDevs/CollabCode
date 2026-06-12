const { executeCode } = require('../controllers/execute.controller');
const { connectedUsers } = require('./room.handler');
const { notifyRoom } = require('../services/notification.service');

function registerExecuteHandler(io, socket) {
  socket.on('code-execute', async ({ roomId, path, language }) => {
    if (!roomId || !path) return;

    // Only run if user is actually in the room
    if (!socket.rooms_joined?.has(roomId)) {
      socket.emit('exec-error', { message: 'You must join the room first.' });
      return;
    }

    // Notify other participants that code is being executed
    if (connectedUsers.has(roomId)) {
      notifyRoom(io, connectedUsers.get(roomId), socket.user._id.toString(), {
        type: 'execute',
        title: `${socket.user.username} is running code`,
        message: `${socket.user.username} started executing ${path}.`,
        roomId,
      });
    }

    try {
      await executeCode(io, roomId, path, language || 'javascript', socket.user);
    } catch (err) {
      console.error('[execute] Unexpected error:', err);
      io.to(roomId).emit('exec-output', {
        type: 'stderr',
        data: `Internal error: ${err.message}\n`,
        ts: Date.now(),
      });
      io.to(roomId).emit('exec-done', {
        exitCode: 1,
        duration: 0,
        language,
        runner: socket.user.username,
      });
    }
  });
}

module.exports = { registerExecuteHandler };

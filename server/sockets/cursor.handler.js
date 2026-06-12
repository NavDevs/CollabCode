const registerCursorHandler = (io, socket) => {
  socket.on('cursor-change', ({ roomId, cursor }) => {
    try {
      socket.to(roomId).emit('cursor-updated', {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        cursor,
      });
    } catch (error) {
      console.error('cursor-change error:', error.message);
    }
  });
};

module.exports = { registerCursorHandler };

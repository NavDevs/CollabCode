const { nanoid } = require('nanoid');
const Message = require('../models/Message');

const registerChatHandler = (io, socket) => {
  socket.on('chat-message', async ({ roomId, message }) => {
    try {
      // Validate non-empty message
      if (!message || !message.trim()) {
        return;
      }

      const chatMessage = {
        id: nanoid(12),
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: message.trim(),
        timestamp: Date.now(),
      };

      // Save to database
      await Message.create({
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: message.trim(),
        timestamp: chatMessage.timestamp,
      });

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit('chat-message', chatMessage);
    } catch (error) {
      console.error('chat-message error:', error.message);
    }
  });
};

module.exports = { registerChatHandler };

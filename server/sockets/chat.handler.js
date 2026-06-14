const { nanoid } = require('nanoid');
const Message = require('../models/Message');

const registerChatHandler = (io, socket) => {
  socket.on('chat-message', async ({ roomId, message, imageUrl }) => {
    try {
      // Validate non-empty message or image
      if ((!message || !message.trim()) && !imageUrl) {
        return;
      }

      const chatMessage = {
        id: nanoid(12),
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: message ? message.trim() : '',
        imageUrl: imageUrl || null,
        timestamp: Date.now(),
      };

      // Save to database
      await Message.create({
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: chatMessage.message,
        imageUrl: chatMessage.imageUrl,
        timestamp: chatMessage.timestamp,
      });

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit('chat-message', chatMessage);
    } catch (error) {
      console.error('chat-message error:', error.message);
    }
  });

  // Typing indicator
  socket.on('user-typing', ({ roomId, username }) => {
    if (roomId) {
      socket.to(roomId).emit('user-typing', { username });
    }
  });

  // Write Access Requests
  socket.on('request-write-access', async ({ roomId }) => {
    try {
      const chatMessage = {
        id: nanoid(12),
        type: 'permission_request',
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: `${socket.user.username} is requesting write access.`,
        timestamp: Date.now(),
        status: 'pending',
      };
      
      await Message.create({
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: chatMessage.message,
        type: 'permission_request',
        timestamp: chatMessage.timestamp,
      });

      io.to(roomId).emit('chat-system', chatMessage);
    } catch (err) {
      console.error('request-write-access error:', err);
    }
  });

  socket.on('grant-write-access', async ({ roomId, targetUserId, targetUsername }) => {
    try {
      const Room = require('../models/Room');
      const room = await Room.findOne({ roomId });
      if (!room) return;

      // Only the current holder or the owner can transfer it
      if (room.writeAccessUserId && room.writeAccessUserId.toString() !== socket.user._id.toString() && room.ownerId.toString() !== socket.user._id.toString()) {
        return; // Not authorized
      }

      room.writeAccessUserId = targetUserId;
      await room.save();

      // Broadcast write access change
      io.to(roomId).emit('write-access-changed', { writeAccessUserId: targetUserId });

      const grantedMsg = {
        id: nanoid(12),
        type: 'permission_granted',
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: `${targetUsername} was granted write access.`,
        timestamp: Date.now(),
      };

      await Message.create({
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: grantedMsg.message,
        type: 'permission_granted',
        timestamp: grantedMsg.timestamp,
      });

      // Send system message
      io.to(roomId).emit('chat-system', grantedMsg);
    } catch (err) {
      console.error('grant-write-access error:', err);
    }
  });

  socket.on('reject-write-access', async ({ roomId, targetUsername }) => {
    try {
      const rejectMsg = {
        id: nanoid(12),
        type: 'permission_rejected',
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: `${socket.user.username} denied write access to ${targetUsername}.`,
        timestamp: Date.now(),
      };

      await Message.create({
        roomId,
        userId: socket.user._id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        message: rejectMsg.message,
        type: 'permission_rejected',
        timestamp: rejectMsg.timestamp,
      });

      io.to(roomId).emit('chat-system', rejectMsg);
    } catch (err) {
      console.error('reject-write-access error:', err);
    }
  });

  // Terminal Mirroring Events
  socket.on('terminal-visibility-change', ({ roomId, showTerminal }) => {
    socket.to(roomId).emit('terminal-visibility-change', { showTerminal });
  });

  socket.on('terminal-output', ({ roomId, data }) => {
    socket.to(roomId).emit('terminal-output', { data });
  });
};

module.exports = { registerChatHandler };

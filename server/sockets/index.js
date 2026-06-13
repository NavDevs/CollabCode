const { verifyToken } = require('@clerk/backend');
const { Server } = require('socket.io');
const User = require('../models/User');
const { registerRoomHandler, connectedUsers } = require('./room.handler');
const { registerYjsHandler } = require('./yjs.handler');
const { registerChatHandler } = require('./chat.handler');
const { registerCursorHandler } = require('./cursor.handler');
const { registerExecuteHandler } = require('./execute.handler');
const { registerTerminalHandler } = require('./terminal.handler');
const yjsService = require('../services/yjs.service');
const Message = require('../models/Message');

const setupSocket = (io) => {

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided.'));
      }

      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      
      const clerkId = decoded.sub;
      const user = await User.findOne({ clerkId });

      if (!user) {
        return next(new Error('Authentication error: User not synced.'));
      }

      // Attach user info to socket
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // Join personal notification channel
    socket.join(`user:${socket.user._id.toString()}`);

    // Register all event handlers
    registerRoomHandler(io, socket);
    registerYjsHandler(io, socket);
    registerChatHandler(io, socket);
    registerCursorHandler(io, socket);
    registerExecuteHandler(io, socket);
    registerTerminalHandler(io, socket);

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id})`);

      // Clean up from all rooms this socket was in
      if (socket.rooms_joined) {
        for (const roomId of socket.rooms_joined) {
          // Remove from connectedUsers
          if (connectedUsers.has(roomId)) {
            const roomUsers = connectedUsers.get(roomId);
            roomUsers.delete(socket.id);

            // Check if user still has other sockets in the room
            const stillPresent = Array.from(roomUsers.values()).some(
              u => u.userId === socket.user._id.toString()
            );

            if (!stillPresent) {
              // Emit system chat message
              const dcMsg = `${socket.user.username} disconnected`;
              io.in(roomId).emit('chat-system', {
                type: 'leave',
                username: socket.user.username,
                avatarColor: socket.user.avatarColor,
                userId: socket.user._id.toString(),
                timestamp: Date.now(),
                message: dcMsg,
              });
              // Persist to DB
              Message.create({
                roomId,
                userId: socket.user._id,
                username: socket.user.username,
                avatarColor: socket.user.avatarColor,
                message: dcMsg,
                type: 'system',
                timestamp: new Date(),
              }).catch(err => console.error('Failed to save disconnect msg:', err.message));

              // Broadcast user-left to the room
              io.in(roomId).emit('user-left', {
                userId: socket.user._id.toString(),
                username: socket.user.username,
              });
            }

            // Broadcast updated full list so everyone stays in sync
            const usersList = Array.from(roomUsers.values());
            const seen = new Set();
            const uniqueUsers = usersList.filter(u => {
              if (seen.has(u.userId)) return false;
              seen.add(u.userId);
              return true;
            });
            io.in(roomId).emit('room-users', uniqueUsers);

            // If room is now empty, clean up Yjs doc
            if (roomUsers.size === 0) {
              connectedUsers.delete(roomId);
              await yjsService.cleanupRoomDocs(roomId);
            }
          }
        }
      }
    });
  });
};

module.exports = setupSocket;

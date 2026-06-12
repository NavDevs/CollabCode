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

            // Broadcast user-left to the room
            socket.to(roomId).emit('user-left', {
              userId: socket.user._id.toString(),
              username: socket.user.username,
            });

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

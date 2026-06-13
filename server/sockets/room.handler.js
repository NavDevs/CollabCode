// In-memory map: roomId -> Map<socketId, { userId, username, avatarColor }>
const connectedUsers = new Map();
const { notify, notifyRoom } = require('../services/notification.service');

const registerRoomHandler = (io, socket) => {
  socket.on('join-room', async (roomId) => {
    try {
      // Join the Socket.IO room
      socket.join(roomId);

      // Track user in connectedUsers
      if (!connectedUsers.has(roomId)) {
        connectedUsers.set(roomId, new Map());
      }

      const roomUsers = connectedUsers.get(roomId);

      // Check if user is already in the room (reconnect)
      const alreadyPresent = Array.from(roomUsers.values()).some(
        u => u.userId === socket.user._id.toString()
      );

      roomUsers.set(socket.id, {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
      });

      // Store the roomId on the socket for cleanup on disconnect
      if (!socket.rooms_joined) {
        socket.rooms_joined = new Set();
      }
      socket.rooms_joined.add(roomId);

      // Only broadcast join events if user wasn't already present (not a reconnect)
      if (!alreadyPresent) {
        // Broadcast to others in the room that a user joined
        socket.to(roomId).emit('user-joined', {
          userId: socket.user._id.toString(),
          username: socket.user.username,
          avatarColor: socket.user.avatarColor,
        });

        // Emit system chat message for the join
        io.in(roomId).emit('chat-system', {
          type: 'join',
          username: socket.user.username,
          avatarColor: socket.user.avatarColor,
          userId: socket.user._id.toString(),
          timestamp: Date.now(),
          message: `${socket.user.username} joined the room`,
        });
      }

      // Send the full list of connected users to ALL clients in the room
      const usersList = Array.from(roomUsers.values());
      // Deduplicate by userId
      const seen = new Set();
      const uniqueUsers = usersList.filter(u => {
        if (seen.has(u.userId)) return false;
        seen.add(u.userId);
        return true;
      });
      io.in(roomId).emit('room-users', uniqueUsers);

      // Notify the joiner themselves
      notify(io, {
        userId: socket.user._id.toString(),
        type: 'system',
        title: `Joined room`,
        message: `You joined room ${roomId}.`,
        roomId,
      });

      // Notify other participants
      if (!alreadyPresent) {
        notifyRoom(io, roomUsers, socket.user._id.toString(), {
          type: 'join',
          title: `${socket.user.username} joined`,
          message: `${socket.user.username} joined the room.`,
          roomId,
        });
      }
    } catch (error) {
      console.error('join-room error:', error.message);
    }
  });

  socket.on('leave-room', async (roomId) => {
    try {
      socket.leave(roomId);

      // Remove from connectedUsers
      if (connectedUsers.has(roomId)) {
        const roomUsers = connectedUsers.get(roomId);
        roomUsers.delete(socket.id);

        // Check if user still has other sockets in the room
        const stillPresent = Array.from(roomUsers.values()).some(
          u => u.userId === socket.user._id.toString()
        );

        if (!stillPresent) {
          // Emit system chat message for the leave
          io.in(roomId).emit('chat-system', {
            type: 'leave',
            username: socket.user.username,
            avatarColor: socket.user.avatarColor,
            userId: socket.user._id.toString(),
            timestamp: Date.now(),
            message: `${socket.user.username} left the room`,
          });

          // Broadcast user-left
          io.in(roomId).emit('user-left', {
            userId: socket.user._id.toString(),
            username: socket.user.username,
          });

          // Notify others about leaving
          notifyRoom(io, roomUsers, socket.user._id.toString(), {
            type: 'leave',
            title: `${socket.user.username} left`,
            message: `${socket.user.username} left the room.`,
            roomId,
          });
        }

        // Broadcast updated full list to everyone remaining
        const usersList = Array.from(roomUsers.values());
        const seen = new Set();
        const uniqueUsers = usersList.filter(u => {
          if (seen.has(u.userId)) return false;
          seen.add(u.userId);
          return true;
        });
        io.in(roomId).emit('room-users', uniqueUsers);

        // Clean up empty rooms
        if (roomUsers.size === 0) {
          connectedUsers.delete(roomId);
        }
      }

      // Remove from socket tracking
      if (socket.rooms_joined) {
        socket.rooms_joined.delete(roomId);
      }
    } catch (error) {
      console.error('leave-room error:', error.message);
    }
  });
};

module.exports = { registerRoomHandler, connectedUsers };

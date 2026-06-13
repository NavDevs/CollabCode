// In-memory map: roomId -> Map<socketId, { userId, username, avatarColor }>
const connectedUsers = new Map();
const { notify, notifyRoom } = require('../services/notification.service');
const Message = require('../models/Message');

// Helper to save system messages to DB for permanent history
const saveSystemMessage = async (roomId, username, avatarColor, userId, msg) => {
  try {
    await Message.create({
      roomId,
      userId,
      username,
      avatarColor,
      message: msg,
      type: 'system',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to save system message:', err.message);
  }
};

// Helper: build deduplicated user list for a room and broadcast to ALL in it
const broadcastRoomUsers = (io, roomId) => {
  const roomUsers = connectedUsers.get(roomId);
  if (!roomUsers) return [];

  const usersList = Array.from(roomUsers.values());
  const seen = new Set();
  const uniqueUsers = usersList.filter(u => {
    if (seen.has(u.userId)) return false;
    seen.add(u.userId);
    return true;
  });
  io.in(roomId).emit('room-users', uniqueUsers);
  return uniqueUsers;
};

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
        profilePicture: socket.user.profilePicture || null,
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
        const joinMsg = `${socket.user.username} joined the room`;
        io.in(roomId).emit('chat-system', {
          type: 'join',
          username: socket.user.username,
          avatarColor: socket.user.avatarColor,
          userId: socket.user._id.toString(),
          timestamp: Date.now(),
          message: joinMsg,
        });
        // Persist to DB
        saveSystemMessage(roomId, socket.user.username, socket.user.avatarColor, socket.user._id, joinMsg);
      }

      // Broadcast the full user list to ALL clients including the joiner
      broadcastRoomUsers(io, roomId);

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
      // Remove from connectedUsers FIRST (before leaving Socket.IO room)
      if (connectedUsers.has(roomId)) {
        const roomUsers = connectedUsers.get(roomId);
        roomUsers.delete(socket.id);

        // Check if user still has other sockets in the room
        const stillPresent = Array.from(roomUsers.values()).some(
          u => u.userId === socket.user._id.toString()
        );

        if (!stillPresent) {
          // Emit system chat message for the leave
          const leaveMsg = `${socket.user.username} left the room`;
          io.in(roomId).emit('chat-system', {
            type: 'leave',
            username: socket.user.username,
            avatarColor: socket.user.avatarColor,
            userId: socket.user._id.toString(),
            timestamp: Date.now(),
            message: leaveMsg,
          });
          // Persist to DB
          saveSystemMessage(roomId, socket.user.username, socket.user.avatarColor, socket.user._id, leaveMsg);

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

        // Broadcast updated user list BEFORE the socket leaves the room
        broadcastRoomUsers(io, roomId);

        // Clean up empty rooms
        if (roomUsers.size === 0) {
          connectedUsers.delete(roomId);
        }
      }

      // Leave Socket.IO room AFTER broadcasting (so leaving user gets the update too)
      socket.leave(roomId);

      // Remove from socket tracking
      if (socket.rooms_joined) {
        socket.rooms_joined.delete(roomId);
      }
    } catch (error) {
      console.error('leave-room error:', error.message);
    }
  });
};

module.exports = { registerRoomHandler, connectedUsers, broadcastRoomUsers };

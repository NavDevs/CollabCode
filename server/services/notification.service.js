const Notification = require('../models/Notification');

/**
 * Create a notification and emit it in real-time via Socket.IO.
 * @param {Object} io      - Socket.IO server instance
 * @param {Object} params  - { userId, type, title, message, roomId }
 */
const notify = async (io, { userId, type, title, message = '', roomId = null }) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      roomId,
    });

    // Emit to the user's personal channel (they join it on connect)
    io.to(`user:${userId}`).emit('notification', notification);
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

/**
 * Notify all participants in a room except the actor.
 * @param {Object} io          - Socket.IO server instance
 * @param {Map}    roomUsers   - connectedUsers map for the room
 * @param {string} actorId     - user ID to exclude
 * @param {Object} data        - { type, title, message, roomId }
 */
const notifyRoom = async (io, roomUsers, actorId, { type, title, message = '', roomId = null }) => {
  if (!roomUsers) return;
  const seen = new Set();
  for (const [, info] of roomUsers) {
    if (info.userId !== actorId && !seen.has(info.userId)) {
      seen.add(info.userId);
      await notify(io, { userId: info.userId, type, title, message, roomId });
    }
  }
};

module.exports = { notify, notifyRoom };

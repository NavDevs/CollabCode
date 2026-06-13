const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  username: {
    type: String,
    required: true,
  },
  avatarColor: {
    type: String,
    required: false,
  },
  message: {
    type: String,
    required: true,
  },
  // 'message' = regular chat, 'system' = join/leave/disconnect
  type: {
    type: String,
    enum: ['message', 'system'],
    default: 'message',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient room-based pagination queries
messageSchema.index({ roomId: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

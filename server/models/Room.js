const mongoose = require('mongoose');

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
  'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'html', 'css', 'sql', 'markdown', 'json', 'xml', 'yaml',
  'bash', 'plaintext',
];

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    required: [true, 'Room ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title must be at most 100 characters'],
  },
  language: {
    type: String,
    default: 'javascript',
    enum: SUPPORTED_LANGUAGES,
  },
  githubRepo: {
    type: String,
    default: null,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required'],
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    default: null,
  },
  isReadOnly: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.methods.toJSON = function () {
  const room = this.toObject();
  delete room.password;
  delete room.__v;
  return room;
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;

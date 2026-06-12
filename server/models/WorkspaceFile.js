const mongoose = require('mongoose');

const workspaceFileSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: 'javascript',
  },
  content: {
    type: String,
    default: '',
  },
  yjsState: {
    type: Buffer,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

workspaceFileSchema.index({ roomId: 1, path: 1 }, { unique: true });

workspaceFileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const WorkspaceFile = mongoose.model('WorkspaceFile', workspaceFileSchema);

module.exports = WorkspaceFile;

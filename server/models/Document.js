const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    required: [true, 'Room ID is required'],
    index: true,
  },
  content: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: 'javascript',
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

// Update the updatedAt timestamp on save
documentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;

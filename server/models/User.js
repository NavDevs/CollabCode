const mongoose = require('mongoose');

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F0B27A', '#82E0AA', '#F1948A', '#85929E', '#73C6B6',
];

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    unique: true,
    sparse: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must be at most 30 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: false,
    default: null,
  },
  avatarColor: {
    type: String,
    default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  },
  githubId: {
    type: String,
    default: null,
  },
  githubUsername: {
    type: String,
    default: null,
  },
  githubAccessToken: {
    type: String,
    default: null,
  },
  googleId: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.githubAccessToken;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

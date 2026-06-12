const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/users/profile — return current user's profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({ error: 'Server error fetching profile.' });
  }
};

// PUT /api/users/profile — update username, email, or avatarColor
const updateProfile = async (req, res) => {
  try {
    const { username, email, avatarColor } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (username && username.trim()) {
      // Check uniqueness
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ error: 'Username is already taken.' });
      user.username = username.trim();
    }

    if (email && email.trim()) {
      const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ error: 'Email is already in use.' });
      user.email = email.trim().toLowerCase();
    }

    if (avatarColor) {
      user.avatarColor = avatarColor;
    }

    await user.save();
    return res.json({ user, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
};

// PUT /api/users/password — change password
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Update password error:', error.message);
    return res.status(500).json({ error: 'Server error changing password.' });
  }
};

module.exports = { getProfile, updateProfile, updatePassword };

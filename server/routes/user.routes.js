const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updatePassword } = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET  /api/users/profile   — get current user profile
router.get('/profile', getProfile);

// PUT  /api/users/profile   — update username, email, avatarColor
router.put('/profile', updateProfile);

// PUT  /api/users/password  — change password
router.put('/password', updatePassword);

module.exports = router;

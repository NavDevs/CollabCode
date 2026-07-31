const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { getMe } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate a JWT for the user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @route GET /api/auth/me
router.get('/me', auth, getMe);

// @route GET /api/auth/google
// @desc Initiate Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false
}));

// @route GET /api/auth/google/callback
// @desc Handle Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login?error=true' }), (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=true`);
  }

  // Generate JWT token for our app
  const token = generateToken(req.user._id);

  // Redirect to frontend with token
  res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
});

module.exports = router;

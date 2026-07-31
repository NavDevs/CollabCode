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
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    // Determine redirect base
    const clientUrl = process.env.CLIENT_URL || '';
    
    if (err) {
      console.error('❌ Google OAuth callback error:', err.message);
      return res.redirect(`${clientUrl}/login?error=google_failed&details=${encodeURIComponent(err.message)}`);
    }
    
    if (!user) {
      console.error('❌ Google OAuth: No user returned', info);
      return res.redirect(`${clientUrl}/login?error=no_user`);
    }

    // Generate JWT token for our app
    const token = generateToken(user._id);
    console.log('✅ Google OAuth success, redirecting with token for:', user.username);

    // Redirect to frontend with token
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  })(req, res, next);
});

module.exports = router;

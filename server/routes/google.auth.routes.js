const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ── Configure Google OAuth Strategy ─────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        // Check if a user with this email already exists
        let user = await User.findOne({ email });

        if (user) {
          // Link Google ID if not already linked
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // Create a brand new user
          const avatarColors = ['#F59E0B','#10B981','#3B82F6','#EC4899','#8B5CF6','#F97316','#06B6D4'];
          const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

          // Generate a unique username from their display name
          let baseUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
          let username = baseUsername;
          let suffix = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${suffix++}`;
          }

          user = await User.create({
            email,
            username,
            googleId: profile.id,
            avatarColor,
            // No password needed for Google users
            password: null,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth consent page.
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants permission.
 * We create a JWT and redirect to the frontend.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_failed` }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // Redirect to frontend with token in query param
    // The frontend will pick it up and store it in localStorage
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

module.exports = router;

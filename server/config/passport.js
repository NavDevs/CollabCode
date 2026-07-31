const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const callbackURL = process.env.RENDER_EXTERNAL_URL
  ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/google/callback`
  : '/api/auth/google/callback';

console.log('📋 Google OAuth callback URL:', callbackURL);
console.log('📋 Google Client ID:', process.env.AUTH_GOOGLE_ID ? '✅ SET' : '❌ MISSING');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔑 Google profile received:', profile.id, profile.displayName);
        
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
          console.error('❌ No email found in Google profile');
          return done(new Error('No email found in Google profile'), null);
        }

        // Try to find user by google id or email
        let user = await User.findOne({ 
          $or: [
            { clerkId: profile.id },
            { email: email }
          ]
        });

        if (user) {
          // Link the google id if not already linked
          if (user.clerkId !== profile.id) {
            user.clerkId = profile.id;
            await user.save();
          }
          console.log('✅ Existing user found:', user.username);
          return done(null, user);
        }

        // New user
        let username = profile.displayName || (profile.name && profile.name.givenName) || email.split('@')[0];
        
        // Ensure username is at least 3 chars
        if (username.length < 3) username += '_user';
        // Ensure username is max 30 chars
        username = username.slice(0, 30);

        // Ensure username uniqueness
        let finalUsername = username;
        let suffix = 1;
        while (await User.findOne({ username: finalUsername })) {
          finalUsername = `${username.slice(0, 26)}${suffix}`;
          suffix++;
        }

        user = await User.create({
          clerkId: profile.id,
          email: email,
          username: finalUsername,
          avatarColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
        });

        console.log('✅ New user created:', user.username);
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error.message);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

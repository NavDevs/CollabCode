const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      callbackURL: '/api/auth/google/callback',
      proxy: true // Trust the reverse proxy (Render)
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Try to find user by clerkId (if they are migrating) or google id
        let user = await User.findOne({ 
          $or: [
            { clerkId: profile.id }, // in case we saved google id as clerkId previously
            { email: profile.emails[0].value }
          ]
        });

        if (user) {
          // If we found them by email but they don't have the google id linked, link it
          // We can just use clerkId field as the generic oauth provider id for now to avoid schema changes
          if (user.clerkId !== profile.id) {
            user.clerkId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // New user
        const email = profile.emails[0].value;
        let username = profile.displayName || profile.name.givenName || email.split('@')[0];
        
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
          clerkId: profile.id, // Using existing field to store Google ID
          email: email,
          username: finalUsername,
          avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

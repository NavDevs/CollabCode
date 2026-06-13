const { clerkMiddleware, clerkClient } = require('@clerk/express');
const { verifyToken } = require('@clerk/backend');
const User = require('../models/User');

const syncUser = async (req, res, next) => {
  try {
    let clerkId = req.auth?.userId;
    
    // Fallback: manually verify token if clerkMiddleware didn't populate req.auth
    if (!clerkId && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        clerkId = decoded.sub;
      } catch (e) {
        console.log("Token verification failed:", e.message);
      }
    }

    // Fallback: check query param token
    if (!clerkId && req.query?.token) {
      try {
        const decoded = await verifyToken(req.query.token, { secretKey: process.env.CLERK_SECRET_KEY });
        clerkId = decoded.sub;
      } catch (e) {
        console.log("Query token verification failed:", e.message);
      }
    }

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized — no valid token found' });
    }

    // Try to find existing user by clerkId
    let user = await User.findOne({ clerkId });
    
    if (!user) {
      // New user — fetch from Clerk and create in DB
      let email, username;
      
      try {
        const cUser = await clerkClient.users.getUser(clerkId);
        email = cUser.emailAddresses?.[0]?.emailAddress;
        username = cUser.username || cUser.firstName || email?.split('@')[0] || `user_${Date.now().toString(36)}`;
      } catch (clerkErr) {
        console.error('Failed to fetch Clerk user:', clerkErr.message);
        // If we can't reach Clerk API, create a minimal user
        email = `${clerkId}@collabcode.tmp`;
        username = `user_${clerkId.slice(-6)}`;
      }

      // Ensure username is at least 3 chars
      if (username.length < 3) {
        username = username + '_user';
      }
      // Ensure username is max 30 chars
      username = username.slice(0, 30);

      // Check if a user with this email already exists (e.g. from old registration)
      if (email) {
        const existingByEmail = await User.findOne({ email });
        if (existingByEmail) {
          // Link the existing user to this Clerk ID
          existingByEmail.clerkId = clerkId;
          await existingByEmail.save();
          req.user = existingByEmail;
          return next();
        }
      }

      // Ensure username uniqueness
      let finalUsername = username;
      let suffix = 1;
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${username.slice(0, 26)}${suffix}`;
        suffix++;
      }

      try {
        user = await User.create({
          clerkId,
          email: email || `${clerkId}@collabcode.app`,
          username: finalUsername,
        });
        console.log(`Created new user: ${finalUsername} (${email})`);
      } catch (createErr) {
        console.error('User creation failed:', createErr.message);
        
        // Handle duplicate key errors gracefully
        if (createErr.code === 11000) {
          // Try to find the user that already exists
          user = await User.findOne({ $or: [{ email }, { clerkId }] });
          if (user) {
            if (!user.clerkId) {
              user.clerkId = clerkId;
              await user.save();
            }
          } else {
            return res.status(500).json({ error: 'User creation conflict. Please try again.' });
          }
        } else {
          return res.status(500).json({ error: 'Failed to create user account.' });
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth sync error:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

const clerkOptions = {
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,
};

const auth = [
  clerkMiddleware(clerkOptions),
  syncUser
];

module.exports = auth;

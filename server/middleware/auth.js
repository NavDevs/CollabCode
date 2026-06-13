const { clerkMiddleware, requireAuth, clerkClient } = require('@clerk/express');
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
        console.log("Manual verification failed:", e.message);
      }
    }
    // Fallback: check query param token (for full-page redirects like GitHub OAuth)
    if (!clerkId && req.query?.token) {
      try {
        const decoded = await verifyToken(req.query.token, { secretKey: process.env.CLERK_SECRET_KEY });
        clerkId = decoded.sub;
      } catch (e) {
        console.log("Query token verification failed:", e.message);
      }
    }

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let user = await User.findOne({ clerkId });
    if (!user) {
      const cUser = await clerkClient.users.getUser(clerkId);
      const email = cUser.emailAddresses[0]?.emailAddress;
      const username = cUser.username || email?.split('@')[0] || `user_${clerkId.slice(-5)}`;

      user = await User.findOne({ email });
      if (user) {
        user.clerkId = clerkId;
        await user.save();
      } else {
        // Ensure username uniqueness
        let finalUsername = username;
        let suffix = 1;
        while (await User.findOne({ username: finalUsername })) {
          finalUsername = `${username}${suffix}`;
          suffix++;
        }

        user = await User.create({
          clerkId,
          email,
          username: finalUsername,
        });
      }
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth sync error:', error);
    res.status(500).json({ error: 'Internal server error during auth sync.' });
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

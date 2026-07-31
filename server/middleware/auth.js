const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by _id (we will store _id in the JWT payload)
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized — user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);
    return res.status(401).json({ error: 'Unauthorized — invalid token' });
  }
};

module.exports = auth;

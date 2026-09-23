import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
      req.userId = user._id;
    } else {
      req.user = null;
      req.userId = null;
    }
    
    next();
  } catch (error) {
    // If token verification fails, still proceed as guest
    req.user = null;
    req.userId = null;
    next();
  }
};

export default optionalAuth;

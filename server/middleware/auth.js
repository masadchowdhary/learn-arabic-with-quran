import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'অনুগ্রহ করে লগইন করুন (Authentication required)'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ইউজার পাওয়া যায়নি (User not found)'
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'অবৈধ টোকেন (Invalid token)'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'টোকেনের মেয়াদ শেষ (Token expired)'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'সার্ভার ত্রুটি (Server error)'
    });
  }
};

export default auth;

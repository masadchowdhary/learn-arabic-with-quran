import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import Chapter from '../models/Chapter.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
}

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('সঠিক ইমেইল দিন'),
  body('password').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
  body('displayName').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে'
      });
    }

    // Create user
    const user = new User({
      email,
      passwordHash: password,  // Will be hashed by pre-save hook
      displayName: displayName || email.split('@')[0]
    });
    await user.save();

    // Initialize user progress with all 114 chapters
    const chapters = await Chapter.find().sort({ difficultyOrder: 1 }).lean();
    const chapterProgress = chapters.map((ch, index) => ({
      chapterNumber: ch.chapterNumber,
      totalWords: ch.totalWords,
      masteredWords: 0,
      masteryPercentage: 0,
      status: index === 0 ? 'in_progress' : 'locked',  // First surah unlocked
      versesCompleted: []
    }));

    await UserProgress.create({
      userId: user._id,
      chapterProgress,
      verseProgress: [],
      currentChapter: chapters[0]?.chapterNumber || 108
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'একাউন্ট সফলভাবে তৈরি হয়েছে! 🎉',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,

        xp: user.xp,
        level: user.level,
        streak: user.streak
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('সঠিক ইমেইল দিন'),
  body('password').notEmpty().withMessage('পাসওয়ার্ড দিন')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'সফলভাবে লগইন হয়েছে! ✅',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,

        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges,
        dailyGoal: user.dailyGoal
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = req.user;
    const progress = await UserProgress.findOne({ userId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,

        xp: user.xp,
        level: user.level,
        streak: user.streak,
        longestStreak: user.longestStreak,
        badges: user.badges,
        dailyGoal: user.dailyGoal,
        lastPracticeDate: user.lastPracticeDate,
        createdAt: user.createdAt
      },
      progress: progress ? {
        totalWordsLearned: progress.totalWordsLearned,
        totalVersesCompleted: progress.totalVersesCompleted,
        totalChaptersCompleted: progress.totalChaptersCompleted,
        currentChapter: progress.currentChapter
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile settings
 */
router.put('/profile', auth, [
  body('displayName').optional().trim().isLength({ min: 1, max: 50 }),

  body('dailyGoal').optional().isIn([5, 10, 15, 20])
], async (req, res, next) => {
  try {
    const { displayName, dailyGoal } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName;

    if (dailyGoal) updates.dailyGoal = dailyGoal;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });

    res.json({
      success: true,
      message: 'প্রোফাইল আপডেট হয়েছে ✅',
      user: {
        id: user._id,
        displayName: user.displayName,

        dailyGoal: user.dailyGoal
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

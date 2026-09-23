import express from 'express';
import mongoose from 'mongoose';
import MasteredWord from '../models/MasteredWord.js';
import UserProgress from '../models/UserProgress.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/progress/overview
 * Dashboard stats overview
 */
router.get('/overview', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const progress = await UserProgress.findOne({ userId: req.userId });

    if (!progress) {
      return res.json({
        success: true,
        overview: {
          totalWordsLearned: 0,
          totalVersesCompleted: 0,
          totalChaptersCompleted: 0,
          xp: user.xp,
          level: user.level,
          streak: user.streak,
          longestStreak: user.longestStreak,
          currentChapter: null
        }
      });
    }

    // Calculate XP needed for next level
    const currentLevel = user.level;
    const currentLevelXp = Math.floor(50 * currentLevel * (currentLevel + 1) / 2);
    const nextLevelXp = Math.floor(50 * (currentLevel + 1) * (currentLevel + 2) / 2);
    const xpToNextLevel = nextLevelXp - user.xp;
    const levelProgress = ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    res.json({
      success: true,
      overview: {
        totalWordsLearned: progress.totalWordsLearned,
        totalVersesCompleted: progress.totalVersesCompleted,
        totalChaptersCompleted: progress.totalChaptersCompleted,
        totalChapters: 114,
        totalVerses: 6236,
        xp: user.xp,
        level: currentLevel,
        levelProgress: Math.round(Math.max(0, Math.min(100, levelProgress))),
        xpToNextLevel: Math.max(0, xpToNextLevel),
        streak: user.streak,
        longestStreak: user.longestStreak,
        dailyGoal: user.dailyGoal,
        badges: user.badges,
        currentChapter: progress.currentChapter,
        lastPracticeDate: user.lastPracticeDate
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/chapters
 * All surah progress percentages
 */
router.get('/chapters', auth, async (req, res, next) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.userId });

    if (!progress) {
      return res.json({
        success: true,
        chapters: []
      });
    }

    res.json({
      success: true,
      chapters: progress.chapterProgress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/words
 * Mastered words list (paginated)
 */
router.get('/words', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const minLevel = parseInt(req.query.minLevel) || 0;

    const filter = { userId: req.userId };
    if (minLevel > 0) {
      filter.masteryLevel = { $gte: minLevel };
    }
    if (search) {
      filter.$or = [
        { wordArabic: { $regex: search, $options: 'i' } },
        { translationBn: { $regex: search, $options: 'i' } },
        { translationEn: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await MasteredWord.countDocuments(filter);
    const words = await MasteredWord.find(filter)
      .sort({ lastPracticed: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      words
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/progress/stats
 * Detailed stats: XP, level, streak, badges
 */
router.get('/stats', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    // Get mastery distribution
    const masteryDistribution = await MasteredWord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $group: { _id: '$masteryLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get words learned per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActivity = await MasteredWord.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          lastPracticed: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastPracticed' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        longestStreak: user.longestStreak,
        badges: user.badges,
        dailyGoal: user.dailyGoal,
        masteryDistribution,
        dailyActivity
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

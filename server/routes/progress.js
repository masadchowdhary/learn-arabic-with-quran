import express from 'express';
import mongoose from 'mongoose';
import MasteredWord from '../models/MasteredWord.js';
import UserProgress from '../models/UserProgress.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { getChapter } from '../utils/quranCache.js';

const router = express.Router();

/**
 * GET /api/progress/overview
 * Dashboard stats overview
 */
router.get('/overview', auth, async (req, res, next) => {
  try {
    const user = req.user;

    // Run independent queries in parallel; skip the heavy verseProgress array
    const [progress, wordsInProgress] = await Promise.all([
      UserProgress.findOne({ userId: req.userId }, { verseProgress: 0 }).lean(),
      MasteredWord.countDocuments({ userId: req.userId, masteryLevel: { $gte: 1, $lt: 3 } })
    ]);

    if (!progress) {
      return res.json({
        success: true,
        overview: {
          totalWordsLearned: 0,
          wordsInProgress,
          totalVersesCompleted: 0,
          totalChaptersCompleted: 0,
          xp: user.xp,
          level: user.level,
          levelProgress: 0,
          xpToNextLevel: 0,
          streak: user.streak,
          longestStreak: user.longestStreak,
          badges: user.badges,
          currentChapter: null,
          currentChapterProgress: null
        }
      });
    }

    // Calculate XP needed for next level
    const currentLevel = user.level;
    const currentLevelXp = Math.floor(50 * currentLevel * (currentLevel + 1) / 2);
    const nextLevelXp = Math.floor(50 * (currentLevel + 1) * (currentLevel + 2) / 2);
    const xpToNextLevel = nextLevelXp - user.xp;
    const levelProgress = ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    // Current surah progress (for the "continue" card)
    let currentChapterProgress = null;
    if (progress.currentChapter) {
      const cp = progress.chapterProgress.find(c => c.chapterNumber === progress.currentChapter);
      const chapter = await getChapter(progress.currentChapter);
      currentChapterProgress = {
        chapterNumber: progress.currentChapter,
        nameArabic: chapter?.nameArabic || '',
        name: chapter?.nameBengali || chapter?.translatedNameBn || chapter?.nameSimple || '',
        versesCount: chapter?.versesCount || 0,
        masteryPercentage: cp?.masteryPercentage || 0,
        versesCompleted: cp?.versesCompleted?.length || 0,
        status: cp?.status || 'in_progress'
      };
    }

    res.json({
      success: true,
      overview: {
        totalWordsLearned: progress.totalWordsLearned,
        wordsInProgress,
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
        currentVerse: progress.currentVerse,
        currentChapterProgress,
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
 * Uses optionalAuth so public pages (learning path, surah list) can call it
 */
router.get('/chapters', optionalAuth, async (req, res, next) => {
  try {
    // Guest user â€” return empty progress
    if (!req.userId) {
      return res.json({
        success: true,
        chapters: []
      });
    }

    const progress = await UserProgress.findOne(
      { userId: req.userId },
      { chapterProgress: 1 }
    ).lean();

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

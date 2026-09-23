import express from 'express';
import Chapter from '../models/Chapter.js';
import UserProgress from '../models/UserProgress.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/chapters
 * Get all surahs ordered by difficulty
 * Public route (no auth needed for browsing)
 */
router.get('/', async (req, res, next) => {
  try {
    const chapters = await Chapter.find()
      .sort({ difficultyOrder: 1 })
      .lean();

    res.json({
      success: true,
      count: chapters.length,
      chapters
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chapters/:number
 * Get single surah details
 */
router.get('/:number', async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.params.number);

    if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
      return res.status(400).json({
        success: false,
        message: 'সূরা নম্বর ১-১১৪ এর মধ্যে হতে হবে'
      });
    }

    const chapter = await Chapter.findOne({ chapterNumber }).lean();

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'সূরা পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      chapter
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chapters/:number/progress
 * Get user's progress for a specific surah
 * Protected route
 */
router.get('/:number/progress', auth, async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.params.number);

    const progress = await UserProgress.findOne({ userId: req.userId });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'প্রগ্রেস পাওয়া যায়নি'
      });
    }

    const chapterProgress = progress.chapterProgress.find(
      cp => cp.chapterNumber === chapterNumber
    );

    const verseProgress = progress.verseProgress.filter(
      vp => vp.chapterNumber === chapterNumber
    );

    res.json({
      success: true,
      chapterProgress: chapterProgress || {
        chapterNumber,
        totalWords: 0,
        masteredWords: 0,
        masteryPercentage: 0,
        status: 'locked'
      },
      verseProgress
    });
  } catch (error) {
    next(error);
  }
});

export default router;

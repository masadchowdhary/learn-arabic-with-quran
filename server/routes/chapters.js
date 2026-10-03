import express from 'express';
import UserProgress from '../models/UserProgress.js';
import MasteredWord from '../models/MasteredWord.js';
import auth from '../middleware/auth.js';
import {
  getAllChapters,
  getChapter,
  getChapterVerses,
  getVerseWords,
  STATIC_CACHE_HEADER
} from '../utils/quranCache.js';

const router = express.Router();

/**
 * GET /api/chapters
 * Get all surahs ordered by difficulty
 * Public route (no auth needed for browsing)
 */
router.get('/', async (req, res, next) => {
  try {
    const chapters = await getAllChapters();

    res.set('Cache-Control', STATIC_CACHE_HEADER);
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

    const chapter = await getChapter(chapterNumber);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'সূরা পাওয়া যায়নি'
      });
    }

    res.set('Cache-Control', STATIC_CACHE_HEADER);
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
 * Get user's progress for a specific surah.
 * Also returns `wordLevels` — the user's mastery for every word in the surah —
 * so the client can show live per-ayah / per-word progress.
 * Protected route
 */
router.get('/:number/progress', auth, async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.params.number);

    const verses = await getChapterVerses(chapterNumber);
    const chapterWords = new Set();
    for (const verse of verses) {
      for (const w of getVerseWords(verse)) chapterWords.add(w.textArabic);
    }

    const [progress, wordRecords] = await Promise.all([
      UserProgress.findOne(
        { userId: req.userId },
        { chapterProgress: { $elemMatch: { chapterNumber } } }
      ).lean(),
      MasteredWord.find(
        { userId: req.userId, wordArabic: { $in: [...chapterWords] } },
        { wordArabic: 1, masteryLevel: 1, correctCount: 1, _id: 0 }
      ).lean()
    ]);

    const wordLevels = {};
    for (const r of wordRecords) {
      wordLevels[r.wordArabic] = { level: r.masteryLevel, correct: r.correctCount };
    }

    res.json({
      success: true,
      chapterProgress: progress?.chapterProgress?.[0] || {
        chapterNumber,
        totalWords: chapterWords.size,
        masteredWords: 0,
        masteryPercentage: 0,
        status: 'in_progress'
      },
      wordLevels
    });
  } catch (error) {
    next(error);
  }
});

export default router;

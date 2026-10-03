import express from 'express';
import Verse from '../models/Verse.js';
import { getChapterVerses, STATIC_CACHE_HEADER } from '../utils/quranCache.js';

const router = express.Router();

/**
 * GET /api/verses/by-key/:verseKey
 * Get a verse by its key (e.g., "108:1")
 * NOTE: Must be declared before "/:chapterNum/:verseNum", otherwise that
 * route would capture "/by-key/108:1".
 */
router.get('/by-key/:verseKey', async (req, res, next) => {
  try {
    const verse = await Verse.findOne({ verseKey: req.params.verseKey }).lean();

    if (!verse) {
      return res.status(404).json({
        success: false,
        message: 'আয়াত পাওয়া যায়নি'
      });
    }

    res.set('Cache-Control', STATIC_CACHE_HEADER);
    res.json({
      success: true,
      verse
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/verses/:chapterNum
 * Get all verses of a surah with word-by-word data
 */
router.get('/:chapterNum', async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.params.chapterNum);

    if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
      return res.status(400).json({
        success: false,
        message: 'সূরা নম্বর ১-১১৪ এর মধ্যে হতে হবে'
      });
    }

    const verses = await getChapterVerses(chapterNumber);

    if (verses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'এই সূরার আয়াত পাওয়া যায়নি'
      });
    }

    res.set('Cache-Control', STATIC_CACHE_HEADER);
    res.json({
      success: true,
      chapterNumber,
      count: verses.length,
      verses
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/verses/:chapterNum/:verseNum
 * Get a single verse with all word-by-word data
 */
router.get('/:chapterNum/:verseNum', async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.params.chapterNum);
    const verseNumber = parseInt(req.params.verseNum);

    const verses = await getChapterVerses(chapterNumber);
    const verse = verses.find(v => v.verseNumber === verseNumber);

    if (!verse) {
      return res.status(404).json({
        success: false,
        message: 'আয়াত পাওয়া যায়নি'
      });
    }

    res.set('Cache-Control', STATIC_CACHE_HEADER);
    res.json({
      success: true,
      verse
    });
  } catch (error) {
    next(error);
  }
});

export default router;

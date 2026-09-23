import express from 'express';
import Verse from '../models/Verse.js';

const router = express.Router();

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

    const verses = await Verse.find({ chapterNumber })
      .sort({ verseNumber: 1 })
      .lean();

    if (verses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'এই সূরার আয়াত পাওয়া যায়নি'
      });
    }

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

    const verse = await Verse.findOne({ chapterNumber, verseNumber }).lean();

    if (!verse) {
      return res.status(404).json({
        success: false,
        message: 'আয়াত পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      verse
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/verses/by-key/:verseKey
 * Get a verse by its key (e.g., "108:1")
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

    res.json({
      success: true,
      verse
    });
  } catch (error) {
    next(error);
  }
});

export default router;

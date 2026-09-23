import express from 'express';
import Verse from '../models/Verse.js';
import MasteredWord from '../models/MasteredWord.js';
import UserProgress from '../models/UserProgress.js';
import PracticeHistory from '../models/PracticeHistory.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// XP rewards configuration
const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  COMPLETE_VERSE: 50,
  COMPLETE_SURAH: 200,
  DAILY_STREAK: 20,
  PERFECT_SESSION: 30,
  REVIEW_CORRECT: 5
};

/**
 * POST /api/practice/session
 * Generate a practice session (flashcard deck)
 * Body: { chapterNumber, sessionSize (default 10), mode: 'new' | 'review' | 'mixed' }
 */
router.post('/session', auth, async (req, res, next) => {
  try {
    const { chapterNumber, sessionSize = 10, mode = 'mixed' } = req.body;

    if (!chapterNumber) {
      return res.status(400).json({
        success: false,
        message: 'সূরা নম্বর প্রয়োজন'
      });
    }

    // Get all words from this chapter's verses
    const verses = await Verse.find({ chapterNumber }).sort({ verseNumber: 1 }).lean();

    if (verses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'এই সূরার ডেটা পাওয়া যায়নি'
      });
    }

    // Flatten all actual words (not 'end' markers)
    const allWords = [];
    for (const verse of verses) {
      for (const word of verse.words) {
        if (word.charType === 'word') {
          allWords.push({
            ...word,
            verseKey: verse.verseKey,
            chapterNumber: verse.chapterNumber,
            verseNumber: verse.verseNumber
          });
        }
      }
    }

    // Get user's mastered words for this chapter
    const masteredWords = await MasteredWord.find({
      userId: req.userId,
      'appearsIn.chapterNumber': chapterNumber
    }).lean();

    const masteredArabicSet = new Set(masteredWords.map(w => w.wordArabic));

    // Split into new and review words
    const newWords = allWords.filter(w => !masteredArabicSet.has(w.textArabic));
    const reviewWords = masteredWords.filter(
      w => !w.nextReviewDate || new Date(w.nextReviewDate) <= new Date()
    );

    // Build session based on mode
    let sessionWords = [];

    if (mode === 'new') {
      sessionWords = newWords.slice(0, sessionSize);
    } else if (mode === 'review') {
      sessionWords = reviewWords.slice(0, sessionSize).map(w => ({
        textArabic: w.wordArabic,
        translationBn: w.translationBn,
        translationEn: w.translationEn,
        transliteration: w.transliteration,
        masteryLevel: w.masteryLevel,
        isReview: true
      }));
    } else {
      // Mixed: 70% new, 30% review
      const newCount = Math.ceil(sessionSize * 0.7);
      const reviewCount = sessionSize - newCount;

      const selectedNew = newWords.slice(0, newCount);
      const selectedReview = reviewWords.slice(0, reviewCount).map(w => ({
        textArabic: w.wordArabic,
        translationBn: w.translationBn,
        translationEn: w.translationEn,
        transliteration: w.transliteration,
        masteryLevel: w.masteryLevel,
        isReview: true
      }));

      sessionWords = [...selectedNew, ...selectedReview];
    }

    // Shuffle the session
    for (let i = sessionWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sessionWords[i], sessionWords[j]] = [sessionWords[j], sessionWords[i]];
    }

    // Generate MCQ choices for each word
    const sessionWithChoices = sessionWords.map(word => {
      // Get 3 random wrong answers from all words
      const wrongChoices = allWords
        .filter(w => w.textArabic !== word.textArabic)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => ({
          textArabic: w.textArabic,
          translationBn: w.translationBn,
          translationEn: w.translationEn
        }));

      // Add correct answer and shuffle
      const choices = [
        {
          textArabic: word.textArabic,
          translationBn: word.translationBn,
          translationEn: word.translationEn,
          isCorrect: true
        },
        ...wrongChoices.map(c => ({ ...c, isCorrect: false }))
      ].sort(() => Math.random() - 0.5);

      return {
        ...word,
        choices
      };
    });

    res.json({
      success: true,
      session: {
        chapterNumber,
        totalWords: sessionWithChoices.length,
        newWordsCount: sessionWords.filter(w => !w.isReview).length,
        reviewWordsCount: sessionWords.filter(w => w.isReview).length,
        words: sessionWithChoices
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/practice/submit
 * Submit practice session results
 * Body: { chapterNumber, results: [{ wordArabic, correct, verseKey }], duration }
 */
router.post('/submit', auth, async (req, res, next) => {
  try {
    const { chapterNumber, results, duration = 0 } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'ফলাফল ডেটা প্রয়োজন'
      });
    }

    let xpEarned = 0;
    let wordsCorrect = 0;
    const verseKeysSet = new Set();
    const newBadges = [];

    // Process each word result
    for (const result of results) {
      const { wordArabic, correct, verseKey, translationBn, translationEn, transliteration } = result;

      if (!wordArabic) continue;

      if (verseKey) verseKeysSet.add(verseKey);

      // Find or create mastered word entry
      let masteredWord = await MasteredWord.findOne({
        userId: req.userId,
        wordArabic
      });

      if (!masteredWord) {
        masteredWord = new MasteredWord({
          userId: req.userId,
          wordArabic,
          translationBn: translationBn || '',
          translationEn: translationEn || '',
          transliteration: transliteration || '',
          firstEncountered: {
            chapterNumber,
            verseNumber: verseKey ? parseInt(verseKey.split(':')[1]) : 0,
            verseKey: verseKey || ''
          },
          appearsIn: verseKey ? [{
            chapterNumber,
            verseNumber: parseInt(verseKey.split(':')[1]),
            verseKey
          }] : []
        });
      }

      if (correct) {
        masteredWord.correctCount += 1;
        wordsCorrect++;
        xpEarned += masteredWord.masteryLevel >= 4
          ? XP_REWARDS.REVIEW_CORRECT
          : XP_REWARDS.CORRECT_ANSWER;
      } else {
        masteredWord.incorrectCount += 1;
      }

      // Update mastery level and schedule next review
      masteredWord.updateMasteryLevel();
      masteredWord.scheduleNextReview();
      await masteredWord.save();
    }

    // Check for perfect session
    const accuracy = results.length > 0 ? (wordsCorrect / results.length) * 100 : 0;
    if (accuracy === 100 && results.length >= 5) {
      xpEarned += XP_REWARDS.PERFECT_SESSION;
    }

    // Update user XP, level, and streak
    const user = await User.findById(req.userId);
    user.xp += xpEarned;
    user.level = user.calculateLevel();
    user.updateStreak();
    await user.save();

    // Check for badges
    const totalMasteredWords = await MasteredWord.countDocuments({
      userId: req.userId,
      masteryLevel: { $gte: 3 }
    });

    if (totalMasteredWords >= 1 && !user.badges.includes('first_word')) {
      user.badges.push('first_word');
      newBadges.push('🎯 প্রথম শব্দ — First Word!');
      await user.save();
    }
    if (totalMasteredWords >= 100 && !user.badges.includes('century')) {
      user.badges.push('century');
      newBadges.push('🌟 শতক — 100 Words Learned!');
      await user.save();
    }
    if (user.streak >= 7 && !user.badges.includes('streak_7')) {
      user.badges.push('streak_7');
      newBadges.push('🔥 ৭-দিন স্ট্রিক — 7-Day Streak!');
      await user.save();
    }

    // Update user progress
    await updateUserProgress(req.userId, chapterNumber);

    // Save practice history
    await PracticeHistory.create({
      userId: req.userId,
      sessionType: 'flashcard',
      chapterNumber,
      verseKeys: [...verseKeysSet],
      wordsAttempted: results.length,
      wordsCorrect,
      accuracy: Math.round(accuracy),
      xpEarned,
      duration
    });

    res.json({
      success: true,
      message: 'প্রাকটিস সেশন সংরক্ষিত হয়েছে! ✅',
      summary: {
        wordsAttempted: results.length,
        wordsCorrect,
        accuracy: Math.round(accuracy),
        xpEarned,
        totalXp: user.xp,
        level: user.level,
        streak: user.streak,
        newBadges
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/practice/review
 * Get words due for spaced repetition review
 */
router.get('/review', auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const dueWords = await MasteredWord.find({
      userId: req.userId,
      masteryLevel: { $lt: 5 },
      nextReviewDate: { $lte: new Date() }
    })
      .sort({ nextReviewDate: 1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: dueWords.length,
      words: dueWords
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper: Update user progress for a chapter after practice
 */
async function updateUserProgress(userId, chapterNumber) {
  // Count mastered words for this chapter
  const verses = await Verse.find({ chapterNumber }).lean();
  const allWordsInChapter = new Set();
  const verseWordCounts = {};

  for (const verse of verses) {
    const verseWords = verse.words.filter(w => w.charType === 'word');
    verseWordCounts[verse.verseKey] = verseWords.length;
    verseWords.forEach(w => allWordsInChapter.add(w.textArabic));
  }

  const masteredWords = await MasteredWord.find({
    userId,
    wordArabic: { $in: [...allWordsInChapter] },
    masteryLevel: { $gte: 3 }  // "Practiced" or above counts as mastered
  }).lean();

  const masteredSet = new Set(masteredWords.map(w => w.wordArabic));

  // Update chapter progress
  const progress = await UserProgress.findOne({ userId });
  if (!progress) return;

  const chapterIdx = progress.chapterProgress.findIndex(
    cp => cp.chapterNumber === chapterNumber
  );

  if (chapterIdx !== -1) {
    const cp = progress.chapterProgress[chapterIdx];
    cp.masteredWords = masteredSet.size;
    cp.totalWords = allWordsInChapter.size;
    cp.masteryPercentage = allWordsInChapter.size > 0
      ? Math.round((masteredSet.size / allWordsInChapter.size) * 100)
      : 0;

    if (cp.status === 'locked') cp.status = 'in_progress';
    if (!cp.startedAt) cp.startedAt = new Date();

    if (cp.masteryPercentage >= 100) {
      cp.status = 'completed';
      cp.completedAt = new Date();
    }

    // Check if next surah should be unlocked (70% threshold)
    if (cp.masteryPercentage >= 70) {
      const nextIdx = chapterIdx + 1;
      if (nextIdx < progress.chapterProgress.length) {
        if (progress.chapterProgress[nextIdx].status === 'locked') {
          progress.chapterProgress[nextIdx].status = 'in_progress';
        }
      }
    }
  }

  // Update verse progress
  for (const verse of verses) {
    const verseWords = verse.words.filter(w => w.charType === 'word');
    const masteredInVerse = verseWords.filter(w => masteredSet.has(w.textArabic)).length;

    const existingVP = progress.verseProgress.find(vp => vp.verseKey === verse.verseKey);
    if (existingVP) {
      existingVP.masteredWords = masteredInVerse;
      existingVP.totalWords = verseWords.length;
      existingVP.masteryPercentage = verseWords.length > 0
        ? Math.round((masteredInVerse / verseWords.length) * 100)
        : 0;
      existingVP.lastPracticed = new Date();
      existingVP.practiceCount += 1;
      if (existingVP.masteryPercentage >= 100) {
        existingVP.status = 'completed';
      } else if (existingVP.status === 'locked') {
        existingVP.status = 'in_progress';
      }
    } else {
      progress.verseProgress.push({
        verseKey: verse.verseKey,
        chapterNumber,
        verseNumber: verse.verseNumber,
        totalWords: verseWords.length,
        masteredWords: masteredInVerse,
        masteryPercentage: verseWords.length > 0
          ? Math.round((masteredInVerse / verseWords.length) * 100)
          : 0,
        status: masteredInVerse > 0 ? 'in_progress' : 'locked',
        practiceCount: 1,
        lastPracticed: new Date()
      });
    }
  }

  // Update overall stats
  progress.totalWordsLearned = await MasteredWord.countDocuments({
    userId,
    masteryLevel: { $gte: 3 }
  });
  progress.totalVersesCompleted = progress.verseProgress.filter(
    vp => vp.masteryPercentage >= 100
  ).length;
  progress.totalChaptersCompleted = progress.chapterProgress.filter(
    cp => cp.status === 'completed'
  ).length;
  progress.currentChapter = chapterNumber;

  await progress.save();
}

export default router;

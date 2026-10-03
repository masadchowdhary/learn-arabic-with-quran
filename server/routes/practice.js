import express from 'express';
import MasteredWord from '../models/MasteredWord.js';
import UserProgress from '../models/UserProgress.js';
import PracticeHistory from '../models/PracticeHistory.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { getChapterVerses, getChapter, getVerseWords } from '../utils/quranCache.js';

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

// A word counts as "learned" once it reaches this mastery level (3 = Practiced)
const LEARNED_LEVEL = 3;
const MAX_SESSION_SIZE = 20;
const MIN_WORDS_FOR_PERFECT_BONUS = 3;

// ─── Helpers ─────────────────────────────────────────

/**
 * Progress score of a single word (0..1).
 * Learned words count fully; otherwise each correct answer gives partial
 * credit, so progress becomes visible right after the first session.
 */
function wordScore(record) {
  if (!record) return 0;
  if (record.masteryLevel >= LEARNED_LEVEL) return 1;
  return Math.min(record.correctCount || 0, LEARNED_LEVEL - 1) / LEARNED_LEVEL;
}

function uniqueWords(words) {
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (seen.has(w.textArabic)) continue;
    seen.add(w.textArabic);
    out.push(w);
  }
  return out;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Percentage that only reaches 100 when everything is fully learned. */
function progressPercent(score, learned, total) {
  if (total === 0) return 0;
  if (learned === total) return 100;
  return Math.min(99, Math.floor((score / total) * 100));
}

function computeStats(words, wordMap) {
  let score = 0;
  let learned = 0;
  for (const arabic of words) {
    const s = wordScore(wordMap.get(arabic));
    score += s;
    if (s >= 1) learned++;
  }
  return {
    totalWords: words.length,
    masteredWords: learned,
    masteryPercentage: progressPercent(score, learned, words.length),
    completed: words.length > 0 && learned === words.length
  };
}

function verseUniqueArabic(verse) {
  return uniqueWords(getVerseWords(verse)).map(w => w.textArabic);
}

/** Pool of distractor meanings (unique Bengali translations). */
function buildDistractorPool(verses) {
  const seen = new Set();
  const pool = [];
  for (const verse of verses) {
    for (const w of getVerseWords(verse)) {
      const key = (w.translationBn || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      pool.push({ textArabic: w.textArabic, translationBn: key, translationEn: w.translationEn });
    }
  }
  return pool;
}

/** Pick `count` random distractors whose meaning differs from the correct one. */
function pickDistractors(pool, correctKey, count = 3) {
  const picked = [];
  const used = new Set([correctKey]);
  let attempts = 0;
  const maxAttempts = pool.length * 3;

  while (picked.length < count && attempts < maxAttempts) {
    attempts++;
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(candidate.translationBn)) continue;
    used.add(candidate.translationBn);
    picked.push(candidate);
  }
  return picked;
}

// ─── Routes ──────────────────────────────────────────

/**
 * POST /api/practice/session
 * Generate an AYAH-based practice session (flashcard deck).
 * Body: { chapterNumber, verseNumber?, sessionSize (default 10) }
 *  - verseNumber given  → practice the words of that ayah
 *  - verseNumber absent → auto-pick the first ayah that isn't fully learned yet
 * The session is never empty: if every word of the ayah is already learned,
 * they are served again as review.
 */
router.post('/session', optionalAuth, async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.body.chapterNumber);
    const requestedVerse = req.body.verseNumber ? parseInt(req.body.verseNumber) : null;
    const sessionSize = Math.min(Math.max(parseInt(req.body.sessionSize) || 10, 1), MAX_SESSION_SIZE);

    if (!chapterNumber || chapterNumber < 1 || chapterNumber > 114) {
      return res.status(400).json({
        success: false,
        message: 'সূরা নম্বর প্রয়োজন'
      });
    }

    const [verses, chapter] = await Promise.all([
      getChapterVerses(chapterNumber),
      getChapter(chapterNumber)
    ]);

    if (verses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'এই সূরার ডেটা পাওয়া যায়নি'
      });
    }

    // Load the user's word records for this surah (one query)
    let wordMap = new Map();
    if (req.userId) {
      const chapterWords = new Set();
      for (const v of verses) for (const w of getVerseWords(v)) chapterWords.add(w.textArabic);

      const records = await MasteredWord.find(
        { userId: req.userId, wordArabic: { $in: [...chapterWords] } },
        { wordArabic: 1, masteryLevel: 1, correctCount: 1, nextReviewDate: 1, _id: 0 }
      ).lean();
      wordMap = new Map(records.map(r => [r.wordArabic, r]));
    }

    // Pick the ayah
    let verse = null;
    if (requestedVerse) {
      verse = verses.find(v => v.verseNumber === requestedVerse);
      if (!verse) {
        return res.status(404).json({ success: false, message: 'আয়াত পাওয়া যায়নি' });
      }
    } else {
      verse = verses.find(v =>
        getVerseWords(v).some(w => (wordMap.get(w.textArabic)?.masteryLevel || 0) < LEARNED_LEVEL)
      ) || verses[0];
    }

    // Build candidate words for this ayah, ordered by priority
    const now = new Date();
    const candidates = uniqueWords(getVerseWords(verse)).map(w => {
      const rec = wordMap.get(w.textArabic);
      const level = rec?.masteryLevel || 0;
      const learned = level >= LEARNED_LEVEL;
      const due = learned && (!rec.nextReviewDate || new Date(rec.nextReviewDate) <= now);
      return {
        textArabic: w.textArabic,
        translationBn: w.translationBn,
        translationEn: w.translationEn,
        transliteration: w.transliteration,
        audioUrl: w.audioUrl,
        position: w.position,
        verseKey: verse.verseKey,
        verseNumber: verse.verseNumber,
        chapterNumber,
        masteryLevel: level,
        isNew: !rec,
        isReview: learned,
        // 0 = new / still learning, 1 = due for review, 2 = learned (extra practice)
        priority: !learned ? 0 : due ? 1 : 2
      };
    });

    if (candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'এই আয়াতে প্রাকটিস করার মতো শব্দ নেই' });
    }

    candidates.sort((a, b) =>
      a.priority - b.priority || a.masteryLevel - b.masteryLevel || a.position - b.position
    );
    const selected = shuffle(candidates.slice(0, sessionSize));

    // Distractors come from the whole surah (fallback to Al-Fatiha for tiny surahs)
    let pool = buildDistractorPool(verses);
    if (pool.length < 4 && chapterNumber !== 1) {
      pool = pool.concat(buildDistractorPool(await getChapterVerses(1)));
    }

    const words = selected.map(word => {
      const correctKey = (word.translationBn || '').trim();
      const choices = shuffle([
        {
          textArabic: word.textArabic,
          translationBn: word.translationBn,
          translationEn: word.translationEn,
          isCorrect: true
        },
        ...pickDistractors(pool, correctKey).map(c => ({ ...c, isCorrect: false }))
      ]);
      const { priority, ...rest } = word;
      return { ...rest, choices };
    });

    res.json({
      success: true,
      session: {
        chapterNumber,
        chapterNameArabic: chapter?.nameArabic || '',
        chapterName: chapter?.nameBengali || chapter?.translatedNameBn || chapter?.nameSimple || '',
        verseNumber: verse.verseNumber,
        verseKey: verse.verseKey,
        totalVerses: verses.length,
        verseTotalWords: candidates.length,
        totalWords: words.length,
        newWordsCount: words.filter(w => !w.isReview).length,
        reviewWordsCount: words.filter(w => w.isReview).length,
        words
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/practice/submit
 * Submit practice session results
 * Body: { chapterNumber, verseKey?, results: [{ wordArabic, correct, verseKey }], duration }
 * A word may appear more than once in `results` (retries) — attempts are aggregated.
 */
router.post('/submit', optionalAuth, async (req, res, next) => {
  try {
    const chapterNumber = parseInt(req.body.chapterNumber);
    const { results, duration = 0 } = req.body;

    if (!results || !Array.isArray(results) || !chapterNumber) {
      return res.status(400).json({
        success: false,
        message: 'ফলাফল ডেটা প্রয়োজন'
      });
    }

    const validResults = results.filter(r => r && typeof r.wordArabic === 'string' && r.wordArabic);
    const wordsCorrect = validResults.filter(r => r.correct).length;
    const accuracy = validResults.length > 0 ? (wordsCorrect / validResults.length) * 100 : 0;

    if (!req.userId) {
      // Guest user: Just return the summary without saving to DB
      return res.json({
        success: true,
        message: 'প্রাকটিস সেশন সম্পন্ন হয়েছে! প্রগ্রেস সেভ করতে লগইন করুন। 🚀',
        summary: {
          wordsAttempted: validResults.length,
          wordsCorrect,
          accuracy: Math.round(accuracy),
          xpEarned: 0,
          totalXp: 0,
          level: 1,
          streak: 0,
          newBadges: [],
          isGuest: true
        }
      });
    }

    // Aggregate attempts per word
    const byWord = new Map();
    const verseKeysSet = new Set();
    for (const r of validResults) {
      let entry = byWord.get(r.wordArabic);
      if (!entry) {
        entry = { meta: r, correct: 0, incorrect: 0, verseKeys: new Set() };
        byWord.set(r.wordArabic, entry);
      }
      if (r.correct) entry.correct++;
      else entry.incorrect++;
      if (r.verseKey) {
        entry.verseKeys.add(r.verseKey);
        verseKeysSet.add(r.verseKey);
      }
    }

    const [user, existingDocs] = await Promise.all([
      User.findById(req.userId),
      MasteredWord.find({ userId: req.userId, wordArabic: { $in: [...byWord.keys()] } })
    ]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'ইউজার পাওয়া যায়নি (User not found)' });
    }

    // Update word mastery in memory, then save everything in ONE bulk write
    const docMap = new Map(existingDocs.map(d => [d.wordArabic, d]));
    const docsToSave = [];
    let xpEarned = 0;

    for (const [wordArabic, entry] of byWord) {
      const firstVerseKey = [...entry.verseKeys][0] || '';
      let doc = docMap.get(wordArabic);

      if (!doc) {
        doc = new MasteredWord({
          userId: req.userId,
          wordArabic,
          translationBn: entry.meta.translationBn || '',
          translationEn: entry.meta.translationEn || '',
          transliteration: entry.meta.transliteration || '',
          firstEncountered: {
            chapterNumber,
            verseNumber: firstVerseKey ? parseInt(firstVerseKey.split(':')[1]) : 0,
            verseKey: firstVerseKey
          },
          appearsIn: []
        });
      }

      xpEarned += entry.correct * (doc.masteryLevel >= 4 ? XP_REWARDS.REVIEW_CORRECT : XP_REWARDS.CORRECT_ANSWER);
      doc.correctCount += entry.correct;
      doc.incorrectCount += entry.incorrect;

      for (const vk of entry.verseKeys) {
        if (!doc.appearsIn.some(a => a.verseKey === vk)) {
          const [c, v] = vk.split(':').map(Number);
          doc.appearsIn.push({ chapterNumber: c, verseNumber: v, verseKey: vk });
        }
      }

      doc.updateMasteryLevel();
      doc.scheduleNextReview();
      docsToSave.push(doc);
    }

    if (docsToSave.length > 0) {
      await MasteredWord.bulkSave(docsToSave);
    }

    // Recalculate progress + total learned words in parallel
    const [progressResult, totalMasteredWords] = await Promise.all([
      updateUserProgress(req.userId, chapterNumber, verseKeysSet),
      MasteredWord.countDocuments({ userId: req.userId, masteryLevel: { $gte: LEARNED_LEVEL } })
    ]);
    const { progress } = progressResult;
    progress.totalWordsLearned = totalMasteredWords;

    // Bonus XP
    if (accuracy === 100 && validResults.length >= MIN_WORDS_FOR_PERFECT_BONUS) {
      xpEarned += XP_REWARDS.PERFECT_SESSION;
    }
    xpEarned += progressResult.newlyCompletedVerses.length * XP_REWARDS.COMPLETE_VERSE;
    if (progressResult.chapterJustCompleted) xpEarned += XP_REWARDS.COMPLETE_SURAH;

    // Update user XP, level, streak, badges
    user.xp += xpEarned;
    user.level = user.calculateLevel();
    user.updateStreak();

    const newBadges = [];
    if (totalMasteredWords >= 1 && !user.badges.includes('first_word')) {
      user.badges.push('first_word');
      newBadges.push('🎯 প্রথম শব্দ — First Word!');
    }
    if (totalMasteredWords >= 100 && !user.badges.includes('century')) {
      user.badges.push('century');
      newBadges.push('🌟 শতক — 100 Words Learned!');
    }
    if (user.streak >= 7 && !user.badges.includes('streak_7')) {
      user.badges.push('streak_7');
      newBadges.push('🔥 ৭-দিন স্ট্রিক — 7-Day Streak!');
    }

    await Promise.all([
      user.save(),
      progress.save(),
      PracticeHistory.create({
        userId: req.userId,
        sessionType: 'flashcard',
        chapterNumber,
        verseKeys: [...verseKeysSet],
        wordsAttempted: validResults.length,
        wordsCorrect,
        accuracy: Math.round(accuracy),
        xpEarned,
        duration
      })
    ]);

    // Progress info for the summary screen
    const sessionVerseKey = (typeof req.body.verseKey === 'string' && req.body.verseKey) || [...verseKeysSet][0] || null;
    const verseStats = sessionVerseKey ? progressResult.verseStats[sessionVerseKey] : null;

    res.json({
      success: true,
      message: 'প্রাকটিস সেশন সংরক্ষিত হয়েছে! ✅',
      summary: {
        wordsAttempted: validResults.length,
        wordsCorrect,
        accuracy: Math.round(accuracy),
        xpEarned,
        totalXp: user.xp,
        level: user.level,
        streak: user.streak,
        newBadges,
        progress: {
          verse: verseStats ? { verseKey: sessionVerseKey, ...verseStats } : null,
          chapter: progressResult.chapterStats,
          newlyCompletedVerses: progressResult.newlyCompletedVerses,
          chapterJustCompleted: progressResult.chapterJustCompleted
        }
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
 * Helper: Recalculate the user's chapter + verse progress after practice.
 * Returns the (unsaved) progress document plus stats for the summary screen.
 */
async function updateUserProgress(userId, chapterNumber, practicedVerseKeys) {
  const verses = await getChapterVerses(chapterNumber);

  const chapterWordSet = new Set();
  for (const v of verses) for (const w of getVerseWords(v)) chapterWordSet.add(w.textArabic);
  const chapterWords = [...chapterWordSet];

  const [records, existingProgress] = await Promise.all([
    MasteredWord.find(
      { userId, wordArabic: { $in: chapterWords } },
      { wordArabic: 1, masteryLevel: 1, correctCount: 1, _id: 0 }
    ).lean(),
    UserProgress.findOne({ userId })
  ]);

  // Older accounts may not have a progress document — create it on the fly
  const progress = existingProgress || new UserProgress({ userId, chapterProgress: [], verseProgress: [] });
  const wordMap = new Map(records.map(r => [r.wordArabic, r]));
  const now = new Date();

  // ── Verse progress ──
  const existingVP = new Map();
  for (const vp of progress.verseProgress) {
    if (vp.chapterNumber === chapterNumber) existingVP.set(vp.verseKey, vp);
  }

  const verseStats = {};
  const versesCompleted = [];
  const newlyCompletedVerses = [];

  for (const verse of verses) {
    const stats = computeStats(verseUniqueArabic(verse), wordMap);
    verseStats[verse.verseKey] = { verseNumber: verse.verseNumber, ...stats };
    if (stats.completed) versesCompleted.push(verse.verseNumber);

    const practiced = practicedVerseKeys.has(verse.verseKey);
    const vp = existingVP.get(verse.verseKey);

    // Don't store untouched verses
    if (!vp && stats.masteryPercentage === 0 && !practiced) continue;

    const status = stats.completed ? 'completed' : 'in_progress';

    if (!vp) {
      progress.verseProgress.push({
        verseKey: verse.verseKey,
        chapterNumber,
        verseNumber: verse.verseNumber,
        totalWords: stats.totalWords,
        masteredWords: stats.masteredWords,
        masteryPercentage: stats.masteryPercentage,
        status,
        practiceCount: practiced ? 1 : 0,
        lastPracticed: practiced ? now : null,
        completedAt: stats.completed ? now : null
      });
      if (stats.completed) newlyCompletedVerses.push(verse.verseNumber);
    } else {
      const wasCompleted = vp.status === 'completed' || !!vp.completedAt;
      vp.totalWords = stats.totalWords;
      vp.masteredWords = stats.masteredWords;
      vp.masteryPercentage = stats.masteryPercentage;
      vp.status = status;
      if (stats.completed && !vp.completedAt) vp.completedAt = now;
      if (stats.completed && !wasCompleted) newlyCompletedVerses.push(verse.verseNumber);
      if (practiced) {
        vp.practiceCount = (vp.practiceCount || 0) + 1;
        vp.lastPracticed = now;
      }
    }
  }

  // ── Chapter progress ──
  const chapterStatsRaw = computeStats(chapterWords, wordMap);
  let cpIdx = progress.chapterProgress.findIndex(cp => cp.chapterNumber === chapterNumber);
  if (cpIdx === -1) {
    progress.chapterProgress.push({ chapterNumber, status: 'in_progress' });
    cpIdx = progress.chapterProgress.length - 1;
  }
  const cp = progress.chapterProgress[cpIdx];
  const chapterWasCompleted = cp.status === 'completed' || !!cp.completedAt;

  cp.totalWords = chapterStatsRaw.totalWords;
  cp.masteredWords = chapterStatsRaw.masteredWords;
  cp.masteryPercentage = chapterStatsRaw.masteryPercentage;
  cp.versesCompleted = versesCompleted;
  if (!cp.startedAt) cp.startedAt = now;

  let chapterJustCompleted = false;
  if (chapterStatsRaw.completed) {
    cp.status = 'completed';
    if (!cp.completedAt) cp.completedAt = now;
    chapterJustCompleted = !chapterWasCompleted;
  } else {
    cp.status = 'in_progress';
  }

  // Unlock next surah at 70%
  if (cp.masteryPercentage >= 70) {
    const nextCp = progress.chapterProgress[cpIdx + 1];
    if (nextCp && nextCp.status === 'locked') nextCp.status = 'in_progress';
  }

  // ── Overall stats ──
  progress.totalVersesCompleted = progress.verseProgress.filter(vp => vp.status === 'completed').length;
  progress.totalChaptersCompleted = progress.chapterProgress.filter(c => c.status === 'completed').length;
  progress.currentChapter = chapterNumber;
  const lastVerseKey = [...practicedVerseKeys].pop();
  if (lastVerseKey) progress.currentVerse = lastVerseKey;

  return {
    progress,
    verseStats,
    newlyCompletedVerses,
    chapterJustCompleted,
    chapterStats: {
      chapterNumber,
      totalWords: chapterStatsRaw.totalWords,
      masteredWords: chapterStatsRaw.masteredWords,
      masteryPercentage: chapterStatsRaw.masteryPercentage,
      completed: chapterStatsRaw.completed,
      versesCompleted: versesCompleted.length,
      totalVerses: verses.length
    }
  };
}

export default router;

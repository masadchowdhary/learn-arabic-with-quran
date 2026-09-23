import mongoose from 'mongoose';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import MasteredWord from '../models/MasteredWord.js';
import Chapter from '../models/Chapter.js';
import Verse from '../models/Verse.js';
import dotenv from 'dotenv';
dotenv.config();

const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  COMPLETE_VERSE: 50,
  COMPLETE_SURAH: 200,
  DAILY_STREAK: 20,
  PERFECT_SESSION: 30,
  REVIEW_CORRECT: 5
};

async function updateUserProgress(userId, chapterNumber) {
  // Logic extracted from practice.js to manually update progress
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
    masteryLevel: { $gte: 3 }
  }).lean();

  const masteredSet = new Set(masteredWords.map(w => w.wordArabic));
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

    if (cp.masteryPercentage >= 70) {
      const nextIdx = chapterIdx + 1;
      if (nextIdx < progress.chapterProgress.length) {
        if (progress.chapterProgress[nextIdx].status === 'locked') {
          progress.chapterProgress[nextIdx].status = 'in_progress';
        }
      }
    }
  }
  await progress.save();
}

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learn-arabic-quran');
  console.log('Connected to MongoDB');

  // 1. Create Test User
  const testEmail = `test_${Date.now()}@example.com`;
  const user = new User({
    username: 'testuser',
    email: testEmail,
    passwordHash: 'hashed',
    displayName: 'Test User'
  });
  await user.save();

  // Initialize progress (copied from auth.js logic)
  const chapters = await Chapter.find().sort({ difficultyOrder: 1 }).lean();
  const progress = new UserProgress({
    userId: user._id,
    chapterProgress: chapters.map((ch, idx) => ({
      chapterNumber: ch.chapterNumber,
      totalWords: ch.totalWords || 0,
      masteredWords: 0,
      masteryPercentage: 0,
      status: idx === 0 ? 'in_progress' : 'locked'
    }))
  });
  await progress.save();

  console.log('D1: User & Progress initialized. Total Chapters:', progress.chapterProgress.length);

  // 2. Simulate 70% Mastery on Al-Kawthar (Chapter 108)
  const verses = await Verse.find({ chapterNumber: 108 }).lean();
  let words = [];
  verses.forEach(v => {
    words = words.concat(v.words.filter(w => w.charType === 'word').map(w => ({ wordArabic: w.textArabic, verseKey: v.verseKey })));
  });

  // Master 70% of words (approx 7 out of 10 for Al-Kawthar)
  for (let i = 0; i < 7; i++) {
    const mw = new MasteredWord({
      userId: user._id,
      wordArabic: words[i].wordArabic,
      masteryLevel: 3, // level 3 triggers "practiced/mastered" in logic
      correctCount: 4,
      firstEncountered: { chapterNumber: 108, verseNumber: parseInt(words[i].verseKey.split(':')[1]), verseKey: words[i].verseKey }
    });
    await mw.save();
  }

  await updateUserProgress(user._id, 108);

  const updatedProgress = await UserProgress.findOne({ userId: user._id });
  const kawthar = updatedProgress.chapterProgress.find(c => c.chapterNumber === 108);
  const nextSurah = updatedProgress.chapterProgress.find(c => c.chapterNumber === chapters[1].chapterNumber);
  
  console.log(`D2: Al-Kawthar Mastery: ${kawthar.masteryPercentage}%. Status: ${kawthar.status}`);
  console.log(`D2: Next Surah (${nextSurah.chapterNumber}) Status: ${nextSurah.status}`);

  // 3. Test badges and streak
  user.badges.push('first_word', 'perfect_session');
  user.streak = 7;
  user.badges.push('streak_7');
  user.xp = 1500;
  user.level = user.calculateLevel();
  await user.save();
  console.log(`D3: User Level: ${user.level}, Badges: ${user.badges.join(', ')}`);

  // 4. Test spaced repetition
  const reviewWord = new MasteredWord({
    userId: user._id,
    wordArabic: words[8].wordArabic,
    masteryLevel: 2,
    nextReviewDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
  });
  await reviewWord.save();

  const dueWords = await MasteredWord.find({
    userId: user._id,
    masteryLevel: { $lt: 5 },
    nextReviewDate: { $lte: new Date() }
  });
  console.log(`D4: Spaced repetition words due: ${dueWords.length}`);

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await UserProgress.deleteOne({ userId: user._id });
  await MasteredWord.deleteMany({ userId: user._id });

  console.log('Test completed successfully.');
  process.exit(0);
}

runTests().catch(console.error);

import mongoose from 'mongoose';

const chapterProgressSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true
  },
  totalWords: {
    type: Number,
    default: 0
  },
  masteredWords: {
    type: Number,
    default: 0
  },
  masteryPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['locked', 'in_progress', 'completed'],
    default: 'locked'
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  versesCompleted: {
    type: [Number],
    default: []
  }
}, { _id: false });

const verseProgressSchema = new mongoose.Schema({
  verseKey: {
    type: String,
    required: true  // "108:1"
  },
  chapterNumber: {
    type: Number,
    required: true
  },
  verseNumber: {
    type: Number,
    required: true
  },
  totalWords: {
    type: Number,
    default: 0
  },
  masteredWords: {
    type: Number,
    default: 0
  },
  masteryPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['locked', 'in_progress', 'completed'],
    default: 'locked'
  },
  practiceCount: {
    type: Number,
    default: 0
  },
  lastPracticed: {
    type: Date,
    default: null
  }
}, { _id: false });

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  chapterProgress: [chapterProgressSchema],
  verseProgress: [verseProgressSchema],

  // Overall stats
  totalWordsLearned: {
    type: Number,
    default: 0
  },
  totalVersesCompleted: {
    type: Number,
    default: 0
  },
  totalChaptersCompleted: {
    type: Number,
    default: 0
  },
  currentChapter: {
    type: Number,
    default: null  // Currently active surah number
  },
  currentVerse: {
    type: String,
    default: null  // Currently active verse key
  }
}, {
  timestamps: true
});

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

export default UserProgress;

import mongoose from 'mongoose';

const masteredWordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wordArabic: {
    type: String,
    required: true
  },
  translationBn: {
    type: String,
    default: ''
  },
  translationEn: {
    type: String,
    default: ''
  },
  transliteration: {
    type: String,
    default: ''
  },

  // Spaced repetition data
  masteryLevel: {
    type: Number,
    default: 0,  // 0=new, 1=introduced, 2=familiar, 3=practiced, 4=strong, 5=mastered
    min: 0,
    max: 5
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  lastPracticed: {
    type: Date,
    default: null
  },
  nextReviewDate: {
    type: Date,
    default: null
  },

  // Source tracking
  firstEncountered: {
    chapterNumber: Number,
    verseNumber: Number,
    verseKey: String
  },
  appearsIn: [{
    chapterNumber: Number,
    verseNumber: Number,
    verseKey: String,
    _id: false
  }]
}, {
  timestamps: true
});

// Compound unique index: one entry per user per word
masteredWordSchema.index({ userId: 1, wordArabic: 1 }, { unique: true });
masteredWordSchema.index({ userId: 1, masteryLevel: 1 });
masteredWordSchema.index({ userId: 1, nextReviewDate: 1 });

// Calculate mastery level based on correct/incorrect counts
masteredWordSchema.methods.updateMasteryLevel = function () {
  const ratio = this.correctCount / Math.max(1, this.correctCount + this.incorrectCount);

  if (this.correctCount >= 8 && ratio >= 0.9) {
    this.masteryLevel = 5;  // Mastered
  } else if (this.correctCount >= 5 && ratio >= 0.8) {
    this.masteryLevel = 4;  // Strong
  } else if (this.correctCount >= 3 && ratio >= 0.6) {
    this.masteryLevel = 3;  // Practiced
  } else if (this.correctCount >= 1) {
    this.masteryLevel = 2;  // Familiar
  } else {
    this.masteryLevel = 1;  // Introduced
  }
};

// Calculate next review date using spaced repetition intervals
masteredWordSchema.methods.scheduleNextReview = function () {
  const intervals = {
    0: 0,       // New: review immediately
    1: 1,       // Introduced: 1 day
    2: 3,       // Familiar: 3 days
    3: 7,       // Practiced: 1 week
    4: 14,      // Strong: 2 weeks
    5: 30       // Mastered: 1 month
  };

  const daysUntilReview = intervals[this.masteryLevel] || 1;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysUntilReview);
  this.nextReviewDate = nextDate;
  this.lastPracticed = new Date();
};

const MasteredWord = mongoose.model('MasteredWord', masteredWordSchema);

export default MasteredWord;

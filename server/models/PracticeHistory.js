import mongoose from 'mongoose';

const practiceHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionDate: {
    type: Date,
    default: Date.now
  },
  sessionType: {
    type: String,
    enum: ['flashcard', 'quiz', 'match', 'review'],
    required: true
  },
  chapterNumber: {
    type: Number,
    default: null
  },
  verseKeys: {
    type: [String],
    default: []
  },
  wordsAttempted: {
    type: Number,
    default: 0
  },
  wordsCorrect: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0  // Percentage
  },
  xpEarned: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0  // Seconds
  }
}, {
  timestamps: true
});

practiceHistorySchema.index({ userId: 1, sessionDate: -1 });
practiceHistorySchema.index({ userId: 1, chapterNumber: 1 });

const PracticeHistory = mongoose.model('PracticeHistory', practiceHistorySchema);

export default PracticeHistory;

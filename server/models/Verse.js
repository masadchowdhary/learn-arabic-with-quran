import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: true
  },
  textArabic: {
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
  audioUrl: {
    type: String,
    default: ''
  },
  charType: {
    type: String,
    enum: ['word', 'end'],
    default: 'word'
  }
}, { _id: false });

const verseSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 114
  },
  verseNumber: {
    type: Number,
    required: true
  },
  verseKey: {
    type: String,
    required: true,
    unique: true  // e.g., "108:1"
  },
  textArabic: {
    type: String,
    default: ''
  },
  translationBn: {
    type: String,
    default: ''
  },
  translationEn: {
    type: String,
    default: ''
  },
  totalWords: {
    type: Number,
    default: 0  // Count of actual words (excluding 'end' markers)
  },
  audioUrl: {
    type: String,
    default: ''
  },
  juzNumber: {
    type: Number,
    default: 0
  },
  hizbNumber: {
    type: Number,
    default: 0
  },
  pageNumber: {
    type: Number,
    default: 0
  },
  words: [wordSchema]
}, {
  timestamps: true
});

// Compound index for fast chapter + verse lookups
verseSchema.index({ chapterNumber: 1, verseNumber: 1 });
verseSchema.index({ chapterNumber: 1 });

const Verse = mongoose.model('Verse', verseSchema);

export default Verse;

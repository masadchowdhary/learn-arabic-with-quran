import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 114
  },
  nameArabic: {
    type: String,
    required: true
  },
  nameBengali: {
    type: String,
    default: ''
  },
  nameEnglish: {
    type: String,
    required: true
  },
  nameSimple: {
    type: String,
    required: true
  },
  translatedNameBn: {
    type: String,
    default: ''
  },
  translatedNameEn: {
    type: String,
    default: ''
  },
  versesCount: {
    type: Number,
    required: true
  },
  revelationType: {
    type: String,
    enum: ['meccan', 'medinan', 'makkah', 'madinah'],
    required: true
  },
  difficultyOrder: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 114
  },
  totalWords: {
    type: Number,
    default: 0
  },
  juzNumbers: {
    type: [Number],
    default: []
  },
  pages: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true
});

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;

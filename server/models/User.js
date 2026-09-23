import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'ইউজারনেম প্রয়োজন'],
    unique: true,
    trim: true,
    minlength: [3, 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে'],
    maxlength: [30, 'ইউজারনেম সর্বোচ্চ ৩০ অক্ষরের হতে পারবে']
  },
  email: {
    type: String,
    required: [true, 'ইমেইল প্রয়োজন'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'সঠিক ইমেইল দিন']
  },
  passwordHash: {
    type: String,
    required: true,
    select: false  // Don't return password by default
  },
  displayName: {
    type: String,
    default: ''
  },
  preferredLanguage: {
    type: String,
    enum: ['bn', 'en'],
    default: 'bn'
  },

  // Gamification
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  streak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastPracticeDate: {
    type: Date,
    default: null
  },
  badges: {
    type: [String],
    default: []
  },

  // Settings
  dailyGoal: {
    type: Number,
    default: 10,  // Words per day
    enum: [5, 10, 15, 20]
  },
  notifications: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Calculate level from XP
userSchema.methods.calculateLevel = function () {
  // Formula: xpRequired(level) = 50 * level * (level + 1) / 2
  // Inverse: level ≈ sqrt(2 * xp / 50)
  let level = 1;
  let xpNeeded = 0;
  while (xpNeeded <= this.xp) {
    level++;
    xpNeeded = Math.floor(50 * level * (level + 1) / 2);
  }
  return level - 1;
};

// Update streak
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.lastPracticeDate) {
    this.streak = 1;
  } else {
    const lastDate = new Date(this.lastPracticeDate);
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this.streak += 1;
    } else if (diffDays > 1) {
      this.streak = 1;  // Reset streak
    }
    // diffDays === 0 means same day, streak stays
  }

  if (this.streak > this.longestStreak) {
    this.longestStreak = this.streak;
  }

  this.lastPracticeDate = now;
};

const User = mongoose.model('User', userSchema);

export default User;

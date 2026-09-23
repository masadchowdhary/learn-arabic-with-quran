# 🕌 Learn Arabic with Quran — Master Implementation Plan

> **Project Type:** MERN Stack (MongoDB, Express.js, React, Node.js)
> **Goal:** A Duolingo-style gamified Arabic learning platform powered by Quran word-by-word data
> **Languages:** Arabic → Bengali + English (word-by-word & full verse)

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Data Strategy & Sources](#2-data-strategy--sources)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Database Schema Design](#4-database-schema-design)
5. [Feature Breakdown (All 7 Features)](#5-feature-breakdown-all-7-features)
6. [Surah Ordering & Difficulty System](#6-surah-ordering--difficulty-system)
7. [Gamification & Leveling System](#7-gamification--leveling-system)
8. [API Endpoints Design](#8-api-endpoints-design)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Phased Implementation Plan](#10-phased-implementation-plan)
11. [Progress Tracking Rules](#11-progress-tracking-rules)

---

## 1. Project Overview

### What This App Does
A web application where users learn Arabic through the Quran — word by word. Each Arabic word is presented with:
- **Bengali translation** (অক্ষর ভিত্তিক বাংলা অনুবাদ)
- **English translation** (word-by-word English meaning)
- **Transliteration** (English phonetic representation of Arabic)
- **Full verse/sentence translation** in both Bengali and English
- **Audio** for each word

Users progress through surahs ordered from easiest/shortest to longest, using flashcard-based practice, and the system tracks every word they've mastered.

### Core Philosophy
- Start with the **shortest and easiest** surahs (Juz Amma, working backward)
- **Every single surah** (114) and **every single ayah** (6236) must be coverable
- Duolingo-like **progressive leveling** with XP, streaks, and achievements
- User's **mastered word database** drives personalized recommendations

---

## 2. Data Strategy & Sources

### Primary Data Source: Quran.com API v4
**Base URL:** `https://api.quran.com/api/v4`

#### Word-by-Word Data (Bengali)
```
GET /verses/by_chapter/{chapter_number}?language=bn&words=true&per_page=50
```
**Response structure per word:**
```json
{
  "id": 276,
  "position": 1,
  "audio_url": "wbw/108_001_001.mp3",
  "char_type_name": "word",        // "word" or "end" (verse marker)
  "text": "ﮆ",                     // Arabic display text
  "translation": {
    "text": "নিশ্চয়ই আমরা",        // Bengali word meaning
    "language_name": "bengali"
  },
  "transliteration": {
    "text": "innā",                 // English phonetic
    "language_name": "english"
  }
}
```

#### Word-by-Word Data (English)
```
GET /verses/by_chapter/{chapter_number}?language=en&words=true&per_page=50
```
Same structure but `translation.text` returns English meaning like `"Indeed, We"`.

#### Full Verse Translation
```
GET /verses/by_chapter/{chapter_number}?translations={id}&per_page=50
```
- **Bengali Translation IDs to discover:** Call `GET /resources/translations` and filter for `language_name: "bengali"` (e.g., Muhiuddin Khan, Dr. Abu Bakr Muhammad Zakaria)
- **English Translation IDs:** `20` (Saheeh International), `85` (Abdel Haleem)

#### Chapters/Surah Metadata
```
GET /chapters?language=bn
```
Returns all 114 surahs with names (Arabic, Bengali, English), verse counts, revelation type, etc.

### Data Ingestion Strategy

> [!IMPORTANT]
> **DO NOT call the API at runtime for every user request.** Instead, build a **data seeding pipeline** that fetches ALL data once and stores it in MongoDB.

#### Seeding Pipeline Steps:
1. **Fetch all 114 chapters** metadata → store in `chapters` collection
2. **For each chapter**, fetch all verses with `words=true` in both `language=bn` and `language=en`
3. **Merge** Bengali and English word translations into a unified word document
4. **Fetch full verse translations** (Bengali + English) using translation resource IDs
5. **Store everything** in MongoDB with proper indexing
6. **Generate a static JSON backup** in `/server/data/` for disaster recovery

### Alternative/Supplementary Sources
- **Tanzil.net** — Clean Uthmani Arabic text files
- **kmaslesa/holy-quran-word-by-word-full-data** — npm package with WBW data + audio paths
- **fawazahmed0/quran-api** — CDN-hosted `ben-muhiuddinkhan` edition for Bengali

### Audio Strategy
- Word-by-word audio: `https://audio.qurancdn.com/{audio_url}` (from API response)
- Full verse audio: `https://api.quran.com/api/v4/recitations/{reciter_id}/by_chapter/{chapter}`

---

## 3. Architecture & Tech Stack

### Backend (Server)
```
/server
├── config/
│   ├── db.js              # MongoDB connection
│   └── env.js             # Environment variables
├── models/
│   ├── Chapter.js          # Surah metadata
│   ├── Verse.js            # Ayah with words
│   ├── Word.js             # Individual word (Arabic + translations)
│   ├── User.js             # User profile + auth
│   ├── UserProgress.js     # Per-surah/ayah mastery tracking
│   ├── MasteredWord.js     # User's mastered vocabulary
│   └── Level.js            # Level/XP configuration
├── routes/
│   ├── auth.js             # Registration, Login, JWT
│   ├── chapters.js         # Surah listing & metadata
│   ├── verses.js           # Ayah data with words
│   ├── practice.js         # Flashcard session generation
│   ├── progress.js         # User progress & mastery
│   └── leaderboard.js      # Gamification endpoints
├── middleware/
│   ├── auth.js             # JWT verification
│   └── errorHandler.js     # Global error handler
├── scripts/
│   └── seedQuranData.js    # Data ingestion from Quran.com API
├── utils/
│   └── apiHelpers.js       # Quran API wrapper functions
├── server.js               # Express app entry point
└── package.json
```

### Frontend (Client)
```
/client
├── public/
├── src/
│   ├── api/                # Axios API service layer
│   ├── components/
│   │   ├── common/         # Header, Footer, Navbar, Loading
│   │   ├── flashcard/      # FlashCard, FlashCardDeck, FlashCardResult
│   │   ├── practice/       # Quiz, MatchWords, FillBlank
│   │   ├── progress/       # ProgressBar, SurahProgress, LevelBadge
│   │   ├── quran/          # AyahDisplay, WordCard, SurahCard
│   │   └── auth/           # Login, Register, Profile
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── SurahList.jsx
│   │   ├── AyahView.jsx
│   │   ├── PracticeSession.jsx
│   │   ├── FlashcardPractice.jsx
│   │   ├── Profile.jsx
│   │   └── Leaderboard.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ProgressContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useProgress.js
│   ├── utils/
│   │   └── helpers.js
│   ├── styles/
│   │   └── index.css       # Global styles + design system
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

### Tech Stack Details
| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + Vite | Fast dev, modern tooling |
| **Styling** | Vanilla CSS (custom design system) | Full control, premium look |
| **State** | React Context + useReducer | Sufficient for this scope |
| **Routing** | React Router v6 | Standard SPA routing |
| **HTTP Client** | Axios | Interceptors, clean API |
| **Backend** | Express.js | Lightweight, flexible |
| **Database** | MongoDB + Mongoose | Schema flexibility for Quran data |
| **Auth** | JWT + bcrypt | Stateless authentication |
| **Audio** | HTML5 Audio API | Built-in browser support |

---

## 4. Database Schema Design

### `chapters` Collection
```js
{
  _id: ObjectId,
  chapterNumber: Number,         // 1-114
  nameArabic: String,            // "الفاتحة"
  nameBengali: String,           // "আল-ফাতিহা"
  nameEnglish: String,           // "Al-Fatihah"
  nameSimple: String,            // "Al-Fatihah"
  translatedNameBn: String,      // "সূচনা"
  translatedNameEn: String,      // "The Opening"
  versesCount: Number,           // 7
  revelationType: String,        // "meccan" or "medinan"
  difficultyOrder: Number,       // 1-114 (custom order by difficulty)
  totalWords: Number,            // Pre-calculated unique word count
  juzNumber: Number,
  pages: [Number]
}
```

### `verses` Collection
```js
{
  _id: ObjectId,
  chapterNumber: Number,
  verseNumber: Number,
  verseKey: String,              // "108:1"
  textArabic: String,            // Full Arabic text (Uthmani)
  translationBn: String,         // Full Bengali translation
  translationEn: String,         // Full English translation
  totalWords: Number,            // Word count (excluding end markers)
  audioUrl: String,              // Full verse audio
  words: [{
    position: Number,            // Word order in verse
    textArabic: String,          // Arabic word
    translationBn: String,       // Bengali word meaning
    translationEn: String,       // English word meaning
    transliteration: String,     // English phonetic ("innā")
    audioUrl: String,            // Word-level audio
    charType: String,            // "word" or "end"
    rootWord: String             // Arabic root (if available)
  }]
}
```

### `users` Collection
```js
{
  _id: ObjectId,
  username: String,
  email: String,
  passwordHash: String,
  displayName: String,
  preferredLanguage: String,     // "bn" or "en"
  createdAt: Date,
  lastActive: Date,
  
  // Gamification
  xp: Number,                   // Total experience points
  level: Number,                 // Current level (1-100+)
  streak: Number,                // Consecutive days active
  longestStreak: Number,
  lastPracticeDate: Date,
  badges: [String],              // Achievement badges earned
  
  // Settings
  dailyGoal: Number,             // Words per day target (5/10/15/20)
  notifications: Boolean
}
```

### `masteredWords` Collection
```js
{
  _id: ObjectId,
  userId: ObjectId,              // ref: users
  wordArabic: String,            // The Arabic word
  translationBn: String,
  translationEn: String,
  transliteration: String,
  
  // Spaced repetition data
  masteryLevel: Number,          // 0-5 (0=new, 5=mastered)
  correctCount: Number,          // Times answered correctly
  incorrectCount: Number,
  lastPracticed: Date,
  nextReviewDate: Date,          // Spaced repetition scheduling
  
  // Source tracking
  firstEncountered: {
    chapterNumber: Number,
    verseNumber: Number,
    verseKey: String
  },
  appearsIn: [{                  // All verses containing this word
    chapterNumber: Number,
    verseNumber: Number,
    verseKey: String
  }]
}
```

### `userProgress` Collection
```js
{
  _id: ObjectId,
  userId: ObjectId,
  
  // Chapter-level progress
  chapterProgress: [{
    chapterNumber: Number,
    totalWords: Number,
    masteredWords: Number,
    masteryPercentage: Number,   // (masteredWords / totalWords) * 100
    status: String,              // "locked" | "in_progress" | "completed"
    startedAt: Date,
    completedAt: Date,
    versesCompleted: [Number]    // List of completed verse numbers
  }],
  
  // Verse-level progress
  verseProgress: [{
    verseKey: String,            // "108:1"
    chapterNumber: Number,
    verseNumber: Number,
    totalWords: Number,
    masteredWords: Number,
    masteryPercentage: Number,
    status: String,              // "locked" | "in_progress" | "completed"
    practiceCount: Number,       // How many times practiced
    lastPracticed: Date
  }],
  
  // Overall stats
  totalWordsLearned: Number,
  totalVersesCompleted: Number,
  totalChaptersCompleted: Number,
  currentChapter: Number,        // Currently active surah
  currentVerse: String           // Currently active verse key
}
```

### `practiceHistory` Collection
```js
{
  _id: ObjectId,
  userId: ObjectId,
  sessionDate: Date,
  sessionType: String,           // "flashcard" | "quiz" | "match" | "review"
  chapterNumber: Number,
  verseKeys: [String],           // Verses practiced in this session
  wordsAttempted: Number,
  wordsCorrect: Number,
  accuracy: Number,              // Percentage
  xpEarned: Number,
  duration: Number               // Seconds
}
```

---

## 5. Feature Breakdown (All 7 Features)

### Feature 1: Word-by-Word Translation Database (অক্ষর ভিত্তিক অনুবাদ)
**Requirement:** Arabic → Bengali + English, letter/word level

**Implementation:**
- Run `seedQuranData.js` script to fetch from Quran.com API v4
- For **each of 114 surahs**, make 2 API calls:
  - `?language=bn&words=true` → Bengali word meanings
  - `?language=en&words=true` → English word meanings
- Merge into unified `verses` documents with `words[]` array
- Each word object has: `textArabic`, `translationBn`, `translationEn`, `transliteration`, `audioUrl`
- Store in MongoDB `verses` collection
- Export as JSON backup to `/server/data/quran-wbw-complete.json`

**Seed Script Pseudocode:**
```js
for (let chapter = 1; chapter <= 114; chapter++) {
  const bnData = await fetchFromAPI(chapter, 'bn');
  const enData = await fetchFromAPI(chapter, 'en');
  const merged = mergeWordData(bnData, enData);
  await Verse.insertMany(merged);
  // Rate limiting: wait 1 second between requests
  await delay(1000);
}
```

### Feature 2: Full Verse Translation (সম্পূর্ণ আয়াত অনুবাদ)
**Requirement:** Complete sentence translation in Bengali + English

**Implementation:**
- Fetch using translation resource IDs from `GET /resources/translations`
- Bengali: Use available Bengali translator IDs (discover dynamically)
- English: Use `20` (Saheeh International) or `85` (Abdel Haleem)
- Store `translationBn` and `translationEn` fields on each `verse` document
- Display below word-by-word section on AyahView page

### Feature 3: Difficulty-Based Ordering (সবচেয়ে ছোট/সহজ দিয়ে শুরু)
**Requirement:** Start with shortest/easiest surahs

**Implementation — Custom Difficulty Order:**

| Order | Surah # | Name | Ayahs | Rationale |
|-------|---------|------|-------|-----------|
| 1 | 108 | Al-Kawthar | 3 | Shortest, 3 unique words |
| 2 | 103 | Al-Asr | 3 | Short, simple vocabulary |
| 3 | 110 | An-Nasr | 3 | Familiar words |
| 4 | 112 | Al-Ikhlas | 4 | Most memorized surah |
| 5 | 1 | Al-Fatihah | 7 | Required for daily prayer |
| 6 | 106 | Quraysh | 4 | Short, thematic |
| 7 | 113 | Al-Falaq | 5 | Protection surah |
| 8 | 114 | An-Nas | 6 | Protection surah pair |
| 9 | 105 | Al-Fil | 5 | Narrative, easy vocab |
| 10 | 107 | Al-Ma'un | 7 | Social theme |
| ... | ... | ... | ... | Continue all 114 surahs |

- Store `difficultyOrder` field on each `chapter` document
- Order surahs primarily by **verse count** (ascending), then by common usage
- All 114 surahs MUST have a unique `difficultyOrder` value (1-114)

### Feature 4: User Profile & Mastered Words (ব্যবহারকারীর প্রফাইল)
**Requirement:** Personal database tracking mastered vocabulary

**Implementation:**
- **Registration/Login** with JWT authentication
- **Profile Dashboard** showing:
  - Total words learned / Total unique Quran words
  - Overall mastery percentage
  - Current level & XP
  - Streak counter
  - Daily practice goal progress
- **Mastered Words List:**
  - Searchable/filterable list of all words the user has learned
  - Each word shows: Arabic, Bengali meaning, English meaning, transliteration
  - Mastery level indicator (0-5 stars)
  - "Appears in" list showing all verses containing this word
- **Word Mastery Algorithm:**
  - A word moves from level 0 → 5 based on correct answers
  - Level 0: New word (never seen)
  - Level 1: Introduced (seen once)
  - Level 2: Familiar (1-2 correct)
  - Level 3: Practiced (3-4 correct, fewer mistakes)
  - Level 4: Strong (5+ correct, rare mistakes)
  - Level 5: Mastered (8+ correct, no recent mistakes)

### Feature 5: Percentage-Based Practice & Flashcards (শতাংশ ভিত্তিক প্রাকটিস)
**Requirement:** Show mastery % per surah/ayah, flashcard practice

**Implementation:**

#### Mastery Calculation
```js
// Per Verse
verseMastery = (masteredWordsInVerse / totalWordsInVerse) * 100

// Per Surah  
surahMastery = (totalMasteredWordsInSurah / totalWordsInSurah) * 100
```

#### Flashcard Types
1. **Arabic → Bengali:** Show Arabic word, user guesses Bengali meaning
2. **Arabic → English:** Show Arabic word, user guesses English meaning
3. **Bengali → Arabic:** Show Bengali, user selects correct Arabic word
4. **Audio → Word:** Play audio, user identifies the word
5. **Transliteration → Arabic:** Show romanized text, match to Arabic

#### Flashcard Session Generation Algorithm
```js
function generateSession(userId, chapterNumber, sessionSize = 10) {
  // 70% new words (from current verse/surah)
  // 30% review words (mastery level < 5, due for review)
  const newWords = getUnlearnedWords(userId, chapterNumber, Math.ceil(sessionSize * 0.7));
  const reviewWords = getReviewDueWords(userId, Math.floor(sessionSize * 0.3));
  return shuffle([...newWords, ...reviewWords]);
}
```

#### Practice Session Flow
1. User selects a surah or "Continue Learning"
2. System generates a session of 10-15 words
3. Each word is presented as a flashcard with 4 choices (MCQ)
4. Correct → XP awarded, mastery level increases
5. Wrong → Word is re-queued for retry
6. Session ends → Summary screen with stats
7. Progress saved to `userProgress` and `masteredWords`

### Feature 6: Duolingo-Style Progressive Leveling (ক্রমান্বয়ে লেভেল বৃদ্ধি)
**Requirement:** Level up progressively, complete ayahs and surahs

**Implementation:**

#### XP System
| Action | XP Earned |
|--------|----------|
| Correct flashcard answer | +10 XP |
| Complete a verse (all words mastered) | +50 XP |
| Complete a surah (all verses mastered) | +200 XP |
| Daily streak bonus | +20 XP |
| Perfect session (100% accuracy) | +30 XP bonus |
| Review mastered word correctly | +5 XP |

#### Level Progression
```
Level 1:   0 XP      (Beginner - البداية)
Level 2:   100 XP    (Learner - المتعلم)
Level 3:   300 XP
Level 4:   600 XP
Level 5:   1000 XP   (Explorer - المستكشف)
Level 10:  5000 XP   (Scholar - العالم)
Level 20:  20000 XP  (Hafiz in Training - الحافظ المتدرب)
Level 50:  100000 XP (Master - الأستاذ)
```
Formula: `xpRequired(level) = Math.floor(50 * level * (level + 1) / 2)`

#### Streak System
- Track consecutive days with at least 1 practice session
- Display streak fire emoji 🔥 on dashboard
- Streak freeze: Allow 1 missed day per week without losing streak

#### Surah Unlocking
- Start with **only Surah Al-Kawthar (108)** unlocked
- Each surah unlocks after the previous one reaches **70% mastery** OR is fully completed
- Users can always review previously completed surahs

### Feature 7: Complete Coverage Guarantee (সকল সুরা ও আয়াত নিশ্চিতকরণ)
**Requirement:** All 114 surahs, all 6236 ayahs must be practicable

**Implementation:**

#### Data Integrity Checks (in seed script)
```js
// Verify all 114 chapters exist
assert(await Chapter.countDocuments() === 114);

// Verify total verse count
const totalVerses = await Verse.countDocuments();
assert(totalVerses === 6236);

// Verify each chapter has correct verse count
for (const chapter of chapters) {
  const count = await Verse.countDocuments({ chapterNumber: chapter.chapterNumber });
  assert(count === chapter.versesCount);
}

// Verify every verse has words
const versesWithoutWords = await Verse.find({ 'words.0': { $exists: false } });
assert(versesWithoutWords.length === 0);
```

#### User Coverage Tracking
- `userProgress.chapterProgress` array MUST have entries for all 114 chapters
- Initialize with `status: "locked"` for all except the first
- `verseProgress` entries created lazily when user starts a surah
- Dashboard shows: **"X / 114 Surahs Completed"** and **"Y / 6236 Ayahs Mastered"**

#### Completion Certificate (Stretch Goal)
- When user completes ALL surahs → Show celebratory animation + certificate

---

## 6. Surah Ordering & Difficulty System

### Full Difficulty Order (First 30 Surahs)

The ordering considers: verse count, vocabulary complexity, word repetition rate, and common usage in daily prayer.

| Diff. Order | Surah # | Name | Verses | Total Words (approx) |
|------------|---------|------|--------|---------------------|
| 1 | 108 | Al-Kawthar (الكوثر) | 3 | 10 |
| 2 | 103 | Al-Asr (العصر) | 3 | 14 |
| 3 | 110 | An-Nasr (النصر) | 3 | 19 |
| 4 | 112 | Al-Ikhlas (الإخلاص) | 4 | 15 |
| 5 | 1 | Al-Fatihah (الفاتحة) | 7 | 29 |
| 6 | 106 | Quraysh (قريش) | 4 | 17 |
| 7 | 113 | Al-Falaq (الفلق) | 5 | 23 |
| 8 | 114 | An-Nas (الناس) | 6 | 20 |
| 9 | 111 | Al-Masad (المسد) | 5 | 23 |
| 10 | 105 | Al-Fil (الفيل) | 5 | 23 |
| 11 | 107 | Al-Ma'un (الماعون) | 7 | 25 |
| 12 | 109 | Al-Kafirun (الكافرون) | 6 | 27 |
| 13 | 102 | At-Takathur (التكاثر) | 8 | 28 |
| 14 | 104 | Al-Humazah (الهمزة) | 9 | 33 |
| 15 | 101 | Al-Qari'ah (القارعة) | 11 | 36 |
| 16 | 99 | Az-Zalzalah (الزلزلة) | 8 | 36 |
| 17 | 97 | Al-Qadr (القدر) | 5 | 30 |
| 18 | 95 | At-Tin (التين) | 8 | 34 |
| 19 | 100 | Al-Adiyat (العاديات) | 11 | 40 |
| 20 | 92 | Al-Lail (الليل) | 21 | 71 |
| 21-114 | ... | Remaining 94 surahs ordered by complexity | ... | ... |

> **Note:** The complete ordering for all 114 surahs will be computed programmatically in the seed script using verse count + word count as the primary sorting criteria. The first 20 are manually curated for optimal learning experience.

---

## 7. Gamification & Leveling System

### Level Tiers
```
🌱 Tiers 1-5:    Seedling (চারা)        — Learning basics
🌿 Tiers 6-10:   Sapling (চারাগাছ)       — Building vocabulary
🌳 Tiers 11-20:  Growing Tree (বর্ধমান)   — Consistent learner
🏆 Tiers 21-35:  Scholar (বিদ্বান)        — Advanced vocabulary
👑 Tiers 36-50:  Master (উস্তাদ)          — Near completion
⭐ Tier 50+:     Hafiz Path (হাফিজ পথ)   — Complete mastery
```

### Badges System
| Badge | Condition |
|-------|-----------|
| 🎯 First Word | Learn your first Arabic word |
| 📖 First Verse | Complete all words in a verse |
| 🕌 First Surah | Complete all verses in a surah |
| 🔥 7-Day Streak | 7 consecutive practice days |
| 🔥 30-Day Streak | 30 consecutive practice days |
| 💯 Perfect Session | 100% accuracy in a session |
| 📚 Juz Amma | Complete all surahs in Juz 30 |
| 🌟 Century | Learn 100 unique words |
| 🏅 Half Quran | Complete 57+ surahs |
| 👑 Full Quran | Complete all 114 surahs |

### Daily Goal System
Users choose their daily commitment:
- **Relaxed:** 5 words/day (~3 min)
- **Regular:** 10 words/day (~5 min)
- **Serious:** 15 words/day (~8 min)
- **Intense:** 20 words/day (~12 min)

---

## 8. API Endpoints Design

### Auth Routes (`/api/auth`)
```
POST   /api/auth/register        — Create new account
POST   /api/auth/login            — Login, return JWT
GET    /api/auth/me               — Get current user profile
PUT    /api/auth/profile          — Update profile settings
```

### Chapter Routes (`/api/chapters`)
```
GET    /api/chapters              — All surahs (ordered by difficulty)
GET    /api/chapters/:number      — Single surah details
GET    /api/chapters/:number/progress  — User's progress for this surah
```

### Verse Routes (`/api/verses`)
```
GET    /api/verses/:chapterNum                — All verses of a surah
GET    /api/verses/:chapterNum/:verseNum      — Single verse with words
GET    /api/verses/by-key/:verseKey           — Verse by key (e.g., "108:1")
```

### Practice Routes (`/api/practice`)
```
POST   /api/practice/session       — Generate a practice session
POST   /api/practice/submit        — Submit session results
GET    /api/practice/review        — Get words due for review
POST   /api/practice/flashcard     — Generate flashcard deck
```

### Progress Routes (`/api/progress`)
```
GET    /api/progress/overview      — Dashboard stats
GET    /api/progress/chapters      — All surah progress percentages
GET    /api/progress/words         — Mastered words list (paginated)
GET    /api/progress/stats         — XP, level, streak, badges
POST   /api/progress/word/master   — Mark a word as practiced
```

---

## 9. Frontend Pages & Components

### Page Hierarchy
```
/                          → Landing/Home page
/login                     → Login
/register                  → Registration
/dashboard                 → Main dashboard (after login)
/surahs                    → Surah list (with progress bars)
/surah/:number             → Surah detail (verses listed)
/surah/:number/ayah/:ayah  → Ayah view (word-by-word display)
/practice                  → Practice session selection
/practice/flashcard        → Active flashcard session
/practice/quiz             → MCQ quiz session
/practice/review           → Review due words
/profile                   → User profile & mastered words
/leaderboard               → Leaderboard (stretch goal)
```

### Key UI Components

#### WordCard Component
```
┌──────────────────────┐
│      إِنَّا          │  ← Arabic word (large, elegant)
│                      │
│    innā              │  ← Transliteration
│                      │
│  নিশ্চয়ই আমরা       │  ← Bengali meaning
│  Indeed, We          │  ← English meaning
│                      │
│  🔊 [Play Audio]     │  ← Audio button
│  ⭐⭐⭐☆☆            │  ← Mastery level
└──────────────────────┘
```

#### AyahView (Word-by-Word Display)
```
┌─────────────────────────────────────────────┐
│  سورة الكوثر — আয়াত ১                      │
│                                              │
│  ┌─────┐  ┌──────────┐  ┌─────────┐         │
│  │إِنَّا │  │أَعْطَيْنَاكَ│  │الْكَوْثَرَ │         │
│  │innā  │  │aʿṭaynāka│  │l-kawthara│         │
│  │আমরা  │  │দিয়েছি   │  │কাওসার   │         │
│  └─────┘  └──────────┘  └─────────┘         │
│                                              │
│  📖 পূর্ণ অনুবাদ (বাংলা):                    │
│  "নিশ্চয়ই আমরা আপনাকে কাওসার দান করেছি"     │
│                                              │
│  📖 Full Translation (English):              │
│  "Indeed, We have granted you Al-Kawthar"    │
│                                              │
│  [▶ Listen] [📝 Practice This Ayah]          │
└─────────────────────────────────────────────┘
```

#### SurahProgressCard
```
┌─────────────────────────────────────┐
│  📖 সূরা আল-কাওসার (108)             │
│  Al-Kawthar — The Abundance          │
│                                      │
│  Progress: ████████░░ 78%            │
│  Words: 8/10 mastered                │
│  Verses: 2/3 complete                │
│                                      │
│  [Continue Learning →]               │
└─────────────────────────────────────┘
```

### Design Principles
- **Dark mode** default with Islamic geometric pattern accents
- **Right-to-left (RTL)** support for Arabic text display
- **Mobile-first** responsive design
- **Arabic typography:** Use "Amiri Quran" or "KFGQPC Uthmanic Script" font
- **Bengali typography:** Use "Noto Sans Bengali" or "Hind Siliguri"
- **Micro-animations** for XP gains, level-ups, streak fires
- **Color palette:** Deep emerald green (#0A6847), gold (#F2A900), dark bg (#0F1419)

---

## 10. Phased Implementation Plan (Revised — 2026-09-23)

> [!IMPORTANT]
> The original 6-phase plan assumed starting from scratch. After code audit, we've found that **~40% of the code exists** but has critical bugs. The revised plan focuses on: **fixing what's broken → verifying → polishing → delivering.**

### What Already Exists (Code Audit Summary)
- ✅ MERN project structure (server + client with Vite)
- ✅ All 6 Mongoose models
- ✅ All 5 API route files with full CRUD logic
- ✅ JWT authentication system (register, login, middleware)
- ✅ Practice session generation with MCQ and spaced repetition
- ✅ XP, level, streak, and badge logic
- ✅ 8 React page components + Navbar + Loading + AuthContext + API service
- ✅ 25KB+ CSS design system with dark theme
- ✅ Complete Quran data in JSON files (114 chapters, 6236 verses with WBW Bengali+English)
- ❌ Data NOT imported into MongoDB
- ❌ Several frontend bugs (field name mismatches, broken submit logic)

---

### Phase A: Critical Bug Fixes (Immediate)
> **Goal:** Make the existing code actually run without crashes

| Task | What | Why |
|------|------|-----|
| A1 | Import JSON data into MongoDB | APIs return empty results without data |
| A2 | Fix `nameTranslated` field mismatch | SurahList and AyahView pages crash |
| A3 | Add `checkAuth` to AuthContext | PracticeSession can't refresh user after submit |
| A4 | Fix PracticeSession submit logic | Session results never save properly |
| A5 | Install missing dependencies | `canvas-confetti` import crashes practice page |
| A6 | Fix ObjectId cast in aggregation | Progress stats return empty |

### Phase B: End-to-End Verification
> **Goal:** Confirm the full user journey works seamlessly

| Task | What | Verification |
|------|------|-------------|
| B1 | Start all services | MongoDB + Express + Vite all running |
| B2 | Register user | UserProgress created with 114 chapters |
| B3 | Browse surahs | 114 surahs display in difficulty order |
| B4 | View ayah | Word-by-word display with translations + audio |
| B5 | Practice flashcards | MCQ choices, progress bar, correct/wrong feedback |
| B6 | Complete session | XP earned, mastery updated, confetti fires |
| B7 | Dashboard stats | All numbers update correctly |
| B8 | Profile page | Mastered words list + badges + settings |

### Phase C: Missing Features & Polish
> **Goal:** Complete all 7 requirements with premium quality

| Task | What | Priority |
|------|------|----------|
| C1 | ErrorBoundary component | Important |
| C2 | Footer component | Nice-to-have |
| C3 | CSS audit & fix all missing styles | Important |
| C4 | Lazy loading for large surahs | Important |
| C5 | Search in mastered words list | Nice-to-have |
| C6 | Audio playback verification | Important |
| C7 | Mobile responsive pass | Important |
| C8 | Final data integrity check | Critical |

### Phase D: Final Testing & Delivery
> **Goal:** Everything works flawlessly, end to end

| Task | What |
|------|------|
| D1 | Full journey test: register → first surah → level up |
| D2 | Surah unlock: 70% mastery → next unlocks |
| D3 | Badge test: all badge triggers work |
| D4 | Spaced repetition: review words appear |
| D5 | Performance: large surah loads fast |
| D6 | README with setup instructions |
| D7 | Final build verification |

---

## 11. Progress Tracking Rules

> [!IMPORTANT]
> **ALWAYS update `progress.md` after completing each task.** This prevents loops and ensures continuity.

### Rules for progress.md:
1. **Before starting any task:** Check `progress.md` for current state
2. **After completing a task:** Update the corresponding item to `[x]` with timestamp
3. **If a task is in progress:** Mark it as `[/]`
4. **If blocked:** Document the blocker in progress.md
5. **Never repeat work** that progress.md shows as completed AND verified
6. **Phase gates:** Only move to next phase when current phase is 100% complete AND verified
7. **Verification rule:** A task is only "complete" when you've confirmed it works (not just written code)

### Format in progress.md:
```markdown
## Current Phase: Phase X — [Name]
## Last Updated: [timestamp]
## Current Task: [what's being worked on]
## Next Task: [what comes after]
## Blockers: [any issues]

### Completed:
- [x] Task description (completed timestamp)

### In Progress:
- [/] Task description

### Pending:
- [ ] Task description
```

---

## 12. Known Bugs (Code Audit — 2026-09-23)

> [!WARNING]
> These bugs were discovered during a thorough code audit. They MUST be fixed in Phase A before any new features.

### 🔴 Critical Bugs

| ID | Bug | Location | Impact | Fix |
|----|-----|----------|--------|-----|
| C1 | Data not in MongoDB | `server/data/*.json` exist but not imported | All APIs return empty | Create import script |
| C2 | `nameTranslated` field crash | `SurahList.jsx:79`, `AyahView.jsx:72` | TypeError crash | Use `translatedNameBn/En` |
| C3 | `checkAuth` undefined | `PracticeSession.jsx:12` → `AuthContext.jsx` | Post-practice refresh fails | Add to context |
| C4 | Broken `submitSession` | `PracticeSession.jsx:97-113` | Session results don't save | Remove, use useEffect |

### 🟡 Important Bugs

| ID | Bug | Location | Impact | Fix |
|----|-----|----------|--------|-----|
| I1 | Missing `canvas-confetti` | `PracticeSession.jsx:6` | Import error crash | npm install |
| I2 | Missing client `.env` | `client/` | Works with fallback, but not explicit | Create file |
| I3 | ObjectId cast in aggregation | `progress.js:144,155` | Stats return empty | Use `new ObjectId()` |
| I4 | No ErrorBoundary | `client/src/components/` | White screen on errors | Create component |
| I5 | No Footer | `client/src/components/` | Missing UI element | Create component |

---

## 🔑 Key Decisions & Constraints

1. **All data seeded locally** — No runtime API calls to Quran.com (avoids rate limits & latency)
2. **Quran.com API v4** is the primary data source (most reliable, Bengali + English WBW available)
3. **Difficulty order** is primarily by verse count, with manual curation for the first 20 surahs
4. **Mastery = 70% words correct** to unlock next surah (not 100%, to avoid frustration)
5. **Spaced repetition** for long-term retention (review mastered words periodically)
6. **Bengali-first** UI language, with English as secondary
7. **Mobile-first** responsive design (most Bengali speakers access via mobile)
8. **Data lives in JSON backup** — If MongoDB needs re-seeding, import from `/server/data/` JSON files

---

> **This plan is the single source of truth. Follow it phase by phase, updating progress.md as you go. Always read `instruction.md` for bug context before fixing any issue. In Shaa Allah, this will be a beautiful tool for learning Arabic through the Quran.** 🤲

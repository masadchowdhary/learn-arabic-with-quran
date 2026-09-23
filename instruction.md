# 🤖 AI Agent Implementation Instructions — Learn Arabic with Quran

> **Version:** 2.0 (Complete Rewrite)
> **Last Updated:** 2026-09-23T09:45:00+06:00
> **Project:** MERN Stack Quran Arabic Learning Platform
> **Status:** ~40% functionally complete (code exists but has critical bugs and missing integrations)

---

## ⚠️ CRITICAL: Read This First

The previous `progress.md` was **misleading** — it marked phases as "✅ completed" while sub-tasks were still `[ ]` unchecked or `[/]` in-progress. **Do NOT trust the old completion markers.** Use this instruction file as the single source of truth for what actually works and what needs to be fixed or built.

---

## 🎯 1. Core Operating Principles

### Rule 1: Anti-Loop Protocol
1. **ALWAYS read `progress.md`** before starting ANY work to find the current task.
2. **ALWAYS update `progress.md`** immediately after completing a task (mark `[x]`, update timestamps).
3. **If the same error repeats 2+ times:** STOP. Try a completely different approach or ask the user.
4. **Never re-do** work that progress.md shows as genuinely completed and verified.
5. **Phase gates:** Do NOT move to the next phase until the current phase is 100% verified.

### Rule 2: Follow the Master Plan
- `plan.md` defines the architecture, schema, and features — follow it unless explicitly overridden here.
- Stack: **MongoDB + Express.js + React (Vite) + Node.js** — No deviations.
- Styling: **Vanilla CSS** (custom design system in `index.css`).

### Rule 3: Verify Before Marking Complete
- After writing code, **start the server** and check for startup errors.
- After frontend changes, **check the browser console** for runtime errors.
- After API changes, **test with a real HTTP request** (curl or browser).

---

## 📋 2. The 7 User Requirements (চেকলিস্ট)

These are the user's 7 non-negotiable requirements. Every feature decision must trace back to one of these:

| # | Requirement (বাংলা) | Requirement (English) | Status |
|---|---|---|---|
| 1 | অক্ষর ভিত্তিক অনুবাদ (বাংলা + ইংরেজি) | Word-by-word translation DB (Bengali + English) from online API | ✅ Data fetched, JSON files exist |
| 2 | সম্পূর্ণ আয়াত অনুবাদ (বাংলা + ইংরেজি) | Full verse translation in Bengali + English | ✅ Data fetched, JSON files exist |
| 3 | সবচেয়ে ছোট/সহজ সূরা দিয়ে শুরু | Start with shortest/easiest surahs | ✅ Difficulty ordering implemented |
| 4 | ব্যবহারকারীর প্রফাইল ও আয়ত্বকরা শব্দ | User profile with mastered words database | ⚠️ Backend exists, frontend has bugs |
| 5 | শতাংশ ভিত্তিক ফ্ল্যাশকার্ড প্রাকটিস | Percentage-based flashcard practice | ⚠️ Backend logic exists, frontend broken |
| 6 | ডুয়োলিঙ্গো-স্টাইল লেভেল সিস্টেম | Duolingo-style progressive leveling | ⚠️ XP/Level logic exists, UI partially done |
| 7 | সকল ১১৪ সূরা ও ৬২৩৬ আয়াত কভারেজ | Complete coverage of all surahs/ayahs | ⚠️ Data exists in JSON but NOT seeded to MongoDB |

---

## 🔍 3. Comprehensive Audit — Critical Bugs & Issues

### 🔴 CRITICAL (App won't function without fixing)

#### Bug C1: Data NOT Seeded to MongoDB
- **Location:** `server/scripts/seedQuranData.js` + `progress.md` line 46
- **Problem:** JSON files exist in `/server/data/` (114 chapters + 6236 verses), but `progress.md` shows `[/] Store merged data in MongoDB` — meaning the data was never inserted into MongoDB. The seed script FETCHED data from the API and SAVED to JSON files, but the MongoDB insertion step was either never completed or failed.
- **Impact:** ALL API endpoints that query MongoDB (`/api/chapters`, `/api/verses`, etc.) will return EMPTY results.
- **Fix:** Create a MongoDB import script that reads the JSON files from `/server/data/` and inserts them into MongoDB. OR, modify the seed script to have a separate "import from JSON" mode.

#### Bug C2: `nameTranslated` Field Mismatch (Frontend Crash)
- **Location:** `client/src/pages/SurahList.jsx:79` and `client/src/pages/AyahView.jsx:72`
- **Problem:** Frontend accesses `chapter.nameTranslated.bn` and `chapter.nameTranslated.en` (nested object), but the Chapter Mongoose model and seed data use FLAT fields: `translatedNameBn` and `translatedNameEn`.
- **Impact:** `TypeError: Cannot read properties of undefined (reading 'bn')` — SurahList and AyahView pages will CRASH.
- **Fix Options:**
  - Option A: Change frontend to use `chapter.translatedNameBn` and `chapter.translatedNameEn`
  - Option B: Add a Mongoose virtual or transform to create the nested `nameTranslated` object in the API response
  - **Recommended: Option A** (simpler, no backend changes)

#### Bug C3: `checkAuth` Not Exposed from AuthContext
- **Location:** `client/src/pages/PracticeSession.jsx:12` uses `const { user, checkAuth } = useAuth();`
- **Problem:** `AuthContext.jsx` does NOT export a `checkAuth` function. The context exposes: `user, loading, error, isAuthenticated, register, login, logout, updateUser, clearError`.
- **Impact:** `checkAuth` will be `undefined`, causing the post-practice user refresh to fail silently.
- **Fix:** Either add a `checkAuth` method to AuthContext (that calls `authAPI.getMe()` and updates state), OR replace the `checkAuth()` call in PracticeSession with the existing `updateUser()` using the response data.

#### Bug C4: Broken `submitSession` Function in PracticeSession
- **Location:** `client/src/pages/PracticeSession.jsx:97-113`
- **Problem:** The `submitSession` function on line 97 is effectively a no-op — it has a try/catch but the logic inside is broken (incomplete, just assigns variables without making an API call). The REAL submit logic is in a `useEffect` on line 116 that watches `results.length === session.words.length`.
- **Impact:** The useEffect-based approach works for auto-submit, but the explicit `submitSession()` call on line 92 does nothing useful. This creates a race condition where the last answer's state update may not have propagated before the effect fires.
- **Fix:** Remove the broken `submitSession` function entirely. Keep the `useEffect`-based approach but ensure it correctly handles the final word result by using a functional state update pattern.

### 🟡 IMPORTANT (App works but with degraded experience)

#### Bug I1: Missing `canvas-confetti` Dependency
- **Location:** `client/src/pages/PracticeSession.jsx:6` — `import confetti from 'canvas-confetti';`
- **Problem:** Need to verify if `canvas-confetti` is in `client/package.json`. If not, the import will fail and crash the practice page.
- **Fix:** `cd client && npm install canvas-confetti`

#### Bug I2: Missing Client `.env` File
- **Location:** `client/` directory
- **Problem:** No `.env` file exists in the client directory. The API service (`client/src/api/index.js:3`) uses `import.meta.env.VITE_API_URL` with a fallback to `http://localhost:5000/api`, so it works in dev mode. But best practice is to create the file.
- **Fix:** Create `client/.env` with `VITE_API_URL=http://localhost:5000/api`

#### Bug I3: `userId` Type Mismatch in Progress Aggregation
- **Location:** `server/routes/progress.js:144,155` — MongoDB aggregation `$match`
- **Problem:** `req.userId` is an ObjectId, but `MasteredWord.aggregate()` uses `{ userId: req.userId }`. In aggregation pipelines, Mongoose does NOT auto-cast types like it does in `.find()`. If `userId` is stored as ObjectId but `req.userId` is a string, the match will return 0 results.
- **Fix:** Ensure `$match: { userId: new mongoose.Types.ObjectId(req.userId) }` in aggregation queries.

#### Bug I4: Missing SurahDetail Page
- **Location:** Frontend routing (`App.jsx`)
- **Problem:** The plan calls for a separate Surah Detail page showing a list of ayahs with progress, separate from the AyahView which shows word-by-word. Currently, `/surah/:chapterNum` goes directly to AyahView showing ALL verses at once. For large surahs (Al-Baqarah has 286 ayahs), this will be extremely slow.
- **Fix:** Either keep current approach (acceptable for MVP) OR add pagination/lazy loading to AyahView for large surahs.

#### Bug I5: No Footer Component
- **Location:** `client/src/components/common/` — only has `Loading.jsx` and `Navbar.jsx`
- **Problem:** Plan calls for a Footer component but none exists. Minor issue for MVP.

#### Bug I6: Missing Error Boundary Component
- **Location:** `client/src/components/common/`
- **Problem:** Plan calls for an ErrorBoundary but none exists. React errors will show a white screen.
- **Fix:** Create a basic ErrorBoundary class component.

### 🔵 NICE-TO-HAVE (Polish items for later)

- Audio playback may fail for some words (CDN URL format may vary)
- No loading state on SurahList when not authenticated
- Flashcard flip animation CSS may not be defined in index.css
- Word-card CSS class used in AyahView may not be defined
- RTL direction handling could be more robust

---

## 🛠️ 4. Tech Stack Rules

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Latest |
| Styling | Vanilla CSS | Custom design system in `index.css` |
| State | React Context + useState/useReducer | Built-in |
| Routing | React Router v6 | Latest |
| HTTP | Axios | Latest |
| Backend | Express.js | v4.21+ |
| Database | MongoDB + Mongoose | v8.7+ |
| Auth | JWT + bcryptjs | Latest |
| Validation | express-validator | v7.2+ |
| Audio | HTML5 Audio API | Built-in |

---

## 📁 5. File-by-File Task Map

### Server Files

| File | Status | Issues | Action Needed |
|------|--------|--------|---------------|
| `server/server.js` | ✅ Good | None | No changes |
| `server/config/db.js` | ✅ Good | None | No changes |
| `server/middleware/auth.js` | ✅ Good | None | No changes |
| `server/middleware/errorHandler.js` | ✅ Good | None | No changes |
| `server/models/Chapter.js` | ✅ Good | None | No changes |
| `server/models/Verse.js` | ✅ Good | None | No changes |
| `server/models/User.js` | ✅ Good | None | No changes |
| `server/models/MasteredWord.js` | ✅ Good | None | No changes |
| `server/models/UserProgress.js` | ✅ Good | None | No changes |
| `server/models/PracticeHistory.js` | ✅ Good | None | No changes |
| `server/routes/auth.js` | ✅ Good | None | No changes |
| `server/routes/chapters.js` | ✅ Good | None | No changes |
| `server/routes/verses.js` | ✅ Good | None | Verify |
| `server/routes/practice.js` | ✅ Good | None | No changes |
| `server/routes/progress.js` | ⚠️ Bug I3 | ObjectId cast issue in aggregation | Fix aggregation $match |
| `server/scripts/seedQuranData.js` | ⚠️ Incomplete | Data fetched to JSON but not to MongoDB | Add JSON→MongoDB import function |
| `server/data/*.json` | ✅ Good | Complete (114 chapters, 6236 verses) | Use for MongoDB seeding |

### Client Files

| File | Status | Issues | Action Needed |
|------|--------|--------|---------------|
| `client/src/App.jsx` | ✅ Good | None | No changes |
| `client/src/main.jsx` | ✅ Good | None | No changes |
| `client/src/api/index.js` | ✅ Good | None | No changes |
| `client/src/context/AuthContext.jsx` | ⚠️ Bug C3 | Missing `checkAuth` function | Add `checkAuth` method |
| `client/src/components/common/Navbar.jsx` | ✅ Good | None | No changes |
| `client/src/components/common/Loading.jsx` | ✅ Good | None | No changes |
| `client/src/pages/Home.jsx` | ✅ Good | None | No changes |
| `client/src/pages/Login.jsx` | ✅ Good | None | Verify |
| `client/src/pages/Register.jsx` | ✅ Good | None | Verify |
| `client/src/pages/Dashboard.jsx` | ✅ Good | None | No changes |
| `client/src/pages/SurahList.jsx` | 🔴 Bug C2 | `nameTranslated` crash | Fix field references |
| `client/src/pages/AyahView.jsx` | 🔴 Bug C2 | `nameTranslated` crash | Fix field references |
| `client/src/pages/PracticeSession.jsx` | 🔴 Bugs C3, C4 | checkAuth + submitSession broken | Fix both issues |
| `client/src/pages/Profile.jsx` | ✅ Good | None | No changes |
| `client/src/index.css` | ⚠️ Verify | Flashcard CSS classes may be missing | Audit and add missing styles |

---

## 🚀 6. Execution Plan (Phase-by-Phase)

### Phase A: Critical Bug Fixes (Do First!)
> **Goal:** Make the existing code actually run without crashes.

1. **[A1]** Seed JSON data into MongoDB
   - Create `server/scripts/importFromJSON.js`
   - Read all JSON files from `server/data/`
   - Insert chapters and verses into MongoDB
   - Verify: 114 chapters, 6236 verses in MongoDB
   
2. **[A2]** Fix `nameTranslated` field mismatch
   - In `SurahList.jsx`: Change `chapter.nameTranslated.en` → `chapter.translatedNameEn`
   - In `AyahView.jsx`: Change `chapter.nameTranslated.bn` → `chapter.translatedNameBn`
   
3. **[A3]** Fix `checkAuth` in AuthContext
   - Add `checkAuth` callback to `AuthContext.jsx` that calls `authAPI.getMe()` and updates user state
   
4. **[A4]** Fix PracticeSession submit logic
   - Remove the broken `submitSession` function
   - Keep the `useEffect`-based auto-submit
   - Ensure state consistency for the last word

5. **[A5]** Install missing dependencies
   - Verify and install `canvas-confetti` in client
   - Create `client/.env` with `VITE_API_URL`

6. **[A6]** Fix ObjectId cast in progress aggregation
   - Import `mongoose` in `progress.js`
   - Wrap `req.userId` in `new mongoose.Types.ObjectId()` for aggregation queries

### Phase B: Verify End-to-End Flow
> **Goal:** Confirm the full user journey works.

1. **[B1]** Start MongoDB, server, and client
2. **[B2]** Test: Register a new user → verify UserProgress created with 114 chapters
3. **[B3]** Test: Navigate to Surah List → verify all 114 surahs display
4. **[B4]** Test: Click first surah (Al-Kawthar) → verify AyahView loads with word-by-word data
5. **[B5]** Test: Start practice session → verify flashcards appear with MCQ choices
6. **[B6]** Test: Complete practice → verify XP earned, mastery updated, results saved
7. **[B7]** Test: Check Dashboard → verify stats update
8. **[B8]** Test: Check Profile → verify mastered words list

### Phase C: Missing Features & Polish
> **Goal:** Complete all 7 requirements with polish.

1. **[C1]** Add ErrorBoundary component
2. **[C2]** Add Footer component
3. **[C3]** Verify CSS completeness:
   - Flashcard flip animation styles
   - Word-card styles for AyahView
   - Surah-card styles for SurahList
   - Choice button styles (correct/incorrect)
   - XP popup animation
   - Progress bar styles
   - Badge display styles
4. **[C4]** Add lazy loading / pagination for large surahs in AyahView
5. **[C5]** Add search functionality to mastered words in Profile
6. **[C6]** Verify audio playback works (test with Quran.com CDN URLs)
7. **[C7]** Responsive design pass (mobile-first)
8. **[C8]** Final data verification:
   - All 114 surahs in MongoDB
   - All 6236 verses in MongoDB  
   - All verses have Bengali + English translations
   - All words have Bengali + English + transliteration

### Phase D: Final Testing & Delivery
> **Goal:** Everything works flawlessly.

1. **[D1]** Full user journey test (register → learn → level up → streak)
2. **[D2]** Test surah unlock progression (70% mastery → next surah unlocks)
3. **[D3]** Test badge awarding (first_word, century, streak_7)
4. **[D4]** Test spaced repetition (review words due)
5. **[D5]** Performance test with large surahs (Al-Baqarah, 286 ayahs)
6. **[D6]** Update README.md with final setup instructions
7. **[D7]** Mark all progress items complete

---

## 📝 7. Database Schema Quick Reference

### Collections
```
chapters    → 114 documents (one per surah)
verses      → 6236 documents (one per ayah, with embedded words[])
users       → User accounts with gamification fields
masteredWords → Per-user per-word mastery tracking
userProgress  → Per-user chapter/verse completion tracking
practiceHistory → Session history logs
```

### Key Relationships
```
User._id ←→ UserProgress.userId
User._id ←→ MasteredWord.userId
User._id ←→ PracticeHistory.userId
Chapter.chapterNumber ←→ Verse.chapterNumber
Chapter.chapterNumber ←→ UserProgress.chapterProgress[].chapterNumber
```

### Mastery Levels
```
0 = New (never seen)
1 = Introduced (seen once)
2 = Familiar (1-2 correct)
3 = Practiced (3-4 correct, threshold for "mastered" in calculations)
4 = Strong (5+ correct)
5 = Mastered (8+ correct, 90%+ accuracy)
```

### XP Rewards
```
Correct flashcard answer: +10 XP
Complete a verse:         +50 XP
Complete a surah:         +200 XP
Daily streak bonus:       +20 XP
Perfect session:          +30 XP
Review correct:           +5 XP
```

---

## 🔧 8. API Endpoints Reference

```
# Auth
POST   /api/auth/register     → Create account + initialize 114-chapter progress
POST   /api/auth/login         → Login, return JWT
GET    /api/auth/me            → Current user profile (protected)
PUT    /api/auth/profile       → Update settings (protected)

# Chapters
GET    /api/chapters           → All 114 surahs (ordered by difficulty)
GET    /api/chapters/:number   → Single surah details
GET    /api/chapters/:num/progress → User's progress for surah (protected)

# Verses
GET    /api/verses/:chapterNum             → All verses of a surah
GET    /api/verses/:chapterNum/:verseNum   → Single verse with words

# Practice
POST   /api/practice/session   → Generate flashcard session (protected)
POST   /api/practice/submit    → Submit results, update mastery (protected)
GET    /api/practice/review    → Get words due for review (protected)

# Progress
GET    /api/progress/overview  → Dashboard stats (protected)
GET    /api/progress/chapters  → All surah progress percentages (protected)
GET    /api/progress/words     → Mastered words list, paginated (protected)
GET    /api/progress/stats     → Detailed stats with distributions (protected)
```

---

## 🚦 9. Quick Start Commands

```bash
# Terminal 1: Start MongoDB (if local)
mongod

# Terminal 2: Start Server
cd server
npm install
npm run seed          # Only first time: fetch data from Quran.com API
node scripts/importFromJSON.js  # Import JSON data to MongoDB
npm run dev           # Start Express server on port 5000

# Terminal 3: Start Client
cd client
npm install
npm run dev           # Start Vite dev server on port 5173
```

---

## 📌 10. Workflow for Every Session

```
1. Read progress.md → Find current unchecked task
2. Read this instruction.md → Check if the task has known bugs listed above
3. Implement the fix/feature
4. Verify it works (start server, check console, test API)
5. Mark task [x] in progress.md with timestamp
6. Move to next task
7. If stuck on same error 2+ times → try different approach or ask user
```

> **In Shaa Allah, this project will be a beautiful tool for learning Arabic through the Quran.** 🤲

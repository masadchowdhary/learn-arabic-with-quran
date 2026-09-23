# 🕌 Learn Arabic with Quran — Implementation Plan

## Goal

Complete the Quran Arabic learning platform (MERN stack) so it runs flawlessly end-to-end. The project has ~40% of code written but has critical bugs preventing it from functioning.

## Background

A thorough code audit of the existing codebase revealed:
- **What works:** MERN project structure, all 6 Mongoose models, all 5 API route files, JWT auth, 8 React pages, 25KB CSS design system, and complete Quran data (114 chapters, 6236 verses) saved as JSON files
- **What's broken:** Data not in MongoDB, field name mismatches causing crashes, broken practice session logic, missing dependencies

## User Review Required

> [!IMPORTANT]
> The three core files have been completely rewritten to reflect reality:
> - **[plan.md](file:///d:/learn-arabic-with-quran/plan.md)** — Section 10 replaced with revised 4-phase plan (A→D), new Section 12 documents all known bugs
> - **[instruction.md](file:///d:/learn-arabic-with-quran/instruction.md)** — Complete rewrite with detailed bug audit, file-by-file task map, execution phases
> - **[progress.md](file:///d:/learn-arabic-with-quran/progress.md)** — Reset to accurately reflect project state with ~45 tracked tasks

## What Was Found (Bug Audit Summary)

### 🔴 Critical Bugs (App crashes)
| Bug | File | Issue |
|-----|------|-------|
| JSON data not imported to MongoDB | `server/data/*.json` | All API endpoints return empty results |
| `nameTranslated` field mismatch | [SurahList.jsx](file:///d:/learn-arabic-with-quran/client/src/pages/SurahList.jsx#L79), [AyahView.jsx](file:///d:/learn-arabic-with-quran/client/src/pages/AyahView.jsx#L72) | Frontend uses `chapter.nameTranslated.bn` but model stores `translatedNameBn` |
| `checkAuth` undefined | [PracticeSession.jsx](file:///d:/learn-arabic-with-quran/client/src/pages/PracticeSession.jsx#L12) → [AuthContext.jsx](file:///d:/learn-arabic-with-quran/client/src/context/AuthContext.jsx) | Function not exported from context |
| Broken `submitSession` | [PracticeSession.jsx](file:///d:/learn-arabic-with-quran/client/src/pages/PracticeSession.jsx#L97-L113) | No-op function that doesn't call API |

### 🟡 Important Bugs (Degraded experience)
| Bug | Issue |
|-----|-------|
| Missing `canvas-confetti` dependency | Import may crash practice page |
| ObjectId cast in aggregation | Progress stats queries may return empty |
| No ErrorBoundary or Footer components | Missing UI elements |

## Proposed Changes

### Phase A: Critical Bug Fixes

#### [NEW] [importFromJSON.js](file:///d:/learn-arabic-with-quran/server/scripts/importFromJSON.js)
Script to read all JSON files from `server/data/` and insert them into MongoDB collections.

#### [MODIFY] [SurahList.jsx](file:///d:/learn-arabic-with-quran/client/src/pages/SurahList.jsx)
### Phase A: Critical Bug Fixes (Completed)
- **Goal**: Make the existing codebase run without crashing.
- **Tasks**:
  1. Fix the MongoDB seeding issue so the 114 surahs and 6236 verses are loaded.
  2. Fix `nameTranslated` field mismatch in frontend `SurahList` and `AyahView`.
  3. Fix `checkAuth` missing function in `AuthContext`.
  4. Fix `submitSession` logic in `PracticeSession` to correctly submit results to backend.
  5. Check dependencies (`canvas-confetti`) and Environment file.
  6. Fix `ObjectId` mapping issue in `progress.js` API routes.

### Phase B: End-to-End Verification (Completed)
- **Goal**: Confirm the full user journey works.
- **Tasks**:
  1. Start backend and frontend locally.
  2. Test user registration.
  3. Test Surah list rendering and difficulty order.
  4. Test AyahView with translation + audio functionality.
  5. Generate a practice session.
  6. Submit a practice session and observe feedback.
  7. Verify Dashboard XP, levels, and progress.
  8. Ensure MongoDB tracks the progression accurately.
*(Note: Backend verification complete. User verification of UI is requested).*

### Phase C: Missing Features & Polish
- **Goal**: Add final missing components and finalize requirements.
- **Tasks**:
  1. Add `ErrorBoundary` component.
  2. Add `Footer` component.
  3. Verify & fix all CSS animations and layouts (flashcard flip, stat grids, badges).
  4. Implement lazy loading/pagination for large Surahs (like Al-Baqarah) in `AyahView`.
  5. Add search functionality to the Mastered Words list in Profile.
  6. Ensure audio playback URLs are correct and functional.
  7. Mobile responsive design pass.
  8. Final MongoDB data health check.

### Phase D: Final Testing & Delivery
- **Goal**: Zero bugs before final delivery.
- **Tasks**:
  1. E2E full user journey.
  2. Progression logic test (70% unlock mechanism).
  3. Badge awarding test.
  4. Spaced repetition algorithm validation.
  5. Update `README.md`. update

## Verification Plan

### Automated Tests
- `node scripts/importFromJSON.js` → verify output shows 114 chapters, 6236 verses
- Server health check: `curl http://localhost:5000/api/health`
- Chapters endpoint: `curl http://localhost:5000/api/chapters` → verify 114 surahs returned

### Manual Verification
- Register a test user → verify 114-chapter UserProgress created
- Navigate to SurahList → verify no crashes, all 114 surahs display
- Click first surah → verify word-by-word Arabic + Bengali + English translations load
- Complete a flashcard session → verify XP, mastery, and progress update
- Check Profile → verify mastered words appear

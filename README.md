# Learn Arabic with Quran

A modern, gamified web application for learning Quranic Arabic word-by-word. This app leverages the MERN stack to deliver a Duolingo-style learning experience, helping users build their vocabulary and understanding of the Quran progressively.

## ✨ Key Features

1. **Word-by-Word Translation:** Every Ayah is broken down word-by-word with Arabic, transliteration, and translations in both Bengali and English.
2. **Full Ayah Translation:** Complete sentence translations alongside the word breakdown.
3. **Progressive Difficulty:** Surahs are arranged by difficulty (starting from the shortest and easiest) rather than standard chronological order.
4. **Spaced Repetition Practice:** Interactive flashcard sessions are generated dynamically based on your mastery of words in a specific Ayah/Surah.
5. **Gamification (Duolingo-style):** 
   - Earn XP for practicing.
   - Level up your profile (from Seedling to Hafiz).
   - Maintain daily streaks 🔥.
   - Unlock milestone Badges 🏆.
6. **Detailed Profile Tracking:** Track every single word you've mastered and view your learning analytics.

## 🛠 Tech Stack

**MERN Stack:**
- **MongoDB:** Database (Mongoose ODM)
- **Express.js:** Backend API Framework
- **React.js:** Frontend UI (Vite)
- **Node.js:** Runtime Environment

**Styling:**
- Pure Vanilla CSS (`index.css`) utilizing modern CSS Variables, Glassmorphism, and custom animations. No external UI frameworks.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas URL)

### 1. Clone & Install
Clone the repository, then install dependencies for both the frontend and backend.

```bash
# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

### 2. Environment Variables

**Backend (`server/.env`):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/learn-arabic-quran
JWT_SECRET=your_super_secret_jwt_key
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Data Seeding
The application requires Quranic data (Surahs, Ayahs, and Words) to be present in the MongoDB database before running.
We use the official Quran.com API data. To seed the database:

```bash
cd server
npm run seed
```
*(This script fetches word-by-word and verse-by-verse translation data and populates your MongoDB instance).*

### 4. Run the Application

You can run both the frontend and backend concurrently from the root directory using:

```bash
npm run dev
```

Alternatively, you can run them separately:

**Run Backend:**
```bash
cd server
npm run dev
```

**Run Frontend:**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 📖 Architecture & Progress
- Refer to `plan.md` for the original architectural design and database schemas.
- Refer to `progress.md` for the development timeline and feature phases.
- `instruction.md` contains the core operating principles used during the AI-assisted development of this project.

## 📝 License
This project is open-source and free to use for educational purposes.

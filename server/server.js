import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import chapterRoutes from './routes/chapters.js';
import verseRoutes from './routes/verses.js';
import practiceRoutes from './routes/practice.js';
import progressRoutes from './routes/progress.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/verses', verseRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/progress', progressRoutes);

// ─── Health Check ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🕌 Learn Arabic with Quran API is running!',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 Handler ────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════╗`);
      console.log(`║   🕌 Learn Arabic with Quran API               ║`);
      console.log(`║   Server running on port ${PORT}                  ║`);
      console.log(`║   http://localhost:${PORT}                        ║`);
      console.log(`╚═══════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

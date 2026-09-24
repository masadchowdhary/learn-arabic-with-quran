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
import adminRoutes from './routes/admin.js';

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

// ─── Database Connection Middleware ─────────────────
// Connect to the DB on each request. The connectDB function caches the connection.
// This is done after CORS so that OPTIONS preflight requests don't fail if the DB is down.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/verses', verseRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

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

// ─── Start Server / Export App ──────────────────────
// Only start the server if not running on Vercel (or in production)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    try {
      await connectDB();
      console.log(`\n╔═══════════════════════════════════════════════╗`);
      console.log(`║   🕌 Learn Arabic with Quran API               ║`);
      console.log(`║   Server running on port ${PORT}                  ║`);
      console.log(`║   http://localhost:${PORT}                        ║`);
      console.log(`╚═══════════════════════════════════════════════╝\n`);
    } catch (err) {
      console.error('Failed to connect to database on startup:', err);
    }
  });
}

// Export the Express API for Vercel
export default app;

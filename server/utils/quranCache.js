import Verse from '../models/Verse.js';
import Chapter from '../models/Chapter.js';

/**
 * In-memory cache for static Quran data (chapters & verses).
 * Quran text never changes at runtime, so warm serverless instances can
 * serve these from memory instead of hitting MongoDB on every request.
 * Promises are cached so concurrent requests share a single DB query.
 */

const VERSE_CACHE_LIMIT = 25; // max chapters kept in memory (LRU)
const verseCache = new Map();
let chaptersPromise = null;

const VERSE_PROJECTION = { __v: 0, createdAt: 0, updatedAt: 0 };

export function getChapterVerses(chapterNumber) {
  const key = Number(chapterNumber);

  if (verseCache.has(key)) {
    // Refresh LRU position
    const hit = verseCache.get(key);
    verseCache.delete(key);
    verseCache.set(key, hit);
    return hit;
  }

  const promise = Verse.find({ chapterNumber: key }, VERSE_PROJECTION)
    .sort({ verseNumber: 1 })
    .lean()
    .then(verses => {
      // Don't cache empty results (chapter may not be seeded yet)
      if (verses.length === 0) verseCache.delete(key);
      return verses;
    })
    .catch(err => {
      verseCache.delete(key);
      throw err;
    });

  if (verseCache.size >= VERSE_CACHE_LIMIT) {
    verseCache.delete(verseCache.keys().next().value);
  }
  verseCache.set(key, promise);
  return promise;
}

export function getAllChapters() {
  if (!chaptersPromise) {
    chaptersPromise = Chapter.find({}, VERSE_PROJECTION)
      .sort({ difficultyOrder: 1 })
      .lean()
      .then(chapters => {
        if (chapters.length < 114) {
          // Data still being seeded — don't keep a partial list for long
          setTimeout(() => { chaptersPromise = null; }, 60 * 1000);
        }
        return chapters;
      })
      .catch(err => {
        chaptersPromise = null;
        throw err;
      });
  }
  return chaptersPromise;
}

export async function getChapter(chapterNumber) {
  const chapters = await getAllChapters();
  return chapters.find(c => c.chapterNumber === Number(chapterNumber)) || null;
}

/** Only real words (skip verse-end markers). */
export function getVerseWords(verse) {
  return (verse.words || []).filter(w => w.charType === 'word');
}

/** Clear cache (call after admin re-seeds data). */
export function clearQuranCache(chapterNumber) {
  if (chapterNumber) verseCache.delete(Number(chapterNumber));
  else verseCache.clear();
  chaptersPromise = null;
}

/** Cache-Control header for public, static Quran data (CDN + browser). */
export const STATIC_CACHE_HEADER = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

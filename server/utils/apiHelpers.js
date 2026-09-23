/**
 * Quran.com API v4 Helper Functions
 * Base URL: https://api.quran.com/api/v4
 *
 * These helpers fetch and transform data from the Quran.com API
 * for the data seeding pipeline.
 */

const QURAN_API_BASE = 'https://api.quran.com/api/v4';
const QURAN_AUDIO_BASE = 'https://audio.qurancdn.com';

/**
 * Generic fetch with retry logic and rate limiting
 */
async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`  ⚠️ Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
}

/**
 * Fetch all 114 chapters metadata
 */
export async function fetchAllChapters() {
  console.log('📖 Fetching all chapters...');
  const data = await fetchWithRetry(`${QURAN_API_BASE}/chapters?language=en`);
  return data.chapters;
}

/**
 * Fetch chapter info (translated name etc.) in a specific language
 */
export async function fetchChapterInfo(chapterNumber, language = 'bn') {
  const data = await fetchWithRetry(
    `${QURAN_API_BASE}/chapters/${chapterNumber}?language=${language}`
  );
  return data.chapter;
}

/**
 * Fetch all verses of a chapter with word-by-word data
 * @param {number} chapterNumber - 1 to 114
 * @param {string} language - 'bn' for Bengali, 'en' for English
 * @returns {Array} Array of verse objects with words
 */
export async function fetchVersesWithWords(chapterNumber, language = 'bn') {
  const allVerses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchWithRetry(
      `${QURAN_API_BASE}/verses/by_chapter/${chapterNumber}?language=${language}&words=true&word_fields=text_uthmani,text_imlaei&per_page=50&page=${page}&fields=text_uthmani`
    );

    allVerses.push(...data.verses);
    totalPages = data.pagination.total_pages;
    page++;

    if (page <= totalPages) {
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
  }

  return allVerses;
}

/**
 * Fetch verse translations for a chapter
 * @param {number} chapterNumber
 * @param {number} translationId - Resource ID (e.g., 20 for Saheeh International)
 */
export async function fetchVerseTranslations(chapterNumber, translationId) {
  const allVerses = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchWithRetry(
      `${QURAN_API_BASE}/verses/by_chapter/${chapterNumber}?translations=${translationId}&per_page=50&page=${page}`
    );

    allVerses.push(...data.verses);
    totalPages = data.pagination.total_pages;
    page++;

    if (page <= totalPages) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return allVerses;
}

/**
 * Fetch available translation resources and find Bengali ones
 */
export async function fetchTranslationResources() {
  const data = await fetchWithRetry(`${QURAN_API_BASE}/resources/translations`);
  return data.translations;
}

/**
 * Find Bengali translation ID from resource list
 */
export async function findBengaliTranslationId() {
  const translations = await fetchTranslationResources();
  // Look for Bengali translations
  const bengaliTranslations = translations.filter(
    t => t.language_name === 'bengali'
  );

  if (bengaliTranslations.length > 0) {
    console.log('📝 Available Bengali translations:');
    bengaliTranslations.forEach(t => {
      console.log(`   ID: ${t.id} — ${t.name} (${t.author_name})`);
    });
    return bengaliTranslations[0].id;
  }

  console.warn('⚠️ No Bengali translation found in API resources');
  return null;
}

/**
 * Merge Bengali and English word-by-word data for a chapter
 */
export function mergeWordData(bnVerses, enVerses) {
  const merged = [];

  for (let i = 0; i < bnVerses.length; i++) {
    const bnVerse = bnVerses[i];
    const enVerse = enVerses[i];

    if (!enVerse || bnVerse.verse_key !== enVerse.verse_key) {
      console.warn(`⚠️ Verse mismatch at index ${i}: bn=${bnVerse.verse_key}, en=${enVerse?.verse_key}`);
      continue;
    }

    const words = [];
    const bnWords = bnVerse.words || [];
    const enWords = enVerse.words || [];

    for (let w = 0; w < bnWords.length; w++) {
      const bnWord = bnWords[w];
      const enWord = enWords[w] || {};

      words.push({
        position: bnWord.position,
        textArabic: bnWord.text_uthmani || bnWord.text || bnWord.code_v1 || '',
        translationBn: bnWord.translation?.text || '',
        translationEn: enWord.translation?.text || '',
        transliteration: bnWord.transliteration?.text || enWord.transliteration?.text || '',
        audioUrl: bnWord.audio_url
          ? `${QURAN_AUDIO_BASE}/${bnWord.audio_url}`
          : '',
        charType: bnWord.char_type_name || 'word'
      });
    }

    const actualWords = words.filter(w => w.charType === 'word');

    merged.push({
      chapterNumber: parseInt(bnVerse.verse_key.split(':')[0]),
      verseNumber: bnVerse.verse_number,
      verseKey: bnVerse.verse_key,
      textArabic: enVerse.text_uthmani || bnVerse.text_uthmani || '',
      totalWords: actualWords.length,
      juzNumber: bnVerse.juz_number || 0,
      hizbNumber: bnVerse.hizb_number || 0,
      pageNumber: bnVerse.page_number || 0,
      words
    });
  }

  return merged;
}

/**
 * Add full verse translations to merged data
 */
export function addTranslationsToVerses(mergedVerses, bnTranslations, enTranslations) {
  const bnMap = new Map();
  const enMap = new Map();

  if (bnTranslations) {
    bnTranslations.forEach(v => {
      const translation = v.translations?.[0]?.text || '';
      bnMap.set(v.verse_key, translation.replace(/<[^>]*>/g, '')); // Strip HTML
    });
  }

  if (enTranslations) {
    enTranslations.forEach(v => {
      const translation = v.translations?.[0]?.text || '';
      enMap.set(v.verse_key, translation.replace(/<[^>]*>/g, '')); // Strip HTML
    });
  }

  return mergedVerses.map(verse => ({
    ...verse,
    translationBn: bnMap.get(verse.verseKey) || '',
    translationEn: enMap.get(verse.verseKey) || ''
  }));
}

/**
 * Build the full audio URL for a word
 */
export function buildAudioUrl(relativePath) {
  if (!relativePath) return '';
  return `${QURAN_AUDIO_BASE}/${relativePath}`;
}

export { QURAN_API_BASE, QURAN_AUDIO_BASE };

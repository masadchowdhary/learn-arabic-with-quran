/**
 * 🕌 Quran Data Seeding Script
 *
 * This script fetches ALL Quran data from Quran.com API v4 and stores it
 * in MongoDB. It handles:
 * 1. All 114 chapters metadata
 * 2. Word-by-word data (Bengali + English) for all verses
 * 3. Full verse translations (Bengali + English)
 * 4. Data integrity verification
 * 5. JSON backup export
 *
 * Usage: npm run seed
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from '../config/db.js';
import Chapter from '../models/Chapter.js';
import Verse from '../models/Verse.js';

import {
  fetchAllChapters,
  fetchChapterInfo,
  fetchVersesWithWords,
  fetchVerseTranslations,
  findBengaliTranslationId,
  mergeWordData,
  addTranslationsToVerses
} from '../utils/apiHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─────────────────────────────────────────────────────
// Difficulty ordering: manually curated first 30, rest by verse count
// ─────────────────────────────────────────────────────
const MANUAL_DIFFICULTY_ORDER = [
  108, // Al-Kawthar (3 verses) — shortest
  103, // Al-Asr (3 verses)
  110, // An-Nasr (3 verses)
  112, // Al-Ikhlas (4 verses)
  1,   // Al-Fatihah (7 verses) — required for prayer
  106, // Quraysh (4 verses)
  113, // Al-Falaq (5 verses)
  114, // An-Nas (6 verses)
  111, // Al-Masad (5 verses)
  105, // Al-Fil (5 verses)
  107, // Al-Ma'un (7 verses)
  109, // Al-Kafirun (6 verses)
  102, // At-Takathur (8 verses)
  104, // Al-Humazah (9 verses)
  101, // Al-Qari'ah (11 verses)
  99,  // Az-Zalzalah (8 verses)
  97,  // Al-Qadr (5 verses)
  95,  // At-Tin (8 verses)
  100, // Al-Adiyat (11 verses)
  98,  // Al-Bayyinah (8 verses)
  94,  // Ash-Sharh (8 verses)
  93,  // Ad-Duha (11 verses)
  96,  // Al-Alaq (19 verses)
  91,  // Ash-Shams (15 verses)
  90,  // Al-Balad (20 verses)
  89,  // Al-Fajr (30 verses)
  92,  // Al-Lail (21 verses)
  88,  // Al-Ghashiyah (26 verses)
  87,  // Al-Ala (19 verses)
  86,  // At-Tariq (17 verses)
];

/**
 * Compute difficulty order for all 114 surahs.
 * Manual order for first 30, then remaining ordered by verse count ascending.
 */
function computeDifficultyOrder(chapters) {
  const manualSet = new Set(MANUAL_DIFFICULTY_ORDER);
  const remaining = chapters
    .filter(c => !manualSet.has(c.id))
    .sort((a, b) => a.verses_count - b.verses_count)
    .map(c => c.id);

  const fullOrder = [...MANUAL_DIFFICULTY_ORDER, ...remaining];
  const orderMap = {};
  fullOrder.forEach((chapterId, index) => {
    orderMap[chapterId] = index + 1;
  });
  return orderMap;
}

// ─────────────────────────────────────────────────────
// Step 1: Seed Chapters
// ─────────────────────────────────────────────────────
async function seedChapters() {
  console.log('\n═══════════════════════════════════════');
  console.log('📖 STEP 1: Seeding Chapters (114 Surahs)');
  console.log('═══════════════════════════════════════\n');

  const chapters = await fetchAllChapters();
  const difficultyOrder = computeDifficultyOrder(chapters);

  const chapterDocs = [];

  for (const ch of chapters) {
    // Fetch Bengali chapter info for translated name
    let bnInfo = null;
    try {
      bnInfo = await fetchChapterInfo(ch.id, 'bn');
      await new Promise(r => setTimeout(r, 300)); // Rate limit
    } catch (e) {
      console.warn(`  ⚠️ Could not fetch Bengali info for chapter ${ch.id}`);
    }

    chapterDocs.push({
      chapterNumber: ch.id,
      nameArabic: ch.name_arabic,
      nameBengali: bnInfo?.translated_name?.name || ch.name_simple,
      nameEnglish: ch.name_simple,
      nameSimple: ch.name_simple,
      translatedNameBn: bnInfo?.translated_name?.name || '',
      translatedNameEn: ch.translated_name?.name || '',
      versesCount: ch.verses_count,
      revelationType: ch.revelation_place || 'meccan',
      difficultyOrder: difficultyOrder[ch.id],
      totalWords: 0, // Will be updated after seeding verses
      juzNumbers: [],
      pages: ch.pages || []
    });

    process.stdout.write(`  ✅ Chapter ${ch.id}/114: ${ch.name_simple}\r`);
  }

  await Chapter.deleteMany({});
  await Chapter.insertMany(chapterDocs);
  console.log(`\n  ✅ Inserted ${chapterDocs.length} chapters\n`);

  return chapterDocs;
}

// ─────────────────────────────────────────────────────
// Step 2: Seed Verses with Word-by-Word Data
// ─────────────────────────────────────────────────────
async function seedVerses() {
  console.log('\n═══════════════════════════════════════');
  console.log('📝 STEP 2: Seeding Verses with Word-by-Word Data');
  console.log('═══════════════════════════════════════\n');

  // Find Bengali translation ID
  const bnTranslationId = await findBengaliTranslationId();
  // English translation: Saheeh International = 20
  const enTranslationId = 20;

  console.log(`  Bengali Translation ID: ${bnTranslationId || 'N/A (will use word-level only)'}`);
  console.log(`  English Translation ID: ${enTranslationId}\n`);

  await Verse.deleteMany({});

  let totalVerseCount = 0;
  let totalWordCount = 0;

  for (let chapterNum = 1; chapterNum <= 114; chapterNum++) {
    const startTime = Date.now();

    try {
      // Fetch word-by-word data in both languages
      console.log(`  📖 Chapter ${chapterNum}/114: Fetching WBW data...`);

      const [bnVerses, enVerses] = await Promise.all([
        fetchVersesWithWords(chapterNum, 'bn'),
        fetchVersesWithWords(chapterNum, 'en')
      ]);

      // Merge Bengali and English word data
      let mergedVerses = mergeWordData(bnVerses, enVerses);

      // Fetch full verse translations
      let bnTranslations = null;
      let enTranslations = null;

      if (bnTranslationId) {
        try {
          bnTranslations = await fetchVerseTranslations(chapterNum, bnTranslationId);
        } catch (e) {
          console.warn(`    ⚠️ Could not fetch Bengali translations for chapter ${chapterNum}`);
        }
      }

      try {
        enTranslations = await fetchVerseTranslations(chapterNum, enTranslationId);
      } catch (e) {
        console.warn(`    ⚠️ Could not fetch English translations for chapter ${chapterNum}`);
      }

      // Add translations to merged data
      mergedVerses = addTranslationsToVerses(mergedVerses, bnTranslations, enTranslations);

      // Insert into MongoDB
      await Verse.insertMany(mergedVerses);

      // Update chapter totalWords
      const chapterWordCount = mergedVerses.reduce((sum, v) => sum + v.totalWords, 0);
      await Chapter.updateOne(
        { chapterNumber: chapterNum },
        { totalWords: chapterWordCount }
      );

      totalVerseCount += mergedVerses.length;
      totalWordCount += chapterWordCount;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✅ Chapter ${chapterNum}: ${mergedVerses.length} verses, ${chapterWordCount} words (${elapsed}s)`);

      // Rate limiting: wait between chapters
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`  ❌ ERROR on chapter ${chapterNum}: ${error.message}`);
      console.error(`     Continuing to next chapter...`);
    }
  }

  console.log(`\n  📊 Total: ${totalVerseCount} verses, ${totalWordCount} words inserted\n`);
  return { totalVerseCount, totalWordCount };
}

// ─────────────────────────────────────────────────────
// Step 3: Data Integrity Verification
// ─────────────────────────────────────────────────────
async function verifyData() {
  console.log('\n═══════════════════════════════════════');
  console.log('🔍 STEP 3: Data Integrity Verification');
  console.log('═══════════════════════════════════════\n');

  const errors = [];

  // Check 1: 114 chapters
  const chapterCount = await Chapter.countDocuments();
  if (chapterCount !== 114) {
    errors.push(`Expected 114 chapters, found ${chapterCount}`);
  } else {
    console.log(`  ✅ Chapter count: ${chapterCount}/114`);
  }

  // Check 2: Total verse count (should be ~6236)
  const verseCount = await Verse.countDocuments();
  console.log(`  📊 Total verse count: ${verseCount}`);
  if (verseCount < 6200) {
    errors.push(`Expected ~6236 verses, found only ${verseCount}`);
  } else {
    console.log(`  ✅ Verse count looks correct: ${verseCount}`);
  }

  // Check 3: Each chapter has correct verse count
  const chapters = await Chapter.find().sort({ chapterNumber: 1 });
  let mismatches = 0;
  for (const ch of chapters) {
    const count = await Verse.countDocuments({ chapterNumber: ch.chapterNumber });
    if (count !== ch.versesCount) {
      errors.push(`Chapter ${ch.chapterNumber} (${ch.nameEnglish}): expected ${ch.versesCount} verses, found ${count}`);
      mismatches++;
    }
  }
  if (mismatches === 0) {
    console.log(`  ✅ All chapters have correct verse counts`);
  } else {
    console.log(`  ⚠️ ${mismatches} chapters have verse count mismatches`);
  }

  // Check 4: All verses have words
  const versesWithoutWords = await Verse.countDocuments({ 'words.0': { $exists: false } });
  if (versesWithoutWords > 0) {
    errors.push(`${versesWithoutWords} verses have no words`);
  } else {
    console.log(`  ✅ All verses have word data`);
  }

  // Check 5: Word data completeness
  const sampleVerse = await Verse.findOne({ verseKey: '108:1' });
  if (sampleVerse) {
    const word = sampleVerse.words.find(w => w.charType === 'word');
    console.log(`\n  📋 Sample Word (108:1):`);
    console.log(`     Arabic: ${word?.textArabic}`);
    console.log(`     Bengali: ${word?.translationBn}`);
    console.log(`     English: ${word?.translationEn}`);
    console.log(`     Transliteration: ${word?.transliteration}`);
    console.log(`     Audio: ${word?.audioUrl}`);
  }

  // Check 6: Difficulty order completeness
  const diffOrders = await Chapter.distinct('difficultyOrder');
  const expectedOrders = Array.from({ length: 114 }, (_, i) => i + 1);
  const missingOrders = expectedOrders.filter(o => !diffOrders.includes(o));
  if (missingOrders.length > 0) {
    errors.push(`Missing difficulty orders: ${missingOrders.join(', ')}`);
  } else {
    console.log(`  ✅ All 114 difficulty orders assigned`);
  }

  // Summary
  console.log('\n  ──────────────────────────');
  if (errors.length === 0) {
    console.log('  ✅ ALL CHECKS PASSED!');
  } else {
    console.log(`  ⚠️ ${errors.length} ISSUES FOUND:`);
    errors.forEach(e => console.log(`     ❌ ${e}`));
  }
  console.log('  ──────────────────────────\n');

  return errors;
}

// ─────────────────────────────────────────────────────
// Step 4: Export JSON Backup
// ─────────────────────────────────────────────────────
async function exportJsonBackup() {
  console.log('\n═══════════════════════════════════════');
  console.log('💾 STEP 4: Exporting JSON Backup');
  console.log('═══════════════════════════════════════\n');

  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });

  // Export chapters
  const chapters = await Chapter.find().sort({ difficultyOrder: 1 }).lean();
  await fs.writeFile(
    path.join(dataDir, 'chapters.json'),
    JSON.stringify(chapters, null, 2),
    'utf8'
  );
  console.log(`  ✅ Exported ${chapters.length} chapters to data/chapters.json`);

  // Export verses (chunked by chapter to avoid memory issues)
  const verseSummary = {};
  for (let ch = 1; ch <= 114; ch++) {
    const verses = await Verse.find({ chapterNumber: ch }).sort({ verseNumber: 1 }).lean();
    await fs.writeFile(
      path.join(dataDir, `verses_${String(ch).padStart(3, '0')}.json`),
      JSON.stringify(verses, null, 2),
      'utf8'
    );
    verseSummary[ch] = verses.length;
  }
  console.log(`  ✅ Exported verses for all 114 chapters to data/verses_XXX.json`);

  // Export summary
  await fs.writeFile(
    path.join(dataDir, 'seed_summary.json'),
    JSON.stringify({
      seedDate: new Date().toISOString(),
      totalChapters: chapters.length,
      versesByChapter: verseSummary,
      totalVerses: Object.values(verseSummary).reduce((a, b) => a + b, 0)
    }, null, 2),
    'utf8'
  );
  console.log(`  ✅ Exported seed summary to data/seed_summary.json\n`);
}

// ─────────────────────────────────────────────────────
// Main Execution
// ─────────────────────────────────────────────────────
async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   🕌 Quran Data Seeding Pipeline               ║');
  console.log('║   Learn Arabic with Quran                      ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Connect to MongoDB
    await connectDB();

    // Step 1: Seed chapters
    await seedChapters();

    // Step 2: Seed verses with word-by-word data
    await seedVerses();

    // Step 3: Verify data integrity
    const errors = await verifyData();

    // Step 4: Export JSON backup
    await exportJsonBackup();

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log(`║   ✅ SEEDING COMPLETE in ${elapsed} minutes`);
    console.log(`║   Issues: ${errors.length}`);
    console.log('╚═══════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

main();

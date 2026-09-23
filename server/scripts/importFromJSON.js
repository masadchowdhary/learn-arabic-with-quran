/**
 * importFromJSON.js
 * -----------------
 * Imports Quran data from local JSON files (server/data/) into MongoDB.
 * 
 * The seed script previously fetched data from Quran.com API and saved 
 * it as JSON files, but never inserted them into MongoDB. This script
 * completes that step.
 * 
 * Usage:  node scripts/importFromJSON.js
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// ─── Connect to MongoDB ────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/learn-arabic-quran';
  console.log(`\n🔌 Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected successfully\n');
}

// ─── Import Chapters ────────────────────────────────────
async function importChapters() {
  const chaptersFile = path.join(DATA_DIR, 'chapters.json');
  
  if (!fs.existsSync(chaptersFile)) {
    console.error('❌ chapters.json not found in', DATA_DIR);
    return 0;
  }

  const chaptersData = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
  console.log(`📖 Found ${chaptersData.length} chapters in chapters.json`);

  const db = mongoose.connection.db;
  const collection = db.collection('chapters');

  // Drop existing data to avoid duplicates
  const existingCount = await collection.countDocuments();
  if (existingCount > 0) {
    console.log(`   ⚠️  Dropping existing ${existingCount} chapters...`);
    await collection.deleteMany({});
  }

  // Clean the data: remove _id fields that are string ObjectIds (let MongoDB generate new ones)
  // and ensure all required fields are present
  const cleanedChapters = chaptersData.map(ch => {
    const doc = { ...ch };
    // Convert string _id to ObjectId if it's a valid hex string
    if (doc._id && typeof doc._id === 'string' && /^[a-f0-9]{24}$/.test(doc._id)) {
      doc._id = new mongoose.Types.ObjectId(doc._id);
    } else if (doc._id) {
      delete doc._id; // Remove invalid _id, let MongoDB generate
    }
    // Remove Mongoose version key if present
    delete doc.__v;
    return doc;
  });

  const result = await collection.insertMany(cleanedChapters, { ordered: false });
  console.log(`   ✅ Inserted ${result.insertedCount} chapters`);
  return result.insertedCount;
}

// ─── Import Verses ──────────────────────────────────────
async function importVerses() {
  const db = mongoose.connection.db;
  const collection = db.collection('verses');

  // Drop existing data
  const existingCount = await collection.countDocuments();
  if (existingCount > 0) {
    console.log(`   ⚠️  Dropping existing ${existingCount} verses...`);
    await collection.deleteMany({});
  }

  let totalInserted = 0;
  let totalVerses = 0;

  // Read all verse files (verses_001.json through verses_114.json)
  for (let chapterNum = 1; chapterNum <= 114; chapterNum++) {
    const paddedNum = String(chapterNum).padStart(3, '0');
    const versesFile = path.join(DATA_DIR, `verses_${paddedNum}.json`);

    if (!fs.existsSync(versesFile)) {
      console.error(`   ❌ Missing: verses_${paddedNum}.json`);
      continue;
    }

    const versesData = JSON.parse(fs.readFileSync(versesFile, 'utf-8'));
    totalVerses += versesData.length;

    // Clean the data
    const cleanedVerses = versesData.map(verse => {
      const doc = { ...verse };
      if (doc._id && typeof doc._id === 'string' && /^[a-f0-9]{24}$/.test(doc._id)) {
        doc._id = new mongoose.Types.ObjectId(doc._id);
      } else if (doc._id) {
        delete doc._id;
      }
      delete doc.__v;
      
      // Ensure words array exists
      if (!doc.words) doc.words = [];
      
      return doc;
    });

    if (cleanedVerses.length > 0) {
      const result = await collection.insertMany(cleanedVerses, { ordered: false });
      totalInserted += result.insertedCount;
    }

    // Progress indicator
    if (chapterNum % 10 === 0 || chapterNum === 114) {
      console.log(`   📄 Imported chapters 1-${chapterNum}: ${totalInserted} verses so far...`);
    }
  }

  console.log(`   ✅ Inserted ${totalInserted} verses total (from ${totalVerses} in JSON files)`);
  return totalInserted;
}

// ─── Create Indexes ─────────────────────────────────────
async function createIndexes() {
  const db = mongoose.connection.db;

  console.log('\n📇 Creating indexes...');

  // Chapters indexes
  const chapters = db.collection('chapters');
  await chapters.createIndex({ chapterNumber: 1 }, { unique: true });
  await chapters.createIndex({ difficultyOrder: 1 }, { unique: true });
  console.log('   ✅ Chapter indexes created');

  // Verses indexes
  const verses = db.collection('verses');
  await verses.createIndex({ verseKey: 1 }, { unique: true });
  await verses.createIndex({ chapterNumber: 1, verseNumber: 1 });
  await verses.createIndex({ chapterNumber: 1 });
  console.log('   ✅ Verse indexes created');
}

// ─── Verify Data Integrity ──────────────────────────────
async function verifyData() {
  const db = mongoose.connection.db;

  console.log('\n🔍 Verifying data integrity...');

  // Check chapter count
  const chapterCount = await db.collection('chapters').countDocuments();
  const chapterOk = chapterCount === 114;
  console.log(`   ${chapterOk ? '✅' : '❌'} Chapters: ${chapterCount}/114`);

  // Check verse count
  const verseCount = await db.collection('verses').countDocuments();
  const verseOk = verseCount === 6236;
  console.log(`   ${verseOk ? '✅' : '❌'} Verses: ${verseCount}/6236`);

  // Check that every verse has at least one word
  const versesWithoutWords = await db.collection('verses').countDocuments({
    $or: [
      { words: { $exists: false } },
      { words: { $size: 0 } }
    ]
  });
  const wordsOk = versesWithoutWords === 0;
  console.log(`   ${wordsOk ? '✅' : '❌'} Verses without words: ${versesWithoutWords}`);

  // Check difficulty order completeness
  const distinctDiffOrders = await db.collection('chapters').distinct('difficultyOrder');
  const diffOk = distinctDiffOrders.length === 114;
  console.log(`   ${diffOk ? '✅' : '❌'} Unique difficulty orders: ${distinctDiffOrders.length}/114`);

  // Check first difficulty order is Al-Kawthar (108)
  const first = await db.collection('chapters').findOne({ difficultyOrder: 1 });
  const firstOk = first && first.chapterNumber === 108;
  console.log(`   ${firstOk ? '✅' : '❌'} First surah by difficulty: ${first ? `${first.nameEnglish} (#${first.chapterNumber})` : 'NOT FOUND'}`);

  // Check Bengali translations exist
  const versesWithBnTranslation = await db.collection('verses').countDocuments({
    translationBn: { $exists: true, $ne: '' }
  });
  console.log(`   📊 Verses with Bengali translation: ${versesWithBnTranslation}/${verseCount}`);

  // Check English translations exist
  const versesWithEnTranslation = await db.collection('verses').countDocuments({
    translationEn: { $exists: true, $ne: '' }
  });
  console.log(`   📊 Verses with English translation: ${versesWithEnTranslation}/${verseCount}`);

  // Sample check: verify Al-Kawthar (108) has 3 verses with correct data
  const kawtharVerses = await db.collection('verses').find({ chapterNumber: 108 }).sort({ verseNumber: 1 }).toArray();
  console.log(`\n   📖 Sample: Surah Al-Kawthar (108):`);
  for (const v of kawtharVerses) {
    const wordCount = v.words ? v.words.filter(w => w.charType === 'word').length : 0;
    console.log(`      Ayah ${v.verseNumber}: ${wordCount} words | BN: "${(v.translationBn || '').substring(0, 40)}..." | EN: "${(v.translationEn || '').substring(0, 40)}..."`);
  }

  return chapterOk && verseOk && wordsOk;
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   🕌 Learn Arabic with Quran — Data Import        ║');
  console.log('║   Importing JSON data into MongoDB                ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  try {
    await connectDB();

    // Step 1: Import chapters
    console.log('── Step 1: Importing Chapters ──────────────────────');
    const chaptersImported = await importChapters();

    // Step 2: Import verses
    console.log('\n── Step 2: Importing Verses ────────────────────────');
    const versesImported = await importVerses();

    // Step 3: Create indexes
    await createIndexes();

    // Step 4: Verify
    const isValid = await verifyData();

    // Summary
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  📊 Import Summary:`);
    console.log(`     Chapters imported: ${chaptersImported}`);
    console.log(`     Verses imported:   ${versesImported}`);
    console.log(`     Data valid:        ${isValid ? '✅ YES' : '❌ NO — check errors above'}`);
    console.log('══════════════════════════════════════════════════\n');

    if (isValid) {
      console.log('🎉 Data import complete! The database is ready.\n');
    } else {
      console.log('⚠️  Data import completed with warnings. Please review the output above.\n');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected.\n');
  }
}

main();

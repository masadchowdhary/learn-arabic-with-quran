import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chapter from './models/Chapter.js';
import Verse from './models/Verse.js';

dotenv.config();

async function verifyData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const chapterCount = await Chapter.countDocuments();
    console.log(`Total Chapters in DB: ${chapterCount}`);

    const verseCount = await Verse.countDocuments();
    console.log(`Total Verses in DB: ${verseCount}`);

    const fatihah = await Verse.countDocuments({ chapterNumber: 1 });
    console.log(`Verses in Chapter 1: ${fatihah}`);

    const baqarah = await Verse.countDocuments({ chapterNumber: 2 });
    console.log(`Verses in Chapter 2: ${baqarah}`);

    const kawthar = await Verse.countDocuments({ chapterNumber: 108 });
    console.log(`Verses in Chapter 108: ${kawthar}`);

  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyData();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Verse from './models/Verse.js';

dotenv.config();

async function testAudioUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch a verse and check audio URL
    const verse = await Verse.findOne({ chapterNumber: 108 });
    if (verse) {
      console.log('Verse audio URL:', verse.audioUrl);
      console.log('Sample word audio URL:', verse.words[0]?.audioUrl);
    } else {
      console.log('No verse found for chapter 108');
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAudioUrls();

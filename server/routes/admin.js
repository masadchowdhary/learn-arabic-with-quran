import express from 'express';
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

const router = express.Router();

const MANUAL_DIFFICULTY_ORDER = [
  108, 103, 110, 112, 1, 106, 113, 114, 111, 105, 107, 109, 102, 104, 101, 99, 97, 95, 100, 98, 94, 93, 96, 91, 90, 89, 92, 88, 87, 86
];

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

router.post('/seed-chapter/:chapterNum', async (req, res, next) => {
  try {
    const chapterNum = parseInt(req.params.chapterNum);
    
    // 1. Fetch chapter info and calculate difficulty order
    const chapters = await fetchAllChapters();
    const difficultyOrder = computeDifficultyOrder(chapters);
    const ch = chapters.find(c => c.id === chapterNum);
    
    if (!ch) return res.status(404).json({ success: false, message: 'Chapter not found' });
    
    let bnInfo = null;
    try {
      bnInfo = await fetchChapterInfo(ch.id, 'bn');
    } catch (e) {
      console.warn(`⚠️ Could not fetch Bengali info for chapter ${ch.id}`);
    }
    
    // 2. Fetch Verses
    const bnTranslationId = await findBengaliTranslationId();
    const enTranslationId = 20;
    
    const [bnVerses, enVerses] = await Promise.all([
      fetchVersesWithWords(chapterNum, 'bn'),
      fetchVersesWithWords(chapterNum, 'en')
    ]);
    
    let mergedVerses = mergeWordData(bnVerses, enVerses);
    
    let bnTranslations = null, enTranslations = null;
    if (bnTranslationId) {
      try { bnTranslations = await fetchVerseTranslations(chapterNum, bnTranslationId); } catch(e) {}
    }
    try { enTranslations = await fetchVerseTranslations(chapterNum, enTranslationId); } catch(e) {}
    
    mergedVerses = addTranslationsToVerses(mergedVerses, bnTranslations, enTranslations);
    const chapterWordCount = mergedVerses.reduce((sum, v) => sum + v.totalWords, 0);
    
    // 3. Update DB
    await Chapter.findOneAndUpdate(
      { chapterNumber: chapterNum },
      {
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
        totalWords: chapterWordCount,
        juzNumbers: [],
        pages: ch.pages || []
      },
      { upsert: true, new: true }
    );
    
    await Verse.deleteMany({ chapterNumber: chapterNum });
    await Verse.insertMany(mergedVerses);
    
    res.json({ success: true, message: `Seeded chapter ${chapterNum}`, versesCount: mergedVerses.length });
  } catch (error) {
    next(error);
  }
});

export default router;

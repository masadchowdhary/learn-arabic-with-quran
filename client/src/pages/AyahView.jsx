import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { chapterAPI, verseAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

const QURAN_AUDIO_BASE = import.meta.env.VITE_QURAN_AUDIO_BASE || 'https://audio.qurancdn.com';

// Must match server/routes/practice.js
const LEARNED_LEVEL = 3;

function wordScore(rec) {
  if (!rec) return 0;
  if (rec.level >= LEARNED_LEVEL) return 1;
  return Math.min(rec.correct || 0, LEARNED_LEVEL - 1) / LEARNED_LEVEL;
}

function computeProgress(arabicWords, wordLevels) {
  const unique = [...new Set(arabicWords)];
  let score = 0;
  let learned = 0;
  for (const w of unique) {
    const s = wordScore(wordLevels[w]);
    score += s;
    if (s >= 1) learned++;
  }
  const total = unique.length;
  const percent = total === 0 ? 0 : learned === total ? 100 : Math.min(99, Math.floor((score / total) * 100));
  return { total, learned, percent, completed: total > 0 && learned === total };
}

export default function AyahView() {
  const { chapterNum, verseNum } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [wordLevels, setWordLevels] = useState(null);

  // Audio state
  const [playingWord, setPlayingWord] = useState(null);
  const audioRef = useRef(null);

  // Fetch data only when chapter changes
  useEffect(() => {
    fetchData();
  }, [chapterNum]);

  // User progress is loaded separately so it never delays the page itself
  useEffect(() => {
    if (!isAuthenticated) {
      setWordLevels(null);
      return;
    }
    let cancelled = false;
    chapterAPI.getProgress(chapterNum)
      .then(res => { if (!cancelled) setWordLevels(res.data.wordLevels || {}); })
      .catch(() => { if (!cancelled) setWordLevels(null); });
    return () => { cancelled = true; };
  }, [chapterNum, isAuthenticated]);

  // Update current verse when URL verseNum changes, without re-fetching
  useEffect(() => {
    if (verses.length > 0) {
      let initialIndex = 0;
      if (verseNum) {
        const vIndex = parseInt(verseNum, 10) - 1;
        if (vIndex >= 0 && vIndex < verses.length) {
          initialIndex = vIndex;
        }
      }
      setCurrentAyahIndex(initialIndex);
    }
  }, [verseNum, verses]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [chapRes, verseRes] = await Promise.all([
        chapterAPI.getOne(chapterNum),
        verseAPI.getByChapter(chapterNum)
      ]);
      setChapter(chapRes.data.chapter);
      setVerses(verseRes.data.verses);
    } catch (err) {
      setError('আয়াত লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  // Per-verse + surah progress, computed live from the user's word mastery
  const progress = useMemo(() => {
    if (!wordLevels || verses.length === 0) return null;
    const perVerse = verses.map(v =>
      computeProgress(v.words.filter(w => w.charType === 'word').map(w => w.textArabic), wordLevels)
    );
    const allWords = verses.flatMap(v => v.words.filter(w => w.charType === 'word').map(w => w.textArabic));
    const chapterProg = computeProgress(allWords, wordLevels);
    return {
      perVerse,
      chapter: chapterProg,
      versesCompleted: perVerse.filter(p => p.completed).length
    };
  }, [wordLevels, verses]);

  const playAudio = (url, wordId) => {
    if (!url) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const fullUrl = url.startsWith('http') ? url : `${QURAN_AUDIO_BASE}/${url}`;
    const audio = new Audio(fullUrl);
    audioRef.current = audio;
    
    setPlayingWord(wordId);
    
    audio.play().catch(e => {
      console.error("Audio playback failed:", e);
      setPlayingWord(null);
    });
    
    audio.onended = () => {
      setPlayingWord(null);
    };
  };

  const handleNext = () => {
    if (currentAyahIndex < verses.length - 1) {
      navigate(`/surah/${chapterNum}/verse/${currentAyahIndex + 2}`, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentAyahIndex > 0) {
      navigate(`/surah/${chapterNum}/verse/${currentAyahIndex}`, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToAyah = (index) => {
    navigate(`/surah/${chapterNum}/verse/${index + 1}`, { replace: true });
  };

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  const currentVerse = verses[currentAyahIndex];
  const currentVerseProg = progress?.perVerse[currentAyahIndex];
  const practiceLink = `/practice?chapter=${chapterNum}&verse=${currentAyahIndex + 1}`;

  return (
    <div className="page container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="text-arabic" style={{ fontSize: 'var(--font-size-3xl)' }}>
          {chapter.nameArabic}
        </h1>
        <h2 style={{ fontFamily: 'var(--font-bengali)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
          {chapter.translatedNameBn || chapter.nameBengali || chapter.nameEnglish}
        </h2>
        
        <Link to={practiceLink} id="practice-verse-btn" className="btn btn-accent">
          🚀 আয়াত {currentAyahIndex + 1}-এর শব্দ প্রাকটিস করুন
        </Link>
      </div>

      {/* Learning progress (logged-in users) */}
      {progress && (
        <div className="card ayah-progress-card">
          <div className="ayah-progress-item">
            <div className="ayah-progress-head">
              <span>সূরা প্রগ্রেস</span>
              <strong>{progress.chapter.percent}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill gold" style={{ width: `${progress.chapter.percent}%` }}></div>
            </div>
            <div className="ayah-progress-detail">
              {progress.versesCompleted}/{verses.length} আয়াত সম্পূর্ণ • {progress.chapter.learned}/{progress.chapter.total} শব্দ শেখা
            </div>
          </div>
          {currentVerseProg && (
            <div className="ayah-progress-item">
              <div className="ayah-progress-head">
                <span>আয়াত {currentAyahIndex + 1}</span>
                <strong>{currentVerseProg.completed ? '✅ 100%' : `${currentVerseProg.percent}%`}</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${currentVerseProg.percent}%` }}></div>
              </div>
              <div className="ayah-progress-detail">
                {currentVerseProg.learned}/{currentVerseProg.total} শব্দ পুরোপুরি শেখা
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ayah map */}
      <div className="ayah-map" role="navigation" aria-label="আয়াত নেভিগেশন">
        {verses.map((v, idx) => {
          const p = progress?.perVerse[idx];
          let cls = 'ayah-chip';
          if (p?.completed) cls += ' completed';
          else if (p && p.percent > 0) cls += ' in-progress';
          if (idx === currentAyahIndex) cls += ' current';
          return (
            <button
              key={v.verseKey}
              id={`ayah-chip-${v.verseNumber}`}
              className={cls}
              onClick={() => goToAyah(idx)}
              title={p ? `আয়াত ${v.verseNumber}: ${p.percent}%` : `আয়াত ${v.verseNumber}`}
              style={p && !p.completed && p.percent > 0 ? { '--chip-fill': `${p.percent}%` } : undefined}
            >
              {v.verseNumber}
            </button>
          );
        })}
      </div>

      {/* Progress Bar (Duolingo Style) */}
      <div style={{ marginBottom: 'var(--space-6)', maxWidth: '900px', margin: '0 auto var(--space-6) auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>আয়াত {currentAyahIndex + 1} / {verses.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${((currentAyahIndex + 1) / verses.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Single Verse Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', maxWidth: '900px', margin: '0 auto' }}>
        {currentVerse && (
          <div className="card">
            {/* Verse Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <span className="badge badge-primary">আয়াত {currentVerse.verseNumber}</span>
              <button 
                className={`audio-btn ${playingWord === currentVerse.verseKey ? 'playing' : ''}`}
                onClick={() => {
                  const c = chapterNum.toString().padStart(3, '0');
                  const v = currentVerse.verseNumber.toString().padStart(3, '0');
                  const verseAudioUrl = `${QURAN_AUDIO_BASE}/Alafasy/mp3/${c}${v}.mp3`;
                  playAudio(verseAudioUrl, currentVerse.verseKey);
                }}
                title="সম্পূর্ণ আয়াত শুনুন"
              >
                🔊
              </button>
            </div>

            {/* Word by Word Grid */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 'var(--space-4)', 
              justifyContent: 'flex-end', // RTL visual flow
              direction: 'rtl',
              marginBottom: 'var(--space-6)'
            }}>
              {currentVerse.words.map((word, idx) => {
                if (word.charType === 'end') {
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      border: '2px solid var(--color-primary-light)', color: 'var(--color-primary-light)',
                      fontFamily: 'var(--font-arabic)', fontSize: 'var(--font-size-lg)',
                      alignSelf: 'center'
                    }}>
                      {currentVerse.verseNumber}
                    </div>
                  );
                }

                const rec = wordLevels?.[word.textArabic];
                const wordState = !wordLevels ? '' : wordScore(rec) >= 1 ? 'learned' : rec ? 'learning' : '';

                return (
                  <div key={idx} className={`word-card ${wordState}`} onClick={() => playAudio(word.audioUrl, word.textArabic + idx)}>
                    {wordState === 'learned' && <span className="word-state-badge" title="শেখা হয়েছে">✓</span>}
                    <div className="arabic">{word.textArabic}</div>
                    <div className="transliteration">{word.transliteration}</div>
                    <div className="translation-bn">{word.translationBn}</div>
                    {wordState === 'learning' && (
                      <div className="word-dots" title={`${Math.min(rec.correct, LEARNED_LEVEL)}/${LEARNED_LEVEL} বার সঠিক`}>
                        {Array.from({ length: LEARNED_LEVEL }).map((_, i) => (
                          <span key={i} className={i < Math.min(rec.correct, LEARNED_LEVEL) ? 'filled' : ''}></span>
                        ))}
                      </div>
                    )}
                    {playingWord === word.textArabic + idx && (
                      <div style={{ color: 'var(--color-primary-light)', fontSize: 'var(--font-size-xs)' }}>🔊</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Full Translations */}
            <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div className="verse-translation bengali" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>বাংলা:</strong> {currentVerse.translationBn}
              </div>
              <div className="verse-translation">
                <strong>English:</strong> {currentVerse.translationEn}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Navigation (Duolingo Style Fixed Bottom Navigation) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        gap: 'var(--space-4)',
        marginTop: 'var(--space-8)',
        maxWidth: '900px',
        margin: 'var(--space-8) auto 0 auto',
        padding: 'var(--space-4) 0',
      }}>
        <button 
          className="btn btn-outline" 
          onClick={handlePrev}
          disabled={currentAyahIndex === 0}
          style={{ flex: 1 }}
        >
          পূর্ববর্তী
        </button>

        {currentAyahIndex < verses.length - 1 ? (
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            style={{ flex: 2 }}
          >
            পরবর্তী আয়াত
          </button>
        ) : (
          <Link to={practiceLink} className="btn btn-accent" style={{ flex: 2, justifyContent: 'center' }}>
            🚀 এই আয়াত প্রাকটিস করুন
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
        <Link to="/surahs" className="btn btn-ghost">
          সূরা তালিকায় ফিরে যান
        </Link>
      </div>
    </div>
  );
}

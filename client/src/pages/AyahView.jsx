import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chapterAPI, verseAPI } from '../api';
import Loading from '../components/common/Loading';

const QURAN_AUDIO_BASE = import.meta.env.VITE_QURAN_AUDIO_BASE || 'https://audio.qurancdn.com';

export default function AyahView() {
  const { chapterNum } = useParams();
  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);

  // Audio state
  const [playingWord, setPlayingWord] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [chapterNum]);

  const fetchData = async () => {
    try {
      const [chapRes, verseRes] = await Promise.all([
        chapterAPI.getOne(chapterNum),
        verseAPI.getByChapter(chapterNum)
      ]);
      setChapter(chapRes.data.chapter);
      setVerses(verseRes.data.verses);
      setCurrentAyahIndex(0);
    } catch (err) {
      setError('আয়াত লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

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
      setCurrentAyahIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentAyahIndex > 0) {
      setCurrentAyahIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  const currentVerse = verses[currentAyahIndex];

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
        
        <Link to={`/practice?chapter=${chapterNum}`} className="btn btn-accent">
          🚀 শব্দ প্রাকটিস করুন
        </Link>
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

                return (
                  <div key={idx} className="word-card" onClick={() => playAudio(word.audioUrl, word.textArabic + idx)}>
                    <div className="arabic">{word.textArabic}</div>
                    <div className="transliteration">{word.transliteration}</div>
                    <div className="translation-bn">{word.translationBn}</div>
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
          <Link to={`/practice?chapter=${chapterNum}`} className="btn btn-accent" style={{ flex: 2, justifyContent: 'center' }}>
            🚀 প্রাকটিস শুরু করুন
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

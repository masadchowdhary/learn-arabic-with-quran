import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chapterAPI, verseAPI } from '../api';
import Loading from '../components/common/Loading';

export default function AyahView() {
  const { chapterNum } = useParams();
  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  
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
    
    // Quran.com audio URLs need the base prefix if they don't have it
    const fullUrl = url.startsWith('http') ? url : `https://audio.qurancdn.com/${url}`;
    
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

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  return (
    <div className="page container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <h1 className="text-arabic" style={{ fontSize: 'var(--font-size-4xl)' }}>
          {chapter.nameArabic}
        </h1>
        <h2 style={{ fontFamily: 'var(--font-bengali)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
          {chapter.translatedNameBn || chapter.nameBengali || chapter.nameEnglish}
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <Link to={`/practice?chapter=${chapterNum}`} className="btn btn-primary">
            🎴 এই সূরা প্রাকটিস করুন
          </Link>
          <Link to="/surahs" className="btn btn-outline">
            ফিরে যান
          </Link>
        </div>
      </div>

      {/* Verses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', maxWidth: '900px', margin: '0 auto' }}>
        {verses.slice(0, visibleCount).map((verse) => (
          <div key={verse.verseKey} className="card">
            {/* Verse Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <span className="badge badge-primary">আয়াত {verse.verseNumber}</span>
              <button 
                className={`audio-btn ${playingWord === verse.verseKey ? 'playing' : ''}`}
                onClick={() => playAudio(verse.audioUrl, verse.verseKey)}
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
              {verse.words.map((word, idx) => {
                if (word.charType === 'end') {
                  return (
                    <div key={idx} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      border: '2px solid var(--color-primary-light)', color: 'var(--color-primary-light)',
                      fontFamily: 'var(--font-arabic)', fontSize: 'var(--font-size-lg)',
                      alignSelf: 'center'
                    }}>
                      {verse.verseNumber}
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
                <strong>বাংলা:</strong> {verse.translationBn}
              </div>
              <div className="verse-translation">
                <strong>English:</strong> {verse.translationEn}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {visibleCount < verses.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => setVisibleCount(prev => prev + 20)}
          >
            আরো আয়াত লোড করুন (Load More)
          </button>
        </div>
      )}
      
      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-10)' }}>
        <Link to={`/practice?chapter=${chapterNum}`} className="btn btn-primary btn-lg">
          🚀 প্রাকটিস শুরু করুন
        </Link>
      </div>
    </div>
  );
}

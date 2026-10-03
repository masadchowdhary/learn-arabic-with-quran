import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { practiceAPI } from '../api';
import Loading from '../components/common/Loading';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

const QURAN_AUDIO_BASE = import.meta.env.VITE_QURAN_AUDIO_BASE || 'https://audio.qurancdn.com';
const CORRECT_DELAY = 900;
const WRONG_DELAY = 1700;

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ProgressRow({ label, percent, detail, gold }) {
  return (
    <div className="summary-progress-row">
      <div className="summary-progress-head">
        <span>{label}</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-bar progress-bar-lg">
        <div className={`progress-bar-fill ${gold ? 'gold' : ''}`} style={{ width: `${percent}%` }}></div>
      </div>
      {detail && <div className="summary-progress-detail">{detail}</div>}
    </div>
  );
}

export default function PracticeSession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterNumber = searchParams.get('chapter');
  const verseParam = searchParams.get('verse');
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  // MCQ state
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [xpPopups, setXpPopups] = useState([]);
  const [leveledUp, setLeveledUp] = useState(false);

  const resultsRef = useRef([]);
  const retriedRef = useRef(new Set());
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const startSession = useCallback(async (verseNumber) => {
    clearTimeout(timerRef.current);
    try {
      setLoading(true);
      setError('');
      setSummary(null);
      setLeveledUp(false);
      setSelectedChoice(null);
      setShowAnswer(false);
      setIsFlipped(false);
      setCurrentIndex(0);
      resultsRef.current = [];
      retriedRef.current = new Set();

      const res = await practiceAPI.generateSession({
        chapterNumber: parseInt(chapterNumber),
        verseNumber: verseNumber ? parseInt(verseNumber) : undefined,
        sessionSize: 10
      });

      setSession(res.data.session);
      startTimeRef.current = Date.now();
    } catch (err) {
      setError(err.response?.data?.message || 'সেশন তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  }, [chapterNumber]);

  useEffect(() => {
    if (!chapterNumber) {
      navigate('/surahs');
      return;
    }
    startSession(verseParam);
  }, [chapterNumber, verseParam, startSession, navigate]);

  // Cleanup pending timers / audio on unmount
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    audioRef.current?.pause();
  }, []);

  const submitResults = async (finalResults) => {
    try {
      setSubmitting(true);
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const res = await practiceAPI.submitResults({
        chapterNumber: parseInt(chapterNumber),
        verseKey: session?.verseKey,
        results: finalResults,
        duration
      });

      const s = res.data.summary;
      setSummary(s);

      if (user && !s.isGuest) {
        if (s.level > (user.level || 1)) {
          setLeveledUp(true);
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#F2A900', '#FFD166', '#FFFFFF'] });
        } else if (s.accuracy >= 70 || s.progress?.newlyCompletedVerses?.length) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0A6847', '#F2A900', '#34D399'] });
        }
        // Update navbar stats locally — no extra /auth/me round-trip needed
        updateUser({ xp: s.totalXp, level: s.level, streak: s.streak });
      }
    } catch (err) {
      setError('ফলাফল সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const playAudio = (url) => {
    if (!url) return;
    audioRef.current?.pause();
    const fullUrl = url.startsWith('http') ? url : `${QURAN_AUDIO_BASE}/${url}`;
    const audio = new Audio(fullUrl);
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const handleChoice = (choice) => {
    if (showAnswer || submitting) return;

    setSelectedChoice(choice.translationBn);
    setShowAnswer(true);
    setIsFlipped(true); // reveal meaning + transliteration as feedback

    const word = session.words[currentIndex];
    const newResults = [...resultsRef.current, {
      wordArabic: word.textArabic,
      correct: choice.isCorrect,
      verseKey: word.verseKey,
      translationBn: word.translationBn,
      translationEn: word.translationEn,
      transliteration: word.transliteration
    }];
    resultsRef.current = newResults;

    // Wrong answer → ask this word once more at the end of the session
    let words = session.words;
    if (!choice.isCorrect && !retriedRef.current.has(word.textArabic)) {
      retriedRef.current.add(word.textArabic);
      words = [...words, { ...word, isRetry: true, choices: shuffleArr(word.choices) }];
      setSession(prev => ({ ...prev, words }));
    }

    if (choice.isCorrect && user) {
      const popupId = Date.now();
      setXpPopups(prev => [...prev, { id: popupId, text: '+10 XP' }]);
      setTimeout(() => setXpPopups(prev => prev.filter(p => p.id !== popupId)), 1500);
    }

    const isLast = currentIndex >= words.length - 1;
    timerRef.current = setTimeout(() => {
      if (isLast) {
        submitResults(newResults);
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedChoice(null);
        setShowAnswer(false);
        setIsFlipped(false);
      }
    }, choice.isCorrect ? CORRECT_DELAY : WRONG_DELAY);
  };

  const goToVerse = (verseNumber) => {
    setSearchParams({ chapter: chapterNumber, verse: String(verseNumber) });
  };

  if (loading) return <Loading message="ফ্ল্যাশকার্ড তৈরি হচ্ছে..." />;
  if (submitting) return <Loading message="ফলাফল সেভ হচ্ছে..." />;

  if (error) {
    return (
      <div className="page container">
        <div className="empty-state">
          <p style={{ marginBottom: 'var(--space-4)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => startSession(session?.verseNumber || verseParam)}>
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const verseNumber = session.verseNumber;
  const nextVerse = verseNumber < session.totalVerses ? verseNumber + 1 : null;

  // ─── Summary screen ───────────────────────────────────
  if (summary) {
    const prog = summary.progress;
    const verseProg = prog?.verse;
    const chapterProg = prog?.chapter;
    const justCompletedThisVerse = prog?.newlyCompletedVerses?.includes(verseNumber);

    return (
      <div className="page container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card animate-scale-in" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', padding: 'var(--space-8)' }}>
          {leveledUp && (
            <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', color: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-gold-glow)' }}>
              <h2 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>অভিনন্দন! 🌟</h2>
              <p style={{ fontWeight: 'bold' }}>আপনি লেভেল {summary.level}-এ উন্নীত হয়েছেন!</p>
            </div>
          )}
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
            {justCompletedThisVerse ? '🎉' : summary.accuracy >= 80 ? '🏆' : summary.accuracy >= 50 ? '👍' : '💪'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-1)' }}>
            {justCompletedThisVerse ? `আয়াত ${verseNumber} সম্পূর্ণ হয়েছে!` : 'সেশন সম্পন্ন হয়েছে!'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-3)' }}>
            {session.chapterName && `${session.chapterName} • `}আয়াত {verseNumber}
          </p>
          {summary.isGuest ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-6)' }}>
              লগইন না থাকায় আপনার প্রগ্রেস সেভ হয়নি।
            </p>
          ) : (
            <p style={{ color: 'var(--color-primary-light)', fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--space-6)' }}>
              +{summary.xpEarned} XP
            </p>
          )}

          <div className="grid-stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--space-6)' }}>
            <div className="stat-card" style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="stat-value">{summary.accuracy}%</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>সঠিক উত্তর</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="stat-value">{summary.wordsCorrect}/{summary.wordsAttempted}</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>উত্তর</div>
            </div>
          </div>

          {/* Ayah + Surah progress */}
          {verseProg && chapterProg && (
            <div className="summary-progress">
              <ProgressRow
                label={`আয়াত ${verseNumber} প্রগ্রেস`}
                percent={verseProg.masteryPercentage}
                detail={`${verseProg.masteredWords}/${verseProg.totalWords} শব্দ পুরোপুরি শেখা হয়েছে`}
              />
              <ProgressRow
                label="সূরা প্রগ্রেস"
                percent={chapterProg.masteryPercentage}
                detail={`${chapterProg.versesCompleted}/${chapterProg.totalVerses} আয়াত সম্পূর্ণ`}
                gold
              />
              {prog.chapterJustCompleted && (
                <div className="badge badge-accent" style={{ display: 'block', padding: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  🏅 পুরো সূরা সম্পূর্ণ! +200 XP
                </div>
              )}
              {!verseProg.completed && (
                <p className="summary-progress-hint">
                  💡 প্রতিটি শব্দ ৩ বার সঠিক উত্তর দিলে "শেখা" হিসেবে গণ্য হয়। আয়াতটি আবার প্রাকটিস করে ১০০% করুন।
                </p>
              )}
            </div>
          )}

          {summary.newBadges && summary.newBadges.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h4 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>নতুন অর্জন!</h4>
              {summary.newBadges.map((badge, idx) => (
                <div key={idx} className="badge badge-accent" style={{ display: 'block', padding: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  {badge}
                </div>
              ))}
            </div>
          )}

          {summary.isGuest && (
            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ marginBottom: 'var(--space-3)' }}>আপনার প্রগ্রেস এবং XP সেভ করতে লগইন করুন!</p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <Link to="/login" className="btn btn-primary btn-sm">লগইন</Link>
                <Link to="/register" className="btn btn-outline btn-sm">রেজিস্টার</Link>
              </div>
            </div>
          )}

          <div className="summary-actions">
            <button id="practice-again-btn" onClick={() => startSession(verseNumber)} className="btn btn-outline">
              🔁 এই আয়াত আবার
            </button>
            {nextVerse ? (
              <button id="practice-next-verse-btn" onClick={() => goToVerse(nextVerse)} className="btn btn-primary">
                পরবর্তী আয়াত ({nextVerse}) →
              </button>
            ) : (
              <Link to={summary.isGuest ? '/surahs' : '/dashboard'} className="btn btn-primary">
                {summary.isGuest ? 'সূরা তালিকা' : 'ড্যাশবোর্ড'}
              </Link>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-3)' }}>
            <Link to={`/surah/${chapterNumber}/verse/${verseNumber}`} className="btn btn-ghost btn-sm">
              📖 আয়াতটি পড়ুন
            </Link>
            {nextVerse && !summary.isGuest && (
              <Link to="/dashboard" className="btn btn-ghost btn-sm">ড্যাশবোর্ড</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentWord = session.words[currentIndex];
  if (!currentWord) {
    return (
      <div className="page container">
        <div className="empty-state">এই আয়াতে প্রাকটিস করার মতো শব্দ পাওয়া যায়নি।</div>
      </div>
    );
  }

  const badgeLabel = currentWord.isRetry ? 'আবার চেষ্টা' : currentWord.isReview ? 'রিভিউ' : currentWord.isNew ? 'নতুন শব্দ' : 'অনুশীলন';

  return (
    <div className="container practice-page" style={{ maxWidth: '800px' }}>
      {/* XP Popups */}
      {xpPopups.map(popup => (
        <div key={popup.id} className="xp-popup">
          {popup.text}
        </div>
      ))}

      <div className="practice-page-content">
        {/* Progress Header */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="practice-context">
            <Link to={`/surah/${chapterNumber}/verse/${verseNumber}`} className="practice-context-link">
              {session.chapterNameArabic && <span className="text-arabic">{session.chapterNameArabic}</span>}
              <span>{session.chapterName ? `${session.chapterName} • ` : ''}আয়াত {verseNumber}/{session.totalVerses}</span>
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-bengali)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>শব্দ {currentIndex + 1} / {session.words.length}</span>
            <span className="badge badge-primary">{badgeLabel}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(currentIndex / session.words.length) * 100}%` }}></div>
          </div>
        </div>

        {/* Main Practice Area */}
        <div className="practice-area">

          {/* The Card */}
          <div className="practice-flashcard-wrapper">
            <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                {/* Front: Arabic */}
                <div className="flashcard-face flashcard-front">
                  <div className="flashcard-arabic">{currentWord.textArabic}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
                    অর্থ দেখতে ট্যাপ করুন
                  </div>
                  {currentWord.audioUrl && (
                    <button
                      className="audio-btn"
                      style={{ marginTop: 'var(--space-3)' }}
                      onClick={(e) => { e.stopPropagation(); playAudio(currentWord.audioUrl); }}
                      title="উচ্চারণ শুনুন"
                    >
                      🔊
                    </button>
                  )}
                </div>

                {/* Back: Translation */}
                <div className="flashcard-face flashcard-back">
                  <div className="flashcard-arabic" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-4)' }}>
                    {currentWord.textArabic}
                  </div>
                  <div style={{ fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-xl)', color: 'var(--color-accent)' }}>
                    {currentWord.translationBn}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: 'var(--space-2)' }}>
                    {currentWord.transliteration}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MCQ Choices */}
          <div className="practice-choices-wrapper">
            <h3 style={{ fontFamily: 'var(--font-bengali)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
              সঠিক অর্থটি নির্বাচন করুন:
            </h3>

            <div className="grid-choices">
              {currentWord.choices.map((choice, idx) => {
                let btnClass = "choice-btn";
                if (showAnswer) {
                  if (choice.isCorrect) btnClass += " correct";
                  else if (selectedChoice === choice.translationBn) btnClass += " incorrect";
                }

                return (
                  <button
                    key={`${currentIndex}-${idx}`}
                    id={`choice-${idx}`}
                    className={btnClass}
                    onClick={() => handleChoice(choice)}
                    disabled={showAnswer}
                  >
                    {choice.translationBn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

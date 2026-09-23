import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { practiceAPI } from '../api';
import Loading from '../components/common/Loading';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function PracticeSession() {
  const [searchParams] = useSearchParams();
  const chapterNumber = searchParams.get('chapter');
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();

  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  
  // MCQ state
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [xpPopups, setXpPopups] = useState([]);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    if (!chapterNumber) {
      navigate('/surahs');
      return;
    }
    startSession();
  }, [chapterNumber]);

  const startSession = async () => {
    try {
      setLoading(true);
      const res = await practiceAPI.generateSession({ 
        chapterNumber: parseInt(chapterNumber),
        sessionSize: 10,
        mode: 'mixed'
      });
      
      setSession(res.data.session);
      setCurrentIndex(0);
      setResults([]);
      setSummary(null);
      setStartTime(Date.now());
    } catch (err) {
      setError('সেশন তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (isCorrect, choiceText) => {
    if (showAnswer) return; // Prevent multiple clicks
    
    setSelectedChoice(choiceText);
    setShowAnswer(true);
    
    const currentWord = session.words[currentIndex];
    
    setResults(prev => [...prev, {
      wordArabic: currentWord.textArabic,
      correct: isCorrect,
      verseKey: currentWord.verseKey,
      translationBn: currentWord.translationBn,
      translationEn: currentWord.translationEn,
      transliteration: currentWord.transliteration
    }]);

    if (isCorrect) {
      const popupId = Date.now();
      setXpPopups(prev => [...prev, { id: popupId, text: '+10 XP' }]);
      setTimeout(() => {
        setXpPopups(prev => prev.filter(p => p.id !== popupId));
      }, 1500);
    }

    // Move to next card after delay
    setTimeout(() => {
      if (currentIndex < session.words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedChoice(null);
        setShowAnswer(false);
        setIsFlipped(false);
      } else {
        // Last card — useEffect will auto-detect results.length === session.words.length
        // and trigger the API submission
        setIsFlipped(false);
      }
    }, 1500);
  };

  // NOTE: Session submission is handled by the useEffect below (line ~116).
  // When the last result is added to the results array, the useEffect detects
  // that results.length === session.words.length and triggers the API call.
  // No explicit submitSession() call needed — removing the old broken function.
  
  // Real submit function called by the timeout when last card is done
  useEffect(() => {
    if (session && results.length === session.words.length && !summary && !submitting) {
      const doSubmit = async () => {
        try {
          setSubmitting(true);
          const duration = Math.floor((Date.now() - startTime) / 1000);
          const res = await practiceAPI.submitResults({
            chapterNumber: parseInt(chapterNumber),
            results,
            duration
          });
          
          setSummary(res.data.summary);
          
          if (user && res.data.summary.level > user.level) {
            setLeveledUp(true);
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#F2A900', '#FFD166', '#FFFFFF']
            });
          } else if (res.data.summary.accuracy >= 70) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#0A6847', '#F2A900', '#34D399']
            });
          }

          if (checkAuth) {
            await checkAuth();
          }
        } catch (err) {
          setError('ফলাফল সেভ করতে সমস্যা হয়েছে।');
        } finally {
          setSubmitting(false);
        }
      };
      
      doSubmit();
    }
  }, [results, session, summary, submitting]);

  if (loading) return <Loading message="ফ্ল্যাশকার্ড তৈরি হচ্ছে..." />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  // Show summary if finished
  if (summary) {
    return (
      <div className="page container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: 'var(--space-8)' }}>
          {leveledUp && (
            <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', color: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-gold-glow)' }}>
              <h2 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>অভিনন্দন! 🌟</h2>
              <p style={{ fontWeight: 'bold' }}>আপনি লেভেল {summary.level}-এ উন্নীত হয়েছেন!</p>
            </div>
          )}
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
            {summary.accuracy >= 80 ? '🏆' : summary.accuracy >= 50 ? '👍' : '💪'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>সেশন সম্পন্ন হয়েছে!</h2>
          <p style={{ color: 'var(--color-primary-light)', fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: 'var(--space-6)' }}>
            +{summary.xpEarned} XP
          </p>

          <div className="grid-stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--space-6)' }}>
            <div className="stat-card" style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="stat-value">{summary.accuracy}%</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>সঠিক উত্তর</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div className="stat-value">{summary.wordsCorrect}/{summary.wordsAttempted}</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>শব্দ</div>
            </div>
          </div>

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

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <button onClick={startSession} className="btn btn-primary">
              আবার প্রাকটিস করুন
            </button>
            <Link to="/dashboard" className="btn btn-outline">
              ড্যাশবোর্ড
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = session.words[currentIndex];
  if (!currentWord) return null;

  return (
    <div className="page container" style={{ maxWidth: '800px' }}>
      {/* XP Popups */}
      {xpPopups.map(popup => (
        <div key={popup.id} className="xp-popup">
          {popup.text}
        </div>
      ))}

      {/* Progress Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-bengali)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>শব্দ {currentIndex + 1} / {session.words.length}</span>
          <span className="badge badge-primary">{currentWord.isReview ? 'রিভিউ' : 'নতুন শব্দ'}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${((currentIndex) / session.words.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Main Practice Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }}>
        
        {/* The Card */}
        <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            {/* Front: Arabic */}
            <div className="flashcard-face flashcard-front">
              <div className="flashcard-arabic">{currentWord.textArabic}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
                অর্থ দেখতে ট্যাপ করুন
              </div>
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

        {/* MCQ Choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-bengali)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            সঠিক অর্থটি নির্বাচন করুন:
          </h3>
          
          <div className="grid-choices">
            {currentWord.choices.map((choice, idx) => {
              let btnClass = "choice-btn";
              if (showAnswer) {
                if (choice.isCorrect) btnClass += " correct";
                else if (selectedChoice === choice.translationBn && !choice.isCorrect) btnClass += " incorrect";
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleChoice(choice.isCorrect, choice.translationBn)}
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
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chapterAPI, progressAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

export default function LearningPath() {
  const [chapters, setChapters] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const chapRes = await chapterAPI.getAll();
      setChapters(chapRes.data.chapters);

      if (isAuthenticated) {
        try {
          const progRes = await progressAPI.getChapters();
          const progMap = {};
          progRes.data.chapters.forEach(cp => {
            progMap[cp.chapterNumber] = cp;
          });
          setProgressData(progMap);
        } catch {
          // Progress fetch failed — that's fine, continue without it
        }
      }
    } catch (err) {
      setError('সূরা সমূহ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (prog) => {
    if (!prog) return '📖';
    if (prog.status === 'completed') return '✅';
    if (prog.masteryPercentage > 0) return '📝';
    return '📖';
  };

  const getNodeClass = (prog) => {
    if (!prog) return 'path-node';
    if (prog.status === 'completed') return 'path-node path-node-completed';
    if (prog.masteryPercentage > 0) return 'path-node path-node-progress';
    return 'path-node';
  };

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  return (
    <div className="page container">
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🗺️</div>
        <h1 style={{
          fontFamily: 'var(--font-bengali)',
          marginBottom: 'var(--space-2)',
          background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          শেখার পথ
        </h1>
        <p style={{
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-bengali)',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: 1.8
        }}>
          সহজ থেকে কঠিন ক্রমানুসারে সূরা শিখুন। প্রতিটি সূরায় ক্লিক করে শব্দে শব্দে আরবী শিখুন।
        </p>

        {!isAuthenticated && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontFamily: 'var(--font-bengali)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            <span>💡</span>
            <span>
              প্রগ্রেস ট্র্যাক করতে{' '}
              <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                রেজিস্টার করুন
              </Link>
            </span>
          </div>
        )}
      </div>

      {/* Learning Path - Winding Road */}
      <div className="learning-path-container">
        {chapters.map((chapter, index) => {
          const prog = progressData[chapter.chapterNumber];
          const isEven = index % 2 === 0;
          const groupIndex = Math.floor(index / 3);
          const isGroupEven = groupIndex % 2 === 0;

          // Determine side offset for winding path
          let offsetClass = '';
          const posInGroup = index % 3;
          if (posInGroup === 0) offsetClass = isGroupEven ? 'path-left' : 'path-right';
          else if (posInGroup === 1) offsetClass = 'path-center';
          else offsetClass = isGroupEven ? 'path-right' : 'path-left';

          return (
            <div key={chapter.chapterNumber} className={`path-step ${offsetClass}`}>
              {/* Connector line */}
              {index > 0 && <div className="path-connector"></div>}
              
              <div
                className={getNodeClass(prog)}
                onClick={() => navigate(`/surah/${chapter.chapterNumber}`)}
              >
                {/* Progress ring */}
                <div className="path-node-ring">
                  <svg viewBox="0 0 100 100" className="path-ring-svg">
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="6"
                    />
                    {isAuthenticated && prog && prog.masteryPercentage > 0 && (
                      <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={prog.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary-light)'}
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - prog.masteryPercentage / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                    )}
                  </svg>
                  <div className="path-node-inner">
                    <span className="path-node-number">{chapter.chapterNumber}</span>
                  </div>
                </div>

                {/* Label */}
                <div className="path-node-label">
                  <span className="path-node-arabic">{chapter.nameArabic}</span>
                  <span className="path-node-bengali">
                    {chapter.nameBengali || chapter.translatedNameBn || chapter.nameEnglish}
                  </span>
                  <span className="path-node-meta">
                    {chapter.versesCount} আয়াত
                    {isAuthenticated && prog && prog.masteryPercentage > 0 && (
                      <> • {prog.masteryPercentage}%</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA for guests */}
      {!isAuthenticated && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-4)',
          marginTop: 'var(--space-8)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-3)' }}>
            🌟 আপনার প্রগ্রেস ট্র্যাক করুন
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>
            ফ্রি অ্যাকাউন্ট তৈরি করে XP অর্জন করুন, লেভেল আপ করুন এবং প্রগ্রেস সেভ করুন
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary">রেজিস্টার করুন</Link>
            <Link to="/login" className="btn btn-outline">লগইন করুন</Link>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { progressAPI } from '../api';
import Loading from '../components/common/Loading';

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await progressAPI.getOverview();
      setOverview(res.data.overview);
    } catch (err) {
      setError('তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  return (
    <div className="page container">
      {/* Welcome Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>
          আসসালামু আলাইকুম, {user?.displayName || user?.username}! 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
          আজকের দিনের প্রাকটিস শুরু করতে প্রস্তুত?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card stat-card">
          <div className="stat-value">{overview.totalWordsLearned}</div>
          <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>শেখা শব্দ</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value gold">{overview.level}</div>
          <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>বর্তমান লেভেল</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">
            {overview.streak > 0 ? (
              <span className="streak-badge">
                {overview.streak} <span className="fire">🔥</span>
              </span>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>0</span>
            )}
          </div>
          <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>দিনের স্ট্রিক</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{overview.xp}</div>
          <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>মোট XP</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Level Progress */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>লেভেল প্রগ্রেস</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            <span>Level {overview.level}</span>
            <span>Level {overview.level + 1}</span>
          </div>
          <div className="progress-bar progress-bar-lg" style={{ marginBottom: 'var(--space-2)' }}>
            <div className="progress-bar-fill gold" style={{ width: `${overview.levelProgress}%` }}></div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
            পরবর্তী লেভেলে যেতে আর {overview.xpToNextLevel} XP প্রয়োজন
          </p>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>কুইক একশন</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link to="/surahs" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
              <span style={{ fontSize: '1.2em' }}>📖</span> সূরা পড়া শুরু করুন
            </Link>
            
            <Link to="/practice" className="btn btn-accent" style={{ justifyContent: 'flex-start' }}>
              <span style={{ fontSize: '1.2em' }}>🎴</span> ফ্ল্যাশকার্ড প্রাকটিস
            </Link>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {overview.badges && overview.badges.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>আপনার অর্জন সমূহ</h3>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {overview.badges.map((badge, idx) => (
              <div key={idx} className="card card-glass" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {badge === 'first_word' ? '🎯' : 
                   badge === 'century' ? '🌟' : 
                   badge === 'streak_7' ? '🔥' : '🏅'}
                </span>
                <span style={{ fontFamily: 'var(--font-bengali)', fontWeight: '600' }}>
                  {badge === 'first_word' ? 'প্রথম শব্দ' : 
                   badge === 'century' ? 'শতক' : 
                   badge === 'streak_7' ? '৭-দিন স্ট্রিক' : badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

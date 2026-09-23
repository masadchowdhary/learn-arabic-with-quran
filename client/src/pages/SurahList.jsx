import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chapterAPI, progressAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

export default function SurahList() {
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
      // Fetch chapters
      const chapRes = await chapterAPI.getAll();
      setChapters(chapRes.data.chapters);

      // Fetch progress if authenticated
      if (isAuthenticated) {
        const progRes = await progressAPI.getChapters();
        const progMap = {};
        progRes.data.chapters.forEach(cp => {
          progMap[cp.chapterNumber] = cp;
        });
        setProgressData(progMap);
      }
    } catch (err) {
      setError('সূরা সমূহ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleSurahClick = (chapterNum) => {
    navigate(`/surah/${chapterNum}`);
  };

  if (loading) return <Loading />;
  if (error) return <div className="page container"><div className="empty-state">{error}</div></div>;

  return (
    <div className="page container">
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>সূরা সমূহ</h1>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
          সহজ থেকে কঠিন ক্রমানুসারে সাজানো
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '800px', margin: '0 auto' }}>
        {chapters.map(chapter => {
          const prog = progressData[chapter.chapterNumber] || { status: 'not_started', masteryPercentage: 0 };
          const isCompleted = prog.status === 'completed';

          return (
            <div
              key={chapter.chapterNumber}
              className={`surah-card ${isCompleted ? 'completed' : ''}`}
              onClick={() => handleSurahClick(chapter.chapterNumber)}
            >
              <div className="surah-number">{chapter.chapterNumber}</div>
              
              <div className="surah-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="surah-name-arabic">{chapter.nameArabic}</h3>
                  {isCompleted && <span className="icon" style={{ color: 'var(--color-success)' }}>✅</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
                  <span className="surah-name-translated" style={{ fontFamily: 'var(--font-bengali)' }}>
                    {chapter.nameBengali || chapter.translatedNameBn} • {chapter.translatedNameEn || chapter.nameEnglish}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {chapter.versesCount} আয়াত
                  </span>
                </div>
              </div>

              {isAuthenticated && (
                <div className="surah-progress">
                  <div className="surah-progress-text">{prog.masteryPercentage}% সম্পূর্ণ</div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${prog.masteryPercentage}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


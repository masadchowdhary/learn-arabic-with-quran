import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, progressAPI } from '../api';
import Loading from '../components/common/Loading';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); // 'settings', 'stats', 'words'
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    dailyGoal: user?.dailyGoal || 10
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Stats State
  const [stats, setStats] = useState(null);
  
  // Words State
  const [wordsData, setWordsData] = useState({ words: [], pagination: null });
  const [wordsPage, setWordsPage] = useState(1);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setWordsPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'words') {
      fetchWords(wordsPage, debouncedSearch);
    }
  }, [activeTab, wordsPage, debouncedSearch]);

  const fetchStats = async () => {
    try {
      const res = await progressAPI.getStats();
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWords = async (page, search = '') => {
    try {
      setWordsLoading(true);
      const res = await progressAPI.getWords({ page, limit: 15, minLevel: 1, search });
      setWordsData({ words: res.data.words, pagination: res.data.pagination });
    } catch (err) {
      console.error(err);
    } finally {
      setWordsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await authAPI.updateProfile(formData);
      updateUser(res.data.user);
      setMessage({ type: 'success', text: 'প্রোফাইল আপডেট হয়েছে! ✅' });
    } catch (err) {
      setMessage({ type: 'error', text: 'আপডেট করতে সমস্যা হয়েছে।' });
    } finally {
      setSaving(false);
    }
  };

  const masteryLevelName = (level) => {
    if (level < 10) return 'বীজ (Seedling) 🌱';
    if (level < 25) return 'চারাগাছ (Sapling) 🌿';
    if (level < 50) return 'গাছ (Tree) 🌳';
    if (level < 75) return 'স্কলার (Scholar) 📚';
    if (level < 100) return 'মাস্টার (Master) 🎓';
    return 'হাফিজ (Hafiz) 👑';
  };

  return (
    <div className="page container container-md">
      {/* Profile Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          margin: '0 auto var(--space-4)',
          color: 'white',
          boxShadow: 'var(--shadow-glow)'
        }}>
          {user?.displayName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h1 style={{ fontFamily: 'var(--font-bengali)' }}>{user?.displayName}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
        
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-lg)', color: 'var(--color-accent)', fontWeight: 'bold' }}>
          {masteryLevelName(user?.level || 1)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        <button 
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('stats')}
        >
          📊 স্ট্যাটস ও অর্জন
        </button>
        <button 
          className={`btn ${activeTab === 'words' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('words')}
        >
          📖 শেখা শব্দ
        </button>
        <button 
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ সেটিংস
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="grid-stats">
            <div className="card stat-card">
              <div className="stat-value">{stats.xp}</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>মোট XP</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.streak} <span style={{fontSize:'0.8em'}}>🔥</span></div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>দিনের স্ট্রিক</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.longestStreak}</div>
              <div className="stat-label" style={{ fontFamily: 'var(--font-bengali)' }}>সর্বোচ্চ স্ট্রিক</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>আপনার অর্জন সমূহ (Badges)</h3>
            {stats.badges && stats.badges.length > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                {stats.badges.map((badge, idx) => (
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
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                এখনো কোনো ব্যাজ অর্জিত হয়নি। প্রাকটিস চালিয়ে যান!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Words Tab */}
      {activeTab === 'words' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-4)' }}>শেখা শব্দসমূহ</h3>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="শব্দ খুঁজুন (Search words)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {wordsLoading && !wordsData.words.length ? <Loading /> : null}
          
          {!wordsLoading && wordsData.words.length === 0 ? (
             <div className="empty-state" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {searchQuery ? 'কোনো শব্দ পাওয়া যায়নি।' : 'আপনি এখনো কোনো শব্দ শিখেননি। সূরা প্রাকটিস শুরু করুন!'}
             </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {wordsData.words.map((word) => (
                  <div key={word._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="text-arabic" style={{ fontSize: 'var(--font-size-2xl)', lineHeight: '1.2' }}>{word.wordArabic}</span>
                      <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--font-size-xs)' }}>{word.transliteration}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-bengali)', fontWeight: '500' }}>{word.translationBn}</div>
                      <div className="badge badge-mastery" style={{ marginTop: 'var(--space-1)' }}>Level {word.masteryLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {wordsData.pagination && wordsData.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                  <button 
                    className="btn btn-outline btn-sm" 
                    disabled={wordsPage === 1}
                    onClick={() => setWordsPage(p => p - 1)}
                  >
                    পূর্ববর্তী
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {wordsPage} / {wordsData.pagination.totalPages}
                  </span>
                  <button 
                    className="btn btn-outline btn-sm" 
                    disabled={wordsPage === wordsData.pagination.totalPages}
                    onClick={() => setWordsPage(p => p + 1)}
                  >
                    পরবর্তী
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-6)' }}>
            প্রোফাইল সেটিংস
          </h3>

          {message.text && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: message.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
              marginBottom: 'var(--space-4)',
              fontFamily: 'var(--font-bengali)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>নাম (Display Name)</label>
              <input
                type="text"
                className="input"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>ডেইলি গোল (Daily Goal)</label>
              <select
                className="input"
                name="dailyGoal"
                value={formData.dailyGoal}
                onChange={handleChange}
              >
                <option value="5">৫টি নতুন শব্দ (সহজ)</option>
                <option value="10">১০টি নতুন শব্দ (সাধারণ)</option>
                <option value="15">১৫টি নতুন শব্দ (কঠিন)</option>
                <option value="20">২০টি নতুন শব্দ (চ্যালেঞ্জ)</option>
              </select>
            </div>


            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={saving}
            >
              {saving ? '⏳ সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

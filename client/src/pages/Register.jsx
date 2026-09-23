import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    preferredLanguage: 'bn'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(formData);
      navigate('/practice');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container container-sm">
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🕌</div>
            <h2 style={{ fontFamily: 'var(--font-bengali)' }}>রেজিস্টার করুন</h2>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
              নতুন একাউন্ট তৈরি করুন এবং আরবী শেখা শুরু করুন
            </p>
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              marginBottom: 'var(--space-4)',
              fontFamily: 'var(--font-bengali)',
              fontSize: 'var(--font-size-sm)'
            }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>নাম (Display Name)</label>
              <input
                type="text"
                className="input"
                name="displayName"
                placeholder="আপনার নাম"
                value={formData.displayName}
                onChange={handleChange}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>ইউজারনেম</label>
              <input
                type="text"
                className="input"
                name="username"
                placeholder="একটি ইউজারনেম দিন"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>ইমেইল</label>
              <input
                type="email"
                className="input"
                name="email"
                placeholder="আপনার ইমেইল দিন"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>পাসওয়ার্ড</label>
              <input
                type="password"
                className="input"
                name="password"
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label>পছন্দের ভাষা</label>
              <select
                className="input"
                name="preferredLanguage"
                value={formData.preferredLanguage}
                onChange={handleChange}
              >
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? '⏳ তৈরি হচ্ছে...' : '🚀 একাউন্ট তৈরি করুন'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: 'var(--space-6)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-bengali)',
            fontSize: 'var(--font-size-sm)'
          }}>
            একাউন্ট আছে? <Link to="/login" style={{ color: 'var(--color-primary-light)' }}>লগইন করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

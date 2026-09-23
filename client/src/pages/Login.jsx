import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email, password });
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
            <h2 style={{ fontFamily: 'var(--font-bengali)' }}>লগইন করুন</h2>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)' }}>
              আপনার একাউন্টে প্রবেশ করুন
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
              <label>ইমেইল</label>
              <input
                type="email"
                className="input"
                placeholder="আপনার ইমেইল দিন"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label>পাসওয়ার্ড</label>
              <input
                type="password"
                className="input"
                placeholder="আপনার পাসওয়ার্ড দিন"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? '⏳ লগইন হচ্ছে...' : '✅ লগইন'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: 'var(--space-6)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-bengali)',
            fontSize: 'var(--font-size-sm)'
          }}>
            একাউন্ট নেই? <Link to="/register" style={{ color: 'var(--color-primary-light)' }}>রেজিস্টার করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

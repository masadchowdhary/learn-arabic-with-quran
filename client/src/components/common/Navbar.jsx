import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to={isAuthenticated ? '/practice' : '/'} className="navbar-brand">
          <span className="icon">🕌</span>
          <span>কুরআনে আরবী</span>
        </Link>

        {isAuthenticated ? (
          <>
            <ul className="navbar-nav">
              <li><Link to="/learn" className={isActive('/learn')}>শেখার পথ</Link></li>
              <li><Link to="/practice" className={isActive('/practice')}>প্রাকটিস</Link></li>
              <li><Link to="/surahs" className={isActive('/surahs')}>সূরা সমূহ</Link></li>
              <li><Link to="/dashboard" className={isActive('/dashboard')}>ড্যাশবোর্ড</Link></li>
              <li><Link to="/profile" className={isActive('/profile')}>প্রোফাইল</Link></li>
            </ul>
            <div className="navbar-stats">
              {user?.streak > 0 && (
                <span className="streak-badge">
                  <span className="fire">🔥</span>
                  {user.streak}
                </span>
              )}
              <span className="badge badge-accent">⭐ Lv.{user?.level || 1}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                লগআউট
              </button>
            </div>
          </>
        ) : (
          <ul className="navbar-nav">
            <li><Link to="/learn" className={isActive('/learn')}>শেখার পথ</Link></li>
            <li><Link to="/surahs" className={isActive('/surahs')}>সূরা সমূহ</Link></li>
            <li><Link to="/login" className="btn btn-ghost btn-sm">লগইন</Link></li>
            <li><Link to="/register" className="btn btn-primary btn-sm">রেজিস্টার</Link></li>
          </ul>
        )}
      </div>
    </nav>
  );
}

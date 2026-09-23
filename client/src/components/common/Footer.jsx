import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" style={{
      marginTop: 'auto',
      padding: '2rem 1rem',
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</Link>
          <Link to="/surahs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Surahs</Link>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/profile" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Profile</Link>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            &copy; {currentYear} Learn Arabic with Quran. All rights reserved.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
            Data provided by <a href="https://quran.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Quran.com</a> API.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

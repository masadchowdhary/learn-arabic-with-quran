import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page">
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: 'var(--space-16) var(--space-4)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-6)' }}>🕌</div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--space-4)',
          lineHeight: 1.2
        }}>
          কুরআন দিয়ে আরবী শিখুন
        </h1>
        <p style={{
          fontFamily: 'var(--font-bengali)',
          fontSize: 'var(--font-size-xl)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-2)'
        }}>
          Learn Arabic with Quran — Word by Word
        </p>
        <p style={{
          fontFamily: 'var(--font-bengali)',
          color: 'var(--color-text-muted)',
          maxWidth: '600px',
          margin: '0 auto var(--space-8)',
          lineHeight: 1.8
        }}>
          কুরআনের প্রতিটি শব্দের বাংলা ও ইংরেজি অর্থ শিখুন।
          ফ্ল্যাশকার্ড, কুইজ এবং গেমিফিকেশনের মাধ্যমে সহজেই আরবী ভাষা আয়ত্ত করুন।
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <Link to="/practice" className="btn btn-primary btn-lg">
              📖 প্রাকটিস শুরু করুন
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">
                🚀 শেখা শুরু করুন
              </Link>
              <Link to="/learn" className="btn btn-accent btn-lg">
                🗺️ শেখার পথ দেখুন
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                লগইন করুন
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-6)' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📝</div>
            <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>অক্ষর ভিত্তিক অনুবাদ</h3>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>
              প্রতিটি আরবী শব্দের বাংলা ও ইংরেজি অর্থ, উচ্চারণ এবং অডিও সহ শিখুন
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🎴</div>
            <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>ফ্ল্যাশকার্ড প্রাকটিস</h3>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>
              ফ্ল্যাশকার্ড এবং কুইজের মাধ্যমে শব্দ ভান্ডার বৃদ্ধি করুন
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🏆</div>
            <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>লেভেল ও পুরস্কার</h3>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>
              ডুয়োলিঙ্গো-স্টাইল XP, স্ট্রিক, ব্যাজ এবং লেভেল আপ সিস্টেম
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📊</div>
            <h3 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-2)' }}>সম্পূর্ণ কভারেজ</h3>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>
              ১১৪ সূরা ও ৬২৩৬ আয়াতের প্রতিটি শব্দ প্রাকটিস করুন
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container" style={{ paddingBottom: 'var(--space-16)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-8)', color: 'var(--color-accent)' }}>
          কিভাবে কাজ করে?
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { step: '১', title: 'সূরা নির্বাচন', desc: 'সবচেয়ে ছোট সূরা দিয়ে শুরু করুন' },
            { step: '২', title: 'শব্দ শিখুন', desc: 'প্রতিটি শব্দের অর্থ ও উচ্চারণ দেখুন' },
            { step: '৩', title: 'প্রাকটিস করুন', desc: 'ফ্ল্যাশকার্ড ও কুইজ দিয়ে মনে রাখুন' },
            { step: '৪', title: 'আয়ত্ত করুন', desc: 'লেভেল আপ করে পরবর্তী সূরায় যান' }
          ].map((item) => (
            <div key={item.step} style={{ flex: '1 1 180px', maxWidth: '200px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 'var(--font-size-xl)', margin: '0 auto var(--space-3)',
                boxShadow: 'var(--shadow-glow)'
              }}>
                {item.step}
              </div>
              <h4 style={{ fontFamily: 'var(--font-bengali)', marginBottom: 'var(--space-1)' }}>{item.title}</h4>
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-bengali)', fontSize: 'var(--font-size-sm)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useEffect } from 'react';
import { FiArrowRight, FiZap, FiShield, FiActivity } from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="auth-page" style={{ 
      flexDirection: 'column', 
      background: 'radial-gradient(circle at top right, rgba(79, 70, 229, 0.15), transparent), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.1), transparent)' 
    }}>
      <div className="auth-card" style={{ maxWidth: '800px', textAlign: 'center' }}>
        <div style={{ marginBottom: '60px' }}>
          <img src="/logo.png" alt="TaskTracker" style={{ width: '120px', height: '120px', marginBottom: '24px' }} />
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: 900, 
            letterSpacing: '-2px', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            Task<span style={{ color: 'var(--accent)' }}>Tracker</span>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '20px', fontWeight: 500, maxWidth: '600px', margin: '0 auto' }}>
            The ultimate AI-powered environment for goal achievement and precision task optimization.
          </p>
        </div>

        <div className="grid-3" style={{ marginBottom: '60px' }}>
          <div className="card" style={{ padding: '32px', textAlign: 'left' }}>
            <FiZap style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>AI Optimization</h3>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Smart scheduling that adapts to your habits and priorities.</p>
          </div>
          <div className="card" style={{ padding: '32px', textAlign: 'left' }}>
            <FiShield style={{ fontSize: '24px', color: 'var(--low)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Secure Sync</h3>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Your data is encrypted and synchronized across all devices.</p>
          </div>
          <div className="card" style={{ padding: '32px', textAlign: 'left' }}>
            <FiActivity style={{ fontSize: '24px', color: 'var(--high)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Data Extraction</h3>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Automatic task capturing from multiple sources and documents.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '16px 40px', fontSize: '16px', borderRadius: '16px', fontWeight: 700 }}
            onClick={() => navigate('/login')}
          >
            SIGN IN TO ENGINE <FiArrowRight style={{ marginLeft: '8px' }} />
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ padding: '16px 40px', fontSize: '16px', borderRadius: '16px', fontWeight: 700 }}
            onClick={() => navigate('/register')}
          >
            INITIALIZE NEW ACCOUNT
          </button>
        </div>

        <div style={{ marginTop: '80px', color: 'var(--text3)', fontSize: '12px', letterSpacing: '2px', fontWeight: 700 }}>
          SECURE TERMINAL ACCESS V1.0.0
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useEffect } from 'react';
import { FiArrowRight } from 'react-icons/fi';

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#0a0a0b',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambience */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        zIndex: 0
      }} />

      <div style={{ maxWidth: '640px', textAlign: 'center', zIndex: 1 }}>
        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '140px', height: '140px', marginBottom: '32px' }} />
          <h1 style={{ 
            fontSize: '64px', 
            fontWeight: 800, 
            letterSpacing: '-2px', 
            marginBottom: '24px',
            color: '#fff'
          }}>
            Achieve More.
          </h1>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '20px', 
            lineHeight: '1.6', 
            marginBottom: '48px',
            fontWeight: 400
          }}>
            Minimal design. Powerful results. The professional way to manage your tasks and reach your milestones.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            style={{ 
              backgroundColor: 'var(--accent)',
              color: '#fff',
              border: 'none',
              padding: '18px 48px',
              fontSize: '18px',
              borderRadius: '32px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'transform 0.2s'
            }}
            onClick={() => navigate('/login')}
          >
            Sign In <FiArrowRight size={20} />
          </button>
          
          <button 
            style={{ 
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: '1.5px solid #334155',
              padding: '18px 48px',
              fontSize: '18px',
              borderRadius: '32px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => navigate('/register')}
          >
            Create Account
          </button>
        </div>

        <div style={{ 
          marginTop: '100px', 
          color: '#334155', 
          fontSize: '12px', 
          letterSpacing: '3px', 
          fontWeight: 800,
          textTransform: 'uppercase'
        }}>
          Professional Workspace
        </div>
      </div>
    </div>
  );
}

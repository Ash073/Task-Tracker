import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { FiArrowRight } from 'react-icons/fi';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Access Granted');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">TaskTracker</div>
          <div className="auth-logo-sub">YOUR PRODUCTIVITY HUB</div>
        </div>

        <div className="card" style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-bright)', letterSpacing: '-0.5px' }}>
            Sign In
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '32px', fontWeight: 500 }}>
            Welcome back. Please enter your details.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ marginTop: '12px', height: '48px', fontSize: '14px', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> SIGNING IN...</>
              ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>SIGN IN <FiArrowRight /></div>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text2)', fontSize: '13px', fontWeight: 500 }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: 'var(--accent2)', fontWeight: 700, textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

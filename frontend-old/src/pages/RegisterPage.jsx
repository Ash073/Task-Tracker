import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { FiUserPlus } from 'react-icons/fi';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', goal: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.goal);
      toast.success('Registration Complete');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Initialization error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="TaskTracker" style={{ width: '80px', height: '80px', marginBottom: '16px' }} />
          <div className="auth-logo-text">TaskTracker</div>
          <div className="auth-logo-sub">DECENTRALIZE YOUR TASK MANAGEMENT</div>
        </div>

        <div className="card" style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-bright)', letterSpacing: '-0.5px' }}>
            Create Account
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '32px', fontWeight: 500 }}>
            Join thousands of professionals tracking their tasks.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="name@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="label">Primary Goal <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(Optional)</span></label>
              <input className="input" placeholder="e.g. Master React, Fitness Goal" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ marginTop: '12px', height: '48px', fontSize: '14px', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> REGISTERING...</>
              ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>CREATE ACCOUNT <FiUserPlus /></div>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text2)', fontSize: '13px', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent2)', fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

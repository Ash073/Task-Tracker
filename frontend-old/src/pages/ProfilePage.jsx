import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getTranslation } from '../services/i18n';

const LEVEL_NAMES = ['', 'Beginner', 'Focused', 'Dedicated', 'Achiever', 'Champion', 'Elite', 'Master', 'Legend', 'Immortal', 'God Mode'];
const LEVEL_XP = [0, 0, 50, 200, 500, 1000, 2000, 3500, 5000, 7500, 10000];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const [stats, setStats] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState(user?.goal || '');

  useEffect(() => {
    api.get('/profile').then(res => setStats(res.data)).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/profile/analyze');
      setInsights(res.data.insights || 'Analysis complete. Insights synchronized.');
      updateUser({ detectedGoal: res.data.detectedGoal, weakAreas: res.data.weakAreas });
      toast.success('Core analysis complete');
    } catch { toast.error('Analysis engine failure'); }
    finally { setAnalyzing(false); }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/profile', { name, goal });
      updateUser(res.data);
      setEditMode(false);
      toast.success('Identity profile updated');
    } catch (err) {
      toast.error('Failed to update identity');
    } finally {
      setSaving(false);
    }
  };

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextXP = LEVEL_XP[Math.min(level + 1, 10)] || 10000;
  const progress = Math.min(((xp - LEVEL_XP[level]) / (nextXP - LEVEL_XP[level])) * 100, 100);

  return (
    <div className="slide-up">
      <div className="page-header">
        <h1 className="page-title">Personal Core</h1>
        <p className="page-subtitle">Entity ID: {user?._id?.slice(-8).toUpperCase()}</p>
      </div>

      {/* Hero Section */}
      <div className="card" style={{ marginBottom: '32px', padding: '40px', overflow: 'hidden' }}>
        {/* Abstract background glow */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: '300px', height: '300px', background: 'var(--accent-glow)', filter: 'blur(100px)', opacity: 0.4 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div className="user-avatar user-avatar-lg" style={{ width: '100px', height: '100px', fontSize: '40px', boxShadow: '0 0 40px var(--accent-glow)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    className="input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Enter Username"
                    style={{ fontSize: '24px', fontWeight: 900, background: 'rgba(0,0,0,0.2)', color: 'white' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-xs" onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditMode(false); setName(user?.name); setGoal(user?.goal); }}>CANCEL</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditMode(true)} style={{ cursor: 'pointer' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', color: 'var(--text-bright)' }}>{user?.name}</h2>
                  <p className="mono" style={{ color: 'var(--text2)', fontSize: '14px' }}>{user?.email} ✎</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <span className="badge badge-low" style={{ background: 'var(--accent-glow)', color: 'var(--accent2)', borderColor: 'var(--accent)' }}>LEVEL {level}</span>
                <span className="badge badge-high">🔥 {user?.streak || 0} DAY STREAK</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '44px', fontWeight: 900, color: 'var(--xp)', lineHeight: 1 }}>{xp}</div>
            <div className="mono" style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '6px' }}>TOTAL ACCUMULATED XP</div>
          </div>
        </div>

        {/* Level Progress */}
        <div style={{ marginTop: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>RANK: {LEVEL_NAMES[level]?.toUpperCase()}</span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text3)' }}>{xp} / {nextXP} XP</span>
          </div>
          <div className="xp-bar-wrap" style={{ height: '12px' }}>
            <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--low)' }}>{stats?.completedTasksCount || 0}</div>
          <div className="stat-label">Tasks Synchronized</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--high)' }}>{user?.streak || 0}</div>
          <div className="stat-label">Temporal Consistency</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent2)', textTransform: 'capitalize' }}>{user?.mode}</div>
          <div className="stat-label">Active Operating Mode</div>
        </div>
      </div>

      {/* Goal Insights */}
      <h2 className="section-header"><span>🎯</span> Goal Processing</h2>
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>User-Defined Objective</div>
            {editMode ? (
              <input 
                className="input" 
                value={goal} 
                onChange={e => setGoal(e.target.value)} 
                placeholder="Core Daily Objective"
                style={{ marginTop: '8px', maxWidth: '400px' }}
              />
            ) : (
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{user?.goal || 'OBJECTIVE NOT SET'}</div>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing</> : '⟳ Run Analysis'}
          </button>
        </div>

        {user?.detectedGoal && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Inferred Trajectory</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent2)', textTransform: 'capitalize', marginTop: '4px' }}>{user.detectedGoal}</div>
          </div>
        )}

        {user?.weakAreas?.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Structural Vulnerabilities</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {user.weakAreas.map(area => (
                <span key={area} className="badge badge-critical" style={{ textTransform: 'none' }}>{area}</span>
              ))}
            </div>
          </div>
        )}

        {insights && (
          <div style={{ 
            padding: '20px', background: 'var(--glass)', borderRadius: 'var(--radius-sm)', 
            fontSize: '14px', lineHeight: 1.7, color: 'var(--text2)', borderLeft: '3px solid var(--accent)'
          }}>
            {insights}
          </div>
        )}
      </div>
    </div>
  );
}

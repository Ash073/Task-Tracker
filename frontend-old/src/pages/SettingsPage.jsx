import { useState } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';
import toast from 'react-hot-toast';

// Professional Icons
import { FiCpu, FiBell, FiShield, FiEye, FiEyeOff, FiActivity, FiMessageSquare } from 'react-icons/fi';

export default function SettingsPage() {
  const { user, updateSettings } = useAuthStore();
  const [settings, setSettings] = useState(user?.settings || {});
  const [aiStatus, setAiStatus] = useState(null);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const checkAIStatus = async () => {
    try {
      const res = await api.get('/ai/status');
      setAiStatus(res.data);
      toast.success(`Active AI: ${res.data.provider}`);
    } catch { toast.error('AI connection error'); }
  };

  const testQuote = async () => {
    try {
      const res = await api.post('/ai/quote', { taskName: 'System Calibration', priority: 'High', goal: user?.detectedGoal || user?.goal });
      toast.success(`" ${res.data.quote} "`, { duration: 6000 });
    } catch { toast.error('Failed to generate response'); }
  };

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="slide-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage AI configuration, notifications, and system permissions</p>
      </div>

      {/* AI Config */}
      <h2 className="section-header"><FiCpu /> AI Configuration</h2>
      <div className="card" style={{ marginBottom: '32px', padding: '28px' }}>
        <div className="form-group">
          <label className="label">Intelligence Model</label>
          <select className="input select" value={settings.aiMode || 'auto'} onChange={e => set('aiMode', e.target.value)}>
            <option value="auto">Adaptive (OpenAI ⇄ Local)</option>
            <option value="openai">OpenAI Prime (API Required)</option>
            <option value="local">Local Logic (Zero-latency)</option>
          </select>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '12px', lineHeight: 1.6 }}>
            Adaptive mode uses OpenAI for complex analysis and secure local failover for basic tasks.
          </div>
        </div>

        <div className="form-group">
          <label className="label">OpenAI API Key</label>
          <div style={{ position: 'relative' }}>
            <input 
              className="input" 
              type={showOpenAIKey ? 'text' : 'password'} 
              value={settings.userOpenAIKey || ''} 
              onChange={e => set('userOpenAIKey', e.target.value)} 
              placeholder="sk-..." 
              style={{ paddingRight: '52px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowOpenAIKey(!showOpenAIKey)} 
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}
            >
              {showOpenAIKey ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <div className="flex gap-12" style={{ marginTop: '28px' }}>
          <button className="btn btn-ghost btn-sm" onClick={checkAIStatus} style={{ minWidth: '140px' }}><FiActivity style={{ marginRight: '8px' }} /> TEST CONNECTION</button>
          <button className="btn btn-ghost btn-sm" onClick={testQuote} style={{ minWidth: '180px' }}><FiMessageSquare style={{ marginRight: '8px' }} /> TEST RESPONSE</button>
          {aiStatus && (
            <span style={{ fontSize: '11px', color: 'var(--low)', alignSelf: 'center', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              ONLINE: {aiStatus.provider.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      <h2 className="section-header"><FiBell /> Notifications</h2>
      <div className="card" style={{ marginBottom: '32px', padding: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-bright)' }}>Frequent Reminders</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Remind every 15 mins until task is completed</div>
            </div>
            <input 
              type="checkbox" 
              checked={settings.reminder15min || false} 
              onChange={e => set('reminder15min', e.target.checked)} 
              style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--accent)' }} 
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-bright)' }}>Push Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Enable browser desktop notifications</div>
            </div>
            <input 
              type="checkbox" 
              checked={settings.pushNotifications !== false} 
              onChange={e => set('pushNotifications', e.target.checked)} 
              style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--accent)' }} 
            />
          </label>
        </div>
      </div>

      {/* Permissions */}
      <h2 className="section-header"><FiShield /> Permissions</h2>
      <div className="card" style={{ marginBottom: '48px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-bright)' }}>Browser Permissions</div>
            <div className="mono" style={{ fontSize: '11px', color: Notification.permission === 'granted' ? 'var(--low)' : 'var(--critical)', marginTop: '6px', fontWeight: 700 }}>
              {Notification.permission === 'granted' ? 'GRANTED' : 'DENIED'}
            </div>
          </div>
          {Notification.permission !== 'granted' && (
            <button className="btn btn-primary btn-sm" onClick={() => Notification.requestPermission()}>GRANT ACCESS</button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', fontSize: '14px' }}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> SAVING...</> : 'SAVE SETTINGS'}
        </button>
      </div>
    </div>
  );
}

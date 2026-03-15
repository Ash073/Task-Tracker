import { useState } from 'react';
import { notificationService } from '../services/notifications';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store';
import { getTranslation } from '../services/i18n';

// Professional Icons
import { FiDroplet, FiCoffee, FiActivity, FiMoon, FiBookOpen, FiSmile, FiPlus, FiSend, FiBell, FiCheckCircle } from 'react-icons/fi';
import { GiMeditation } from 'react-icons/gi';

const DEFAULT_REMINDERS = [
  { id: 'water', icon: <FiDroplet />, title: 'Hydration Cycle', body: 'Initialize water intake for cellular optimization.', times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'], done: false, color: '#3b82f6' },
  { id: 'eat', icon: <FiCoffee />, title: 'Fuel Intake', body: 'Biological refueling protocol initiated.', times: ['08:30', '13:00', '19:00'], done: false, color: '#f59e0b' },
  { id: 'exercise', icon: <FiActivity />, title: 'Kinetic Output', body: 'Activate physical systems for 15+ minutes.', times: ['07:00'], done: false, color: '#10b981' },
  { id: 'sleep', icon: <FiMoon />, title: 'Hibernation Start', body: 'Power down for synaptic recovery.', times: ['22:00'], done: false, color: '#6366f1' },
  { id: 'study', icon: <FiBookOpen />, title: 'Neural Expansion', body: 'Commit new data to long-term memory.', times: ['09:00', '15:00'], done: false, color: '#ec4899' },
  { id: 'meditate', icon: <GiMeditation />, title: 'System Silence', body: 'Initialize 5-minute mental defragmentation.', times: ['06:30'], done: false, color: '#a855f7' },
];

export default function SimplePage() {
  const user = useAuthStore(s => s.user);
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [customReminder, setCustomReminder] = useState({ icon: <FiSmile />, title: '', time: '09:00', body: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  const handleToggleDone = (id) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setNotifPermission(Notification.permission);
    if (granted) {
      toast.success('Communication link established');
    } else {
      toast.error('Communication protocols blocked');
    }
  };

  const handleScheduleReminder = (reminder) => {
    if (notifPermission !== 'granted') {
      toast.error('Establish notification link first');
      return;
    }
    const [hour, minute] = reminder.times[0].split(':').map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next < new Date()) next.setDate(next.getDate() + 1);
    const delay = next - Date.now();
    notificationService.scheduleLocal({ title: reminder.title, body: reminder.body, delayMs: delay, tag: reminder.id });
    toast.success(`Protocol scheduled for ${reminder.times[0]}`);
  };

  const handleAddCustom = () => {
    if (!customReminder.title) return toast.error('Designation required');
    const newReminder = { ...customReminder, id: `custom_${Date.now()}`, times: [customReminder.time], done: false, color: 'var(--accent)' };
    setReminders(prev => [...prev, newReminder]);
    setCustomReminder({ icon: <FiSmile />, title: '', time: '09:00', body: '' });
    setShowCustom(false);
    toast.success('Custom protocol archived');
  };

  return (
    <div className="slide-up">
      <div className="page-header">
        <h1 className="page-title">{t('reminders')}</h1>
        <p className="page-subtitle">{t('maintenance')}</p>
      </div>

      {/* Permission Alert */}
      {notifPermission !== 'granted' && (
        <div className="card" style={{ marginBottom: '40px', borderLeft: '4px solid var(--medium)', background: 'var(--medium-bg)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <FiBell style={{ fontSize: '24px', color: 'var(--medium)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('enable').toUpperCase()} {t('reminders').toUpperCase()}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleEnableNotifications}>{t('enable').toUpperCase()}</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="simple-grid" style={{ marginBottom: '48px' }}>
        {reminders.map((reminder, i) => (
          <div 
            key={reminder.id} 
            className={`simple-card ${reminder.done ? 'done' : ''} stagger-${(i % 4) + 1}`} 
            onClick={() => handleToggleDone(reminder.id)}
            style={{ 
              borderColor: reminder.done ? 'var(--low)' : 'var(--glass-border)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div className="simple-icon" style={{ color: reminder.done ? 'var(--low)' : (reminder.color || 'var(--accent2)'), fontSize: '32px' }}>
              {reminder.done ? <FiCheckCircle /> : reminder.icon}
            </div>
            <div className="simple-title" style={{ marginTop: '16px', fontSize: '15px' }}>{reminder.title.toUpperCase()}</div>
            <div className="simple-time" style={{ letterSpacing: '2px', fontWeight: 800 }}>{reminder.times[0]}</div>
            {reminder.done && <div style={{ fontSize: '10px', color: 'var(--low)', marginTop: '12px', fontWeight: 900, letterSpacing: '1px' }}>SYNCED ✓</div>}
          </div>
        ))}
        <div 
          className="simple-card" 
          onClick={() => setShowCustom(true)} 
          style={{ borderStyle: 'dashed', background: 'transparent', opacity: 0.6 }}
        >
          <div className="simple-icon"><FiPlus /></div>
          <div className="simple-title">NEW CYCLE</div>
        </div>
      </div>

      {/* Custom Form */}
      {showCustom && (
        <div className="card slide-up" style={{ marginBottom: '48px', padding: '32px' }}>
          <h3 className="section-header" style={{ marginBottom: '24px' }}><FiPlus /> DEFINE CUSTOM CYCLE</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Cycle Designation</label>
              <input className="input" value={customReminder.title} onChange={e => setCustomReminder(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Nutrient Load" />
            </div>
            <div className="form-group">
              <label className="label">Temporal Point</label>
              <input className="input" type="time" value={customReminder.time} onChange={e => setCustomReminder(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Neural Context (Message)</label>
            <input className="input" value={customReminder.body} onChange={e => setCustomReminder(f => ({ ...f, body: e.target.value }))} placeholder="Enter notification text..." />
          </div>
          <div className="flex gap-12">
            <button className="btn btn-primary" onClick={handleAddCustom} style={{ padding: '12px 32px' }}>ARCHIVE CYCLE</button>
            <button className="btn btn-ghost" onClick={() => setShowCustom(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Global Actions */}
      <div className="flex gap-16" style={{ marginBottom: '64px' }}>
        <button className="btn btn-primary" onClick={() => {
          if (notifPermission !== 'granted') { handleEnableNotifications(); return; }
          reminders.forEach(r => handleScheduleReminder(r));
          toast.success('Global broadcast scheduled');
        }} style={{ padding: '16px 32px' }}>
          <FiSend style={{ marginRight: '10px' }} /> BROADCAST ALL REMINDERS
        </button>
      </div>

      {/* Checklist */}
      <h2 className="section-header" style={{ marginBottom: '24px' }}><FiCheckCircle /> DAILY SYNCHRONIZATION LOG</h2>
      <div className="card" style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.02)' }}>
        {reminders.map(r => (
          <div key={r.id} className="shopping-item" onClick={() => handleToggleDone(r.id)} style={{ cursor: 'pointer', padding: '18px 0' }}>
            <div className={`shopping-check ${r.done ? 'checked' : ''}`} style={{ width: '22px', height: '22px' }}>
              {r.done && <FiCheckCircle />}
            </div>
            <span style={{ fontSize: '20px', color: r.done ? 'var(--text3)' : (r.color || 'var(--text)') }}>{r.icon}</span>
            <span style={{ fontWeight: 700, flex: 1, textDecoration: r.done ? 'line-through' : 'none', color: r.done ? 'var(--text3)' : 'var(--text)', fontSize: '15px' }}>
              {r.title}
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 600 }}>{r.times[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

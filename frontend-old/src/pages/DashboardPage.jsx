import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useTaskStore, useShoppingStore } from '../store';
import { format, isToday } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

// Professional Icons
import { FiTarget, FiZap, FiCheckCircle, FiClock, FiAlertCircle, FiList, FiTrendingUp, FiSun, FiMoon, FiCloud, FiDroplet, FiCoffee, FiActivity, FiBookOpen, FiChevronRight } from 'react-icons/fi';
import { GiShoppingBag, GiMeditation, GiDeliveryDrone } from 'react-icons/gi';
import { getTranslation } from '../services/i18n';

const PRIORITY_DOT = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };

const SIMPLE_REMINDERS = [
  { id: 'water', icon: <FiDroplet />, title: 'Water', time: 'Every 2hr', color: '#3b82f6' },
  { id: 'eat', icon: <FiCoffee />, title: 'Meals', time: 'Scheduled', color: '#f59e0b' },
  { id: 'meditate', icon: <GiMeditation />, title: 'Zen', time: '06:30 AM', color: '#a855f7' },
];

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { tasks, fetchTasks, completeTask } = useTaskStore();
  const { lists, fetchLists } = useShoppingStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [xpPopup, setXpPopup] = useState(null);
  const navigate = useNavigate();

  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  useEffect(() => { 
    fetchTasks(); 
    if (user?.mode === 'simple') fetchLists();
  }, [user?.mode]);

  const todayTasks = tasks.filter(t => t.startTime && isToday(new Date(t.startTime)) && t.status !== 'completed');
  const completedToday = tasks.filter(t => t.completedAt && isToday(new Date(t.completedAt)));
  const criticalTasks = tasks.filter(t => t.priority === 'Critical' && t.status !== 'completed');

  const handleComplete = async (id) => {
    try {
      const result = await completeTask(id);
      setXpPopup(`+${result.xpGained} XP`);
      setTimeout(() => setXpPopup(null), 2000);
      toast.success(`Task completed! +${result.xpGained} XP`);
    } catch { toast.error('Failed to complete task'); }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/profile/analyze');
      setInsights(res.data);
      toast.success('Goal analysis complete!');
    } catch { toast.error('Analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const levelProgress = ((user?.xp % 200) / 200) * 100;
  const nextLevelXP = Math.ceil((user?.xp || 0) / 200) * 200;

  const greeting = getGreeting();
  const GreetingIcon = greeting === 'morning' ? FiSun : greeting === 'afternoon' ? FiCloud : FiMoon;

  return (
    <div className="dashboard-wrapper">
      {xpPopup && <div className="xp-popup">{xpPopup}</div>}

      {/* Shared Header Section */}
      <div className="page-header" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '32px', letterSpacing: '-0.5px' }}>
              <GreetingIcon style={{ color: 'var(--accent)', fontSize: '36px' }} />
              {t(`greeting_${greeting}`)}, <span style={{ color: 'var(--text-bright)' }}>{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="page-subtitle" style={{ fontSize: '15px', marginTop: '4px', opacity: 0.8 }}>
              {format(new Date(), 'EEEE, MMMM d')} · {user?.mode === 'ultimate' ? ` ${todayTasks.length} ${t('objectives')}` : t('maintenance')}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
            {/* System Status Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 20px', borderRadius: '30px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}>
              <div 
                className="pulse-glow"
                style={{ 
                  width: '8px', height: '8px', borderRadius: '50%', background: '#10b981',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)'
                }} 
              />
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#10b981', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {criticalTasks.length > 0 ? t('system_standby') : t('system_operational')}
              </span>
            </div>
            
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '20px',
              background: user?.mode === 'ultimate' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              border: `1px solid ${user?.mode === 'ultimate' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
              fontSize: '11px', fontWeight: 800, color: user?.mode === 'ultimate' ? 'var(--xp)' : 'var(--accent)',
              letterSpacing: '1px'
            }}>
              {user?.mode === 'ultimate' ? t('ultimate') : t('simple')} {t('view_mode').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {user?.mode === 'ultimate' ? (
        /* ULTIMATE DASHBOARD: Focus on Tasks, Goals, and XP */
        <div className="ultimate-dashboard slide-up">
          {/* Stats Row */}
          <div className="grid-3" style={{ marginBottom: '32px' }}>
            {[
              { value: todayTasks.length, label: t('pending'), color: 'var(--accent2)', icon: <FiClock /> },
              { value: completedToday.length, label: t('completed'), color: 'var(--low)', icon: <FiCheckCircle /> },
              { value: criticalTasks.length, label: t('critical'), color: criticalTasks.length > 0 ? 'var(--critical)' : 'var(--text2)', icon: <FiAlertCircle /> },
            ].map((stat, i) => (
              <div key={stat.label} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div style={{ color: stat.color, fontSize: '20px', opacity: 0.8 }}>{stat.icon}</div>
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* XP Progress */}
          <div className="card" style={{ marginBottom: '32px', padding: '22px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <FiTrendingUp style={{ color: 'var(--accent)' }} /> {t('progress')}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                {user?.xp} / {nextLevelXP} {t('xp')}
              </span>
            </div>
            <div className="xp-bar-wrap" style={{ height: '10px' }}>
              <div className="xp-bar-fill" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>

          {/* Detected Goal */}
          {(user?.detectedGoal || user?.goal) && (
            <div className="card goal-card" style={{ marginBottom: '32px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="section-header" style={{ marginBottom: '12px' }}>
                    <FiTarget style={{ color: 'var(--accent)' }} /> {t('goal')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-bright)' }}>
                    {user?.detectedGoal || user?.goal}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? '...' : t('edit').toUpperCase()}
                </button>
              </div>
            </div>
          )}

          {/* Ultimate Task List Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2 className="section-header" style={{ marginBottom: 0 }}><FiList /> {t('today_tasks').toUpperCase()}</h2>
             <button className="btn btn-primary btn-sm" onClick={() => navigate('/tasks')}>{t('new_task').toUpperCase()}</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayTasks.slice(0, 5).map((task) => (
              <div key={task._id} className={`task-card ${task.priority.toLowerCase()}`} style={{ padding: '16px 20px' }}>
                <button className="task-checkbox" onClick={() => handleComplete(task._id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{task.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                    {task.startTime ? format(new Date(task.startTime), 'h:mm a') : 'Unscheduled'} · {task.priority.toUpperCase()}
                  </div>
                </div>
                <div style={{ color: 'var(--xp)', fontWeight: 800, fontSize: '12px' }}>+{task.xpReward} XP</div>
              </div>
            ))}
            {todayTasks.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px', background: 'transparent', borderStyle: 'dashed' }}>
                <FiCheckCircle style={{ fontSize: '32px', opacity: 0.3, marginBottom: '10px' }} />
                <div style={{ color: 'var(--text3)', fontWeight: 600 }}>Zero pending objectives for this segment.</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SIMPLE DASHBOARD: Focus on Habits, Shopping, and Reminders */
        <div className="simple-dashboard slide-up">
          <div className="grid-2" style={{ marginBottom: '32px' }}>
            {/* Habits/Reminders Card */}
            <div className="card" style={{ padding: '28px' }}>
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><FiZap style={{ color: 'var(--accent)' }} /> {t('maintenance').toUpperCase()}</span>
                <FiChevronRight style={{ cursor: 'pointer' }} onClick={() => navigate('/simple')} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {SIMPLE_REMINDERS.map(r => (
                  <div key={r.id} className="flex justify-between items-center" style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ fontSize: '20px', color: r.color }}>{r.icon}</div>
                       <div>
                         <div style={{ fontWeight: 700, fontSize: '14px' }}>{r.title}</div>
                         <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.time}</div>
                       </div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate('/simple')}>SCHEDULE</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Shopping Summary Card */}
            <div className="card" style={{ padding: '28px' }}>
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><GiShoppingBag style={{ color: 'var(--accent2)' }} /> {t('procurement').toUpperCase()}</span>
                <FiChevronRight style={{ cursor: 'pointer' }} onClick={() => navigate('/shopping')} />
              </div>
              <div style={{ marginTop: '20px' }}>
                {lists.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {lists.slice(0, 3).map(list => (
                      <div key={list._id} className="flex justify-between items-center" style={{ padding: '12px', borderLeft: '3px solid var(--accent2)', background: 'rgba(255,255,255,0.02)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{list.title.toUpperCase()}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{list.items.length} items logged</div>
                        </div>
                        <span className="mono" style={{ color: 'var(--low)', fontWeight: 800 }}>₹{list.totalCost?.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', opacity: 0.5 }}>
                    <GiDeliveryDrone style={{ fontSize: '32px', marginBottom: '10px' }} />
                    <div style={{ fontSize: '12px' }}>Global supply chain idle.</div>
                  </div>
                )}
                <button 
                  className="btn btn-primary btn-sm w-full" 
                  style={{ marginTop: '20px' }}
                  onClick={() => navigate('/shopping')}
                >
                  {t('shopping').toUpperCase()}
                </button>
              </div>
            </div>
          </div>

          {/* Simple Motivational Card */}
          <div className="card" style={{ 
            padding: '40px', 
            textAlign: 'center',
            background: 'linear-gradient(rgba(79, 70, 229, 0.05), rgba(0,0,0,0))',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '12px' }}>
              {t('simple').toUpperCase()} MODE
            </h3>
            <p style={{ color: 'var(--text2)', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
               {t('system_operational')}
            </p>
            <div className="flex gap-12 justify-center">
               <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>{t('stats').toUpperCase()}</button>
               <button className="btn btn-primary btn-sm" onClick={() => navigate('/simple')}>{t('reminders').toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTaskStore, useAuthStore } from '../store';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import { notificationService } from '../services/notifications';

// Professional Icons
import { FiPlus, FiBarChart, FiCalendar, FiEdit3, FiTrash2, FiLink, FiClock, FiCheckCircle, FiInfo, FiChevronRight, FiMaximize2, FiAlertCircle, FiCheck, FiX, FiChevronUp, FiChevronDown, FiMinimize2, FiZap, FiTarget } from 'react-icons/fi';
import { GiCrystalBall } from 'react-icons/gi';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['Study', 'Work', 'Health', 'Shopping', 'Personal', 'Project', 'General'];

const EMPTY_TASK = { name: '', priority: 'Medium', category: 'General', startTime: '', duration: 60, xpReward: 25, notes: '', link: '', goalTag: '' };

const safeFormat = (date, fmt) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  try {
    return format(d, fmt);
  } catch (e) {
    return '';
  }
};

export default function TasksPage() {
  const { tasks, fetchTasks, createTask, updateTask, completeTask, deleteTask, bulkCreateTasks, bulkDeleteTasks } = useTaskStore();
  const user = useAuthStore(s => s.user);
  
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(EMPTY_TASK);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isLogMinimized, setIsLogMinimized] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchTasks(); }, []);

  // Compute the "Unit Task" (Immediate next objective)
  const unitTask = useMemo(() => {
    return tasks
      .filter(t => t.status === 'pending')
      .sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime) - new Date(b.startTime);
      })[0];
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      // Exclude the currently featured unitTask from the main list to avoid duplication
      if (unitTask && t._id === unitTask._id && filter !== 'completed') return false;

      if (filter === 'all') {
        // In 'all' view, only show completed if specifically toggled, otherwise 'close' them
        return showCompleted ? true : t.status !== 'completed';
      }
      if (filter === 'pending') return t.status === 'pending';
      if (filter === 'completed') return t.status === 'completed';
      if (filter === 'critical') return t.priority === 'Critical';
      return true;
    });

    const groups = {};
    filtered.forEach(t => {
      let dateKey = 'Unscheduled';
      if (t.startTime) {
        const d = new Date(t.startTime);
        if (!isNaN(d.getTime())) {
          dateKey = format(d, 'yyyy-MM-dd');
        }
      }
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Unscheduled') return 1;
      if (b[0] === 'Unscheduled') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [tasks, filter, unitTask, showCompleted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, startTime: form.startTime || null };
      if (editTask) {
        await updateTask(editTask._id, payload);
        toast.success('Task updated');
      } else {
        const task = await createTask(payload);
        notificationService.scheduleTaskNotification(task);
        toast.success('Task created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const [extractionLogs, setExtractionLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExtractionLogs([{ step: 'init', status: 'pending', details: 'Preparing professional extraction environment...' }]);
    setIsProcessing(true);
    setIsLogMinimized(false);
    setImportPreview(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/extract-tasks?live=true`, {
        method: 'POST',
        body: fd,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.step) {
              setExtractionLogs(prev => {
                const filtered = prev.filter(l => l.step !== data.step);
                return [...filtered, data];
              });
            }

            if (data.success) {
              setImportPreview(data.tasks);
              toast.success(`Success: ${data.totalTasks} professional tasks synchronized.`);
              setIsProcessing(false);
            }

            if (data.error) {
              toast.error(data.error);
              setIsProcessing(false);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Extraction lifecycle interrupted.');
      setIsProcessing(false);
    }
    fileRef.current.value = '';
  };

  const confirmImport = async () => {
    setLoading(true);
    try {
      await bulkCreateTasks(importPreview);
      toast.success('Tasks imported');
      setImportPreview(null);
      setExtractionLogs([]);
      setIsProcessing(false);
    } catch (err) {
      toast.error('Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTasks.size === 0) return;
    if (window.confirm(`Permanently delete ${selectedTasks.size} tasks?`)) {
      setLoading(true);
      try {
        await bulkDeleteTasks(Array.from(selectedTasks));
        setSelectedTasks(new Set());
        setIsSelectMode(false);
        toast.success('Tasks deleted');
      } catch (err) {
        toast.error('Purge failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="tasks-container slide-up">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Task List</h1>
          <p className="page-subtitle">{tasks.length} active tasks found</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isSelectMode ? (
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-xs" onClick={() => setSelectedTasks(selectedTasks.size === tasks.length ? new Set() : new Set(tasks.map(t => t._id)))}>
                {selectedTasks.size === tasks.length ? 'Deselect' : 'Select All'}
              </button>
              {selectedTasks.size > 0 && <button className="btn btn-danger btn-xs" onClick={handleDeleteSelected}><FiTrash2 /> Purge ({selectedTasks.size})</button>}
              <button className="btn btn-ghost btn-xs" onClick={() => { setIsSelectMode(false); setSelectedTasks(new Set()); }}>Exit Mode</button>
            </div>
          ) : (
            <>
              <button className="btn btn-ghost btn-xs" onClick={() => setIsSelectMode(true)}><FiMaximize2 /> Bulk Actions</button>
              {user?.mode === 'ultimate' && (
                <>
                  <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleExcelUpload} />
                  <button className="btn btn-ghost btn-xs" onClick={() => fileRef.current.click()}><FiBarChart /> AI Extract</button>
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setForm(EMPTY_TASK); setShowModal(true); }}>
                <FiPlus /> New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Embedded Terminal-Style Extraction Lifecycle */}
      {(isProcessing || (extractionLogs.length > 0 && !importPreview)) && (
        <div style={{
          margin: '0 auto 40px auto',
          maxWidth: '800px',
          background: 'rgba(10, 15, 28, 0.4)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.5s ease',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
        }}>
          {/* Terminal Header */}
          <div style={{ 
            padding: '12px 20px', 
            background: 'rgba(255, 255, 255, 0.03)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: isLogMinimized ? 'none' : '1px solid rgba(255, 255, 255, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={isProcessing ? "blink" : ""} style={{ width: '8px', height: '8px', borderRadius: '50%', background: isProcessing ? '#22c55e' : '#64748b' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px' }}>
                TERMINAL // {isProcessing ? 'SCANNING' : 'STBY'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {extractionLogs.some(l => l.status === 'error') && (
                <button onClick={() => { setExtractionLogs([]); setIsProcessing(false); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
                  <FiX />
                </button>
              )}
              <button 
                onClick={() => setIsLogMinimized(!isLogMinimized)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}
              >
                {isLogMinimized ? <FiChevronDown /> : <FiChevronUp />}
              </button>
            </div>
          </div>

          {!isLogMinimized && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['init', 'parsing', 'extraction', 'optimization', 'ai', 'finalize'].map((stepId) => {
                const log = extractionLogs.find(l => l.step === stepId);
                const isStandby = !log;
                const isError = log?.status === 'error';
                const isDone = log?.status === 'done';
                const isPending = log?.status === 'pending';

                let prefix = isStandby ? '[WAIT]' : isError ? '[FAIL]' : isPending ? '[EXEC]' : '[DONE]';
                let color = isStandby ? 'rgba(234, 179, 8, 0.4)' : isError ? '#ef4444' : '#22c55e';
                
                const codeLabels = {
                  init: 'INIT_LIFECYCLE',
                  parsing: 'PARSE_DOCUMENT',
                  extraction: 'PATTERN_SCAN',
                  optimization: 'ALGO_OPT',
                  ai: 'AI_COGNITIVE_RUN',
                  finalize: 'SYNC_DATABASE'
                };

                return (
                  <div key={stepId} style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    opacity: isStandby ? 0.2 : 1,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ color: color, fontSize: '11px', fontWeight: 800, width: '45px' }}>{prefix}</span>
                      <span style={{ color: isError ? '#ef4444' : 'var(--text-bright)', fontSize: '12px', fontWeight: 600 }}>
                        {codeLabels[stepId]}()
                      </span>
                      {isPending && <span className="blink" style={{ color: '#22c55e', fontSize: '12px', marginLeft: '4px' }}>_</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Import Preview */}
      {importPreview && (
        <div className="card goal-card slide-up" style={{ marginBottom: '40px', border: '1px solid var(--accent)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-bright)' }}>
                <GiCrystalBall style={{ color: 'var(--accent)' }} /> Synchronized Preview
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Found {importPreview.length} potential activities across your schedule</p>
            </div>
            <div className="flex gap-12">
              <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>Discard</button>
              <button className="btn btn-primary btn-sm" onClick={confirmImport} disabled={loading} style={{ padding: '8px 20px' }}>Finalize Import</button>
            </div>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '12px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {Object.entries(
              importPreview.reduce((acc, t) => {
                const d = t.date || 'TBD';
                if (!acc[d]) acc[d] = [];
                acc[d].push(t);
                return acc;
              }, {})
            ).sort((a,b) => a[0].localeCompare(b[0])).map(([date, dayTasks]) => (
              <div key={date}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  color: 'var(--text3)', 
                  marginBottom: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  <FiCalendar /> {date === 'TBD' ? 'UNDATED' : format(new Date(date), 'EEEE, MMM do')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dayTasks.map((t, i) => (
                    <div key={i} className={`task-card card-sm`} style={{ 
                      background: 'var(--glass)', 
                      borderLeft: `4px solid ${
                        t.priority === 'critical' ? 'var(--critical)' : 
                        t.priority === 'high' ? 'var(--high)' : 
                        'var(--glass-border)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{ width: '100px', flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-bright)', fontWeight: 600 }}>{t.time || 'TBD'}</span>
                          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{t.duration} MINS</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-bright)' }}>{t.title}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' }}>{t.category}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge badge-${t.priority?.toLowerCase() || 'low'}`} style={{ fontSize: '9px' }}>{t.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Sequencing Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['all', 'pending', 'critical', 'completed'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              {f}
            </button>
          ))}
        </div>
        {(filter === 'all') && (
          <button 
            className={`btn btn-xs ${showCompleted ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setShowCompleted(!showCompleted)}
            style={{ fontSize: '10px', opacity: 0.8 }}
          >
            {showCompleted ? 'HIDE COMPLETED' : 'SHOW COMPLETED'}
          </button>
        )}
      </div>

      {/* Unit Task Highlight (The "Next Objective") */}
      {unitTask && filter !== 'completed' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card unit-task-glow" 
          style={{ 
            marginBottom: '40px', 
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(6, 182, 212, 0.05))',
            border: '1px solid rgba(79, 70, 229, 0.3)',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--accent)', padding: '6px', borderRadius: '8px' }}>
              <FiZap style={{ color: 'white', fontSize: '18px' }} />
            </div>
            <div>
              <span className="label" style={{ margin: 0 }}>UNIT TASK // NEXT OBJECTIVE</span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-bright)', marginTop: '2px' }}>{unitTask.name}</h2>
            </div>
            <div style={{ marginLeft: 'auto' }}>
               <button 
                className="btn btn-primary btn-sm" 
                onClick={() => completeTask(unitTask._id)}
                style={{ borderRadius: '30px', padding: '10px 24px', fontWeight: 800 }}
              >
                COMPLETE & ADVANCE
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div className="flex items-center gap-8">
              <FiCalendar style={{ color: 'var(--accent)', fontSize: '14px' }} />
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-bright)', fontWeight: 700, textTransform: 'uppercase' }}>
                {unitTask.startTime ? safeFormat(unitTask.startTime, 'EEEE, MMMM do') : 'UNDATED'}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <FiClock style={{ color: 'var(--text3)' }} />
              <span className="mono" style={{ fontSize: '13px', color: 'var(--text2)' }}>
                {unitTask.startTime ? safeFormat(unitTask.startTime, 'h:mm a') : 'TBD'} • {unitTask.duration} MINS
              </span>
            </div>
            <div className={`badge badge-${unitTask.priority.toLowerCase()}`}>{unitTask.priority}</div>
            <div style={{ color: 'var(--xp)', fontWeight: 800, fontSize: '12px' }}>+{unitTask.xpReward} XP REWARD</div>
          </div>
        </motion.div>
      )}

      {/* Task List */}
      <div className="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {groupedTasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ textAlign: 'center', padding: '80px', background: 'transparent', borderStyle: 'dashed' }}>
            <FiTarget style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }} />
            <div style={{ color: 'var(--text3)', fontSize: '16px', fontWeight: 600 }}>All objectives secured for this segment.</div>
          </motion.div>
        ) : groupedTasks.map(([date, dateTasks], groupIdx) => (
          <div key={date} className="slide-up" style={{ animationDelay: `${groupIdx * 0.1}s` }}>
            <div className="date-group-header" style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--accent)',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              <FiCalendar style={{ fontSize: '16px' }} />
              {date === 'Unscheduled' ? 'NO DATE SET' : safeFormat(date, 'EEEE, MMMM do, yyyy').toUpperCase()}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <AnimatePresence mode="popLayout">
                {dateTasks.map((task) => {
                  const startTime = task.startTime ? new Date(task.startTime) : null;
                  const endTime = (startTime && task.duration > 0) 
                    ? new Date(startTime.getTime() + task.duration * 60000) 
                    : null;

                  return (
                    <motion.div 
                      key={task._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`task-card ${task.status === 'completed' ? 'completed' : ''}`} 
                      style={{ 
                        padding: '18px 24px',
                        borderLeft: `4px solid ${
                          task.priority === 'Critical' ? 'var(--critical)' : 
                          task.priority === 'High' ? 'var(--high)' : 
                          task.priority === 'Medium' ? 'var(--medium)' :
                          'var(--glass-border)'
                        }`,
                        background: 'var(--glass)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        overflow: 'hidden'
                      }}
                    >
                      {isSelectMode ? (
                        <button className={`task-checkbox ${selectedTasks.has(task._id) ? 'checked' : ''}`} onClick={() => {
                          const newSet = new Set(selectedTasks);
                          if (newSet.has(task._id)) newSet.delete(task._id);
                          else newSet.add(task._id);
                          setSelectedTasks(newSet);
                        }} style={{ width: '24px', height: '24px' }}>
                          {selectedTasks.has(task._id) && <FiCheckCircle />}
                        </button>
                      ) : (
                        <button className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => task.status !== 'completed' && completeTask(task._id)} title="Complete Task">
                          {task.status === 'completed' && <FiCheckCircle />}
                        </button>
                      )}
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                            {/* Time Info */}
                            <div style={{ width: '120px', flexShrink: 0 }}>
                              <div className="mono" style={{ fontSize: '13px', color: 'var(--text-bright)', fontWeight: 700 }}>
                                {startTime && !isNaN(startTime.getTime()) ? safeFormat(startTime, 'h:mm a') : 'TBD'}
                                {endTime && !isNaN(endTime.getTime()) && <span style={{ color: 'var(--text3)', margin: '0 4px', fontSize: '10px' }}>→</span>}
                                {endTime && !isNaN(endTime.getTime()) && <span style={{ color: 'var(--text2)', fontSize: '12px' }}>{safeFormat(endTime, 'h:mm a')}</span>}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px', fontFamily: 'JetBrains Mono', letterSpacing: '0.5px' }}>
                                <FiClock style={{ display: 'inline', fontSize: '10px', marginRight: '4px' }} />
                                {task.duration || 0} MINS
                              </div>
                            </div>

                            {/* Task Info */}
                            <div style={{ flex: 1 }}>
                              <h3 className="task-name" style={{ 
                                fontSize: '16px', 
                                margin: 0, 
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none', 
                                color: task.status === 'completed' ? 'var(--text3)' : 'var(--text-bright)' 
                              }}>
                                {task.name}
                              </h3>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: '9px' }}>{task.priority.toUpperCase()}</span>
                                {task.category && <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{task.category}</span>}
                                <span style={{ color: 'var(--xp)', fontSize: '10px', fontWeight: 800 }}>+{task.xpReward} XP</span>
                              </div>
                            </div>
                          </div>

                          {!isSelectMode && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {task.link && (
                                <a href={task.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-xs" title="Open Link">
                                  <FiLink />
                                </a>
                              )}
                              <button className="btn btn-ghost btn-icon btn-xs" onClick={() => { setEditTask(task); setForm({ ...task, startTime: task.startTime ? formatDatetimeLocal(task.startTime) : '' }); setShowModal(true); }}><FiEdit3 /></button>
                              <button className="btn btn-danger btn-icon btn-xs" onClick={() => window.confirm('Permanently delete this task?') && deleteTask(task._id)}><FiTrash2 /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="form-group">
                <label className="label">Task Name</label>
                <input className="input" placeholder="What needs to be done?" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Priority Level</label>
                  <select className="input select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Category</label>
                  <select className="input select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Start Time</label>
                  <input className="input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Resource Link</label>
                <input className="input" placeholder="https://" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Notes</label>
                <textarea className="input" placeholder="Any additional details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ color: 'var(--xp)', fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                  REWARD: +{form.xpReward} XP
                </div>
                <div className="flex gap-12">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>
                    {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> SAVING...</> : editTask ? 'UPDATE' : 'CREATE'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDatetimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

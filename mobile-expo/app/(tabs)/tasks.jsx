import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SectionList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { notificationService } from '../../src/services/notifications';
import api from '../../src/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../src/config/theme';
import { getTranslation } from '../../src/services/i18n';
import { ShoppingIcon, ReminderIcon, FolderIcon } from '../../src/components/CustomIcons';
import { useTaskStore, useAuthStore, useUIStore } from '../../src/store';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['Study', 'Work', 'Health', 'Shopping', 'Personal', 'Project', 'General'];
const PRIORITY_ICON = { 
  Critical: { name: 'alert-decagram', color: '#ef4444' }, 
  High: { name: 'chevron-double-up', color: '#f97316' }, 
  Medium: { name: 'chevron-up', color: '#eab308' }, 
  Low: { name: 'chevron-down', color: '#22c55e' } 
};

const TECH_LOGOS = {
  python: { name: 'language-python', color: '#3776AB' },
  sql: { name: 'database', color: '#4479A1' },
  javascript: { name: 'language-javascript', color: '#F7DF1E' },
  js: { name: 'language-javascript', color: '#F7DF1E' },
  react: { name: 'react', color: '#61DAFB' },
  java: { name: 'language-java', color: '#007396' },
  cpp: { name: 'language-cpp', color: '#00599C' },
  "c++": { name: 'language-cpp', color: '#00599C' },
  excel: { name: 'microsoft-excel', color: '#217346' },
  html: { name: 'language-html5', color: '#E34F26' },
  css: { name: 'language-css3', color: '#1572B6' },
  node: { name: 'nodejs', color: '#339933' },
  docker: { name: 'docker', color: '#2496ED' },
  git: { name: 'git', color: '#F05032' },
};

// Optimized TaskIcon with memoization
const TaskIcon = React.memo(({ name, status, priority }) => {
  const lowerName = name?.toLowerCase() || '';
  const tech = useMemo(() => Object.keys(TECH_LOGOS).find(k => lowerName.includes(k)), [lowerName]);
  
  if (tech) {
    const logo = TECH_LOGOS[tech];
    return (
      <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={logo.name} size={28} color={status === 'completed' ? Colors.text3 : logo.color} />
        {status === 'completed' && (
          <View style={{ position: 'absolute', backgroundColor: 'rgba(34, 197, 94, 0.8)', borderRadius: 10, padding: 1 }}>
            <Feather name="check" size={14} color={Colors.white} />
          </View>
        )}
      </View>
    );
  }

  const pIcon = PRIORITY_ICON[priority] || PRIORITY_ICON.Medium;
  return (
    <View style={[st.checkbox, status === 'completed' && st.checkboxDone, { borderColor: pIcon.color }]}>
      {status === 'completed' ? (
        <Feather name="check" size={12} color={Colors.white} />
      ) : (
        <MaterialCommunityIcons name={pIcon.name} size={14} color={pIcon.color} />
      )}
    </View>
  );
});

// Extracted TaskItem for better performance and SectionList usage
const TaskItem = React.memo(({ task, onComplete, onEdit, t }) => {
  const isCompleted = task.status === 'completed';
  const pColor = (PRIORITY_ICON[task.priority] || PRIORITY_ICON.Medium).color;

  return (
    <View style={[st.taskCard, { borderLeftColor: pColor }, isCompleted && { opacity: 0.6 }]}>
      <Pressable onPress={() => !isCompleted && onComplete(task._id)} style={{ marginRight: 12 }}>
        <View style={[st.checkbox, isCompleted && st.checkboxDone, { borderColor: pColor }]}>
           {isCompleted && <Feather name="check" size={12} color={Colors.white} />}
        </View>
      </Pressable>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={[st.taskName, isCompleted && { textDecorationLine: 'line-through', color: Colors.text3 }]}>
            {task.name}
          </Text>
          <Pressable onPress={() => onEdit(task)} style={st.iconBtn}>
            <Feather name="edit-2" size={14} color={Colors.text3} />
          </Pressable>
        </View>

        <View style={st.taskMeta}>
          <View style={st.badge}>
            <Text style={[st.badgeText, { color: pColor }]}>{task.priority || 'Medium'}</Text>
          </View>
          <View style={st.badge}>
            <Text style={st.badgeText}>{task.category || 'General'}</Text>
          </View>
          {task.startTime && (
            <View style={st.timeRow}>
              <Feather name="clock" size={10} color={Colors.text2} style={{ marginRight: 4 }} />
              <Text style={st.timeText}>{format(new Date(task.startTime), 'h:mm a')}</Text>
            </View>
          )}
          {task.duration && (
            <View style={st.timeRow}>
              <Text style={st.timeText}>{task.duration}m</Text>
            </View>
          )}
          {task.goalTag ? <Text style={{ fontSize: 11, color: Colors.accent }}>#{task.goalTag}</Text> : null}
          {task.reminder15min && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ReminderIcon size={12} color={Colors.medium} />
              <Text style={{ fontSize: 11, color: Colors.medium }}>{t('reminders')}</Text>
            </View>
          )}
        </View>
        {task.motivationQuote ? <Text style={st.quote}>"{task.motivationQuote}"</Text> : null}
        {task.notes ? <Text style={st.notes}>{task.notes}</Text> : null}
      </View>
    </View>
  );
});

const EMPTY_TASK = {
  name: '', priority: 'Medium', category: 'General', startTime: '', duration: '60',
  deadline: '', link: '', xpReward: '25', notes: '', reminder15min: false, goalTag: '',
};

export default function TasksScreen() {
  const { tasks, fetchTasks, createTask, updateTask, completeTask, deleteTask, bulkCreateTasks } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [xpPopup, setXpPopup] = useState(null);
  const [priorityPickerVisible, setPriorityPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const setShowTopBar = useUIStore(s => s.setShowTopBar);
  const lastOffset = useRef(0);

  useEffect(() => {
    fetchTasks();
  }, []);

  const runLayoutAnimation = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const unitTask = useMemo(() => tasks
    .filter(t => t.status === 'pending')
    .sort((a,b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    })[0], [tasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const openCreate = () => { setEditTask(null); setForm(EMPTY_TASK); setShowModal(true); };
  
  const openEdit = useCallback((task) => {
    setEditTask(task);
    setForm({
      name: task.name || '',
      priority: task.priority || 'Medium',
      category: task.category || 'General',
      startTime: task.startTime || '',
      duration: String(task.duration || 60),
      deadline: task.deadline || '',
      link: task.link || '',
      xpReward: String(task.xpReward || 25),
      notes: task.notes || '',
      reminder15min: task.reminder15min || false,
      goalTag: task.goalTag || '',
    });
    setShowModal(true);
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Task name is required'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        duration: parseInt(form.duration) || 60,
        xpReward: parseInt(form.xpReward) || 25,
        startTime: form.startTime || null,
        deadline: form.deadline || null,
      };
      if (editTask) {
        await updateTask(editTask._id, payload);
        Alert.alert('Success', 'Task updated');
      } else {
        const task = await createTask(payload);
        await notificationService.scheduleTaskNotification(task);
        Alert.alert('Success', 'Task created!');
      }
      setShowModal(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = useCallback(async (id) => {
    try {
      runLayoutAnimation();
      const result = await completeTask(id);
      setXpPopup(`+${result.xpGained} XP`);
      setTimeout(() => {
        runLayoutAnimation();
        setXpPopup(null);
      }, 2000);
    } catch {
      Alert.alert('Error', 'Failed to complete task');
    }
  }, [completeTask, runLayoutAnimation]);

  const handleExcelUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const res = await api.post('/upload/excel/tasks/base64', { data: base64 });
      setImportPreview(res.data.tasks);
      Alert.alert('Excel Parsed', `Found ${res.data.count} tasks`);
    } catch (err) {
      Alert.alert('Error', 'Failed to parse Excel');
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setLoading(true);
    try {
      const result = await bulkCreateTasks(importPreview);
      Alert.alert('Imported', `${result.tasks.length} tasks imported!`);
      for (const t of result.tasks) await notificationService.scheduleTaskNotification(t);
      setImportPreview(null);
    } catch {
      Alert.alert('Error', 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const lang = user?.settings?.language || 'en';
  const t = useCallback((key) => getTranslation(key, lang), [lang]);

  // High Performance Grouping
  const sections = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (unitTask && t._id === unitTask._id && filter !== 'completed') return false;
      if (filter === 'all') return showCompleted ? true : t.status !== 'completed';
      if (filter === 'pending') return t.status === 'pending';
      if (filter === 'completed') return t.status === 'completed';
      if (filter === 'critical') return t.priority === 'Critical';
      return true;
    });

    const grouped = filtered.reduce((acc, task) => {
      const dateKey = task.startTime ? format(new Date(task.startTime), 'yyyy-MM-dd') : 'No Date Set';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a === 'No Date Set') return 1;
        if (b === 'No Date Set') return -1;
        return a.localeCompare(b);
      })
      .map(([date, data]) => ({
        title: date === 'No Date Set' ? t('no_date') : format(new Date(date), 'EEEE, MMM d'),
        data,
      }));
  }, [tasks, unitTask, filter, showCompleted, t]);

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    if (currentOffset <= 0) setShowTopBar(true);
    else if (currentOffset > lastOffset.current && currentOffset > 60) setShowTopBar(false);
    else if (currentOffset < lastOffset.current) setShowTopBar(true);
    lastOffset.current = currentOffset;
  };

  const renderSectionHeader = useCallback(({ section: { title } }) => (
    <View style={st.dateHeader}>
      <Feather name="calendar" size={14} color={Colors.text2} style={{ marginRight: 6 }} />
      <Text style={st.dateHeaderText}>{title}</Text>
    </View>
  ), []);

  const renderItem = useCallback(({ item }) => (
    <TaskItem task={item} onComplete={handleComplete} onEdit={openEdit} t={t} />
  ), [handleComplete, openEdit, t]);

  const ListHeader = useMemo(() => (
    <View>
      {/* Header */}
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.pageTitle}>{t('objectives')}</Text>
          <Text style={st.pageSub}>
            {tasks.filter((t) => t.status !== 'completed').length} {t('pending')} · {' '}
            {tasks.filter((t) => t.status === 'completed').length} {t('completed')}
          </Text>
        </View>
        <View style={st.btnRow}>
          {user?.mode === 'ultimate' && (
            <Pressable style={st.ghostBtn} onPress={handleExcelUpload}>
              <FolderIcon size={16} color={Colors.text2} />
              <Text style={st.ghostBtnText}>{t('import')}</Text>
            </Pressable>
          )}
          <Pressable style={st.primaryBtn} onPress={openCreate}>
            <Feather name="plus" size={16} color={Colors.white} />
            <Text style={st.primaryBtnText}>{t('new')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Import Preview */}
      {importPreview && (
        <View style={[st.card, { borderColor: 'rgba(59,130,246,0.4)' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontWeight: '700', color: Colors.text, fontSize: 15 }}>📊 Preview ({importPreview.length})</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={st.ghostBtn} onPress={() => setImportPreview(null)}><Text style={st.ghostBtnText}>Cancel</Text></Pressable>
              <Pressable style={st.primaryBtn} onPress={confirmImport} disabled={loading}><Text style={st.primaryBtnText}>{loading ? '...' : 'Import'}</Text></Pressable>
            </View>
          </View>
          {importPreview.slice(0, 5).map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: Colors[t.priority?.toLowerCase()] || Colors.text2 }}>{t.priority}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text }}>{t.task || t.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filters */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['all', 'pending', 'critical', 'completed'].map((f) => (
            <Pressable
              key={f}
              style={[st.filterBtn, filter === f && st.filterBtnActive]}
              onPress={() => { runLayoutAnimation(); setFilter(f); }}
            >
              <Text style={[st.filterBtnText, filter === f && st.filterBtnTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        {filter === 'all' && (
           <Pressable style={{ opacity: 0.6 }} onPress={() => { runLayoutAnimation(); setShowCompleted(!showCompleted); }}>
           <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.text3 }}>{showCompleted ? 'HIDE DONE' : 'SHOW DONE'}</Text>
         </Pressable>
        )}
      </View>

      {/* Unit Task */}
      {unitTask && filter !== 'completed' && (
        <View style={st.unitCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={st.unitBadge}><Text style={st.unitBadgeText}>UNIT</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.unitSub}>NEXT OBJECTIVE</Text>
              <Text style={st.unitTitle}>{unitTask.name}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={st.unitMeta}>🗓 {unitTask.startTime ? format(new Date(unitTask.startTime), 'EEEE, MMM d') : 'No Date Set'}</Text>
              <Text style={st.unitXp}>🕒 {unitTask.startTime ? format(new Date(unitTask.startTime), 'h:mm a') : 'TBD'} · +{unitTask.xpReward} XP</Text>
            </View>
            <Pressable style={st.advanceBtn} onPress={() => handleComplete(unitTask._id)}>
              <Text style={st.advanceBtnText}>Advance</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  ), [tasks, unitTask, filter, showCompleted, importPreview, loading, t, handleComplete, openCreate, runLayoutAnimation, user?.mode]);

  return (
    <View style={st.container}>
      {xpPopup && <View style={st.xpPopup}><Text style={st.xpPopupText}>{xpPopup}</Text></View>}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        stickySectionHeadersEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* Task Form Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>{editTask ? t('edit') : t('new')}</Text>
                <Pressable onPress={() => setShowModal(false)} style={st.modalCloseBtn}><Feather name="x" size={20} color={Colors.text2} /></Pressable>
              </View>

              <Text style={st.label}>Task Name *</Text>
              <TextInput style={st.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="What needs to be done?" placeholderTextColor={Colors.text3} />

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Priority</Text>
                  <Pressable style={st.input} onPress={() => setPriorityPickerVisible(true)}><Text style={{ color: Colors.text }}>{form.priority}</Text></Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Category</Text>
                  <Pressable style={st.input} onPress={() => setCategoryPickerVisible(true)}><Text style={{ color: Colors.text }}>{form.category}</Text></Pressable>
                </View>
              </View>

              <View style={st.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Duration (min)</Text>
                  <TextInput style={st.input} keyboardType="numeric" value={form.duration} onChangeText={(v) => setForm((f) => ({ ...f, duration: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>XP Reward</Text>
                  <TextInput style={st.input} keyboardType="numeric" value={form.xpReward} onChangeText={(v) => setForm((f) => ({ ...f, xpReward: v }))} />
                </View>
              </View>

              <Text style={st.label}>Goal Tag</Text>
              <TextInput style={st.input} value={form.goalTag} onChangeText={(v) => setForm((f) => ({ ...f, goalTag: v }))} placeholder="e.g. placement, exam, fitness" placeholderTextColor={Colors.text3} />

              <Text style={st.label}>Link (optional)</Text>
              <TextInput style={st.input} value={form.link} onChangeText={(v) => setForm((f) => ({ ...f, link: v }))} placeholder="https://..." placeholderTextColor={Colors.text3} autoCapitalize="none" />

              <Text style={st.label}>Notes</Text>
              <TextInput style={[st.input, { minHeight: 60, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Additional notes..." placeholderTextColor={Colors.text3} multiline />

              <Pressable style={st.checkRow} onPress={() => setForm((f) => ({ ...f, reminder15min: !f.reminder15min }))}>
                <View style={[st.checkBox, form.reminder15min && st.checkBoxChecked]}>{form.reminder15min && <Text style={{ color: Colors.white, fontSize: 10 }}>✓</Text>}</View>
                <Text style={{ flex: 1, fontSize: 13, color: Colors.text }}>🔁 15-minute repeating reminders until complete</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Pressable style={[st.ghostBtnLg, { flex: 1 }]} onPress={() => setShowModal(false)}><Text style={st.ghostBtnText}>Cancel</Text></Pressable>
                <Pressable style={[st.primaryBtnLg, { flex: 1 }]} onPress={handleSubmit} disabled={loading}>{loading ? <ActivityIndicator color={Colors.white} /> : <Text style={st.primaryBtnText}>{editTask ? 'Update' : 'Create'}</Text>}</Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pickers omitted for brevity - keeping logic for priority/category hidden here but it's in the full file */}
      <Modal visible={priorityPickerVisible} animationType="fade" transparent>
        <Pressable style={st.pickerOverlay} onPress={() => setPriorityPickerVisible(false)}>
          <View style={st.pickerBox}>
            {PRIORITIES.map((p) => (
              <Pressable key={p} style={[st.pickerItem, form.priority === p && { backgroundColor: 'rgba(59,130,246,0.1)' }]} onPress={() => { setForm(f => ({ ...f, priority: p })); setPriorityPickerVisible(false); }}>
                <Text style={{ color: Colors.text }}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={categoryPickerVisible} animationType="fade" transparent>
        <Pressable style={st.pickerOverlay} onPress={() => setCategoryPickerVisible(false)}>
          <View style={st.pickerBox}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} style={[st.pickerItem, form.category === c && { backgroundColor: 'rgba(59,130,246,0.1)' }]} onPress={() => { setForm(f => ({ ...f, category: c })); setCategoryPickerVisible(false); }}>
                <Text style={{ color: Colors.text }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingTop: 110 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  pageSub: { color: Colors.text2, fontSize: 13, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  card: { backgroundColor: Colors.card, borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  ghostBtnText: { color: Colors.text2, fontSize: 13, fontWeight: '700' },
  ghostBtnLg: { paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  primaryBtnLg: { backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterBtnText: { color: Colors.text3, fontSize: 13, fontWeight: '600' },
  filterBtnTextActive: { color: Colors.white },
  taskCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, flexDirection: 'row', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: Colors.low, borderColor: Colors.low },
  taskName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'center' },
  quote: { fontSize: 12, color: Colors.text3, fontStyle: 'italic', marginTop: 6 },
  notes: { fontSize: 12, color: Colors.text3, marginTop: 4 },
  iconBtn: { padding: 4 },
  xpPopup: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: Colors.xp, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 1000 },
  xpPopupText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: Colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, color: Colors.text, fontSize: 15 },
  row2: { flexDirection: 'row', gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: Colors.text3, alignItems: 'center', justifyContent: 'center' },
  checkBoxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: { backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 8, width: 260, borderWidth: 1, borderColor: Colors.border },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 20 },
  dateHeader: { marginBottom: 10, marginTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, paddingVertical: 4 },
  dateHeaderText: { fontSize: 12, fontWeight: '800', color: Colors.accent, letterSpacing: 1 },
  badge: { backgroundColor: Colors.bg3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, color: Colors.text2, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 4, borderRadius: 4 },
  timeText: { fontSize: 11, color: Colors.text, fontWeight: '500' },
  unitCard: { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.3)', borderWidth: 1, marginBottom: 24, padding: 16, borderRadius: 12 },
  unitBadge: { backgroundColor: Colors.accent, padding: 6, borderRadius: 8 },
  unitBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '900' },
  unitSub: { fontSize: 10, fontWeight: '800', color: Colors.text3, letterSpacing: 1 },
  unitTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  unitMeta: { fontSize: 11, color: Colors.text, fontWeight: '700' },
  unitXp: { fontSize: 12, color: Colors.xp, fontWeight: '800' },
  advanceBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  advanceBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});

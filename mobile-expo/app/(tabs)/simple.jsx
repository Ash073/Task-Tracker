import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { notificationService } from '../../src/services/notifications';
import { Colors } from '../../src/config/theme';
import { getTranslation } from '../../src/services/i18n';
import { useAuthStore, useUIStore } from '../../src/store';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const DEFAULT_REMINDERS = [
  { id: 'water', icon: 'droplet', lib: 'Feather', title: 'Drink Water', body: 'Time to hydrate! Drink a glass of water.', times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'], done: false, color: '#3b82f6' },
  { id: 'eat', icon: 'silverware-fork-knife', lib: 'MaterialCommunityIcons', title: 'Eat a Meal', body: "Don't skip your meal. Fuel your body!", times: ['08:30', '13:00', '19:00'], done: false, color: '#f97316' },
  { id: 'exercise', icon: 'weight-lifter', lib: 'MaterialCommunityIcons', title: 'Exercise', body: 'Time to move! Even 15 minutes makes a difference.', times: ['07:00'], done: false, color: '#ef4444' },
  { id: 'sleep', icon: 'bed', lib: 'MaterialCommunityIcons', title: 'Sleep Reminder', body: 'Wind down. Consistent sleep drives consistent performance.', times: ['22:00'], done: false, color: '#8b5cf6' },
  { id: 'study', icon: 'book-open', lib: 'Feather', title: 'Study Session', body: 'Knowledge compounds daily. Open your books.', times: ['09:00', '15:00'], done: false, color: '#eab308' },
  { id: 'meditate', icon: 'meditation', lib: 'MaterialCommunityIcons', title: 'Meditate', body: 'Clear your mind. 5 minutes of calm.', times: ['06:30'], done: false, color: '#10b981' },
];

function ReminderIcon({ icon, lib, color, size = 28 }) {
  if (lib === 'Feather') return <Feather name={icon} size={size} color={color} />;
  return <MaterialCommunityIcons name={icon} size={size} color={color} />;
}

export default function SimpleScreen() {
  const user = useAuthStore(s => s.user);
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [customReminder, setCustomReminder] = useState({ icon: 'star', title: '', time: '09:00', body: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const setShowTopBar = useUIStore(s => s.setShowTopBar);
  const lastOffset = useRef(0);

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    if (currentOffset <= 0) {
      setShowTopBar(true);
    } else if (currentOffset > lastOffset.current && currentOffset > 60) {
      setShowTopBar(false);
    } else if (currentOffset < lastOffset.current) {
      setShowTopBar(true);
    }
    lastOffset.current = currentOffset;
  };

  const handleToggleDone = (id) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const handleScheduleReminder = async (reminder) => {
    const granted = await notificationService.requestPermission();
    if (!granted) {
      Alert.alert('Notifications Required', 'Please enable notifications in Settings');
      return;
    }
    const [hour, minute] = reminder.times[0].split(':').map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next < new Date()) next.setDate(next.getDate() + 1);
    const delay = (next.getTime() - Date.now()) / 1000;
    await notificationService.scheduleLocal({
      title: `${reminder.icon} ${reminder.title}`,
      body: reminder.body,
      delaySeconds: delay,
      tag: reminder.id,
    });
    Alert.alert('Scheduled', `Reminder set for ${reminder.times[0]}`);
  };

  const handleScheduleAll = async () => {
    const granted = await notificationService.requestPermission();
    if (!granted) {
      Alert.alert('Notifications Required', 'Please enable notifications in Settings');
      return;
    }
    for (const r of reminders) {
      await handleScheduleReminder(r);
    }
    Alert.alert('Done', 'All reminders scheduled for tomorrow!');
  };

  const handleAddCustom = () => {
    if (!customReminder.title.trim()) {
      Alert.alert('Error', 'Enter a title');
      return;
    }
    
    if (editingId) {
      setReminders((prev) => prev.map((r) => r.id === editingId ? { ...r, ...customReminder, times: [customReminder.time] } : r));
      Alert.alert('Updated', 'Reminder updated!');
    } else {
      const newR = {
        ...customReminder,
        id: `custom_${Date.now()}`,
        times: [customReminder.time],
        done: false,
        lib: 'MaterialCommunityIcons',
        color: Colors.accent,
      };
      setReminders((prev) => [...prev, newR]);
      Alert.alert('Added', 'Custom reminder added!');
    }
    
    setCustomReminder({ icon: 'star', title: '', time: '09:00', body: '' });
    setShowCustom(false);
    setEditingId(null);
  };

  const openEdit = (reminder) => {
    setCustomReminder({
      icon: reminder.icon,
      title: reminder.title,
      time: reminder.times[0],
      body: reminder.body || '',
    });
    setEditingId(reminder.id);
    setShowCustom(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setReminders(prev => prev.filter(r => r.id !== id));
        setShowCustom(false);
        setEditingId(null);
      }},
    ]);
  };

  return (
    <ScrollView 
      style={st.container} 
      contentContainerStyle={st.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Text style={st.pageTitle}>{t('reminders')}</Text>
      <Text style={st.pageSub}>{t('maintenance')}</Text>

      {/* Reminder Grid */}
      <View style={st.grid}>
        {reminders.map((reminder) => (
          <Pressable
            key={reminder.id}
            style={[st.simpleCard, reminder.done && st.simpleCardDone]}
            onPress={() => handleToggleDone(reminder.id)}
            onLongPress={() => handleScheduleReminder(reminder)}
          >
            <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
              <Pressable onPress={() => openEdit(reminder)}>
                <Feather name="edit-2" size={14} color={Colors.text3} />
              </Pressable>
            </View>
            <ReminderIcon icon={reminder.icon} lib={reminder.lib} color={reminder.done ? Colors.text3 : reminder.color} />
            <Text style={st.simpleTitle}>{reminder.title}</Text>
            <Text style={st.simpleTime}>{reminder.times.join(', ')}</Text>
            {reminder.done && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Feather name="check" size={12} color={Colors.low} />
                <Text style={st.simpleDone}> {t('completed')}</Text>
              </View>
            )}
          </Pressable>
        ))}
        <Pressable style={[st.simpleCard, st.addCard]} onPress={() => setShowCustom(!showCustom)}>
          <Feather name="plus" size={28} color={Colors.text3} style={{ marginBottom: 8 }} />
          <Text style={st.simpleTitle}>Add Custom</Text>
        </Pressable>
      </View>

      {/* Custom Reminder Form */}
      {showCustom && (
        <View style={st.card}>
          <Text style={st.cardTitle}>Custom Reminder</Text>
          <View style={st.row2}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Title</Text>
              <TextInput
                style={st.input}
                value={customReminder.title}
                onChangeText={(v) => setCustomReminder((f) => ({ ...f, title: v }))}
                placeholder="e.g. Take medicine"
                placeholderTextColor={Colors.text3}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Time</Text>
              <TextInput
                style={st.input}
                value={customReminder.time}
                onChangeText={(v) => setCustomReminder((f) => ({ ...f, time: v }))}
                placeholder="HH:MM"
                placeholderTextColor={Colors.text3}
              />
            </View>
          </View>
          <Text style={st.label}>Message</Text>
          <TextInput
            style={st.input}
            value={customReminder.body}
            onChangeText={(v) => setCustomReminder((f) => ({ ...f, body: v }))}
            placeholder="Reminder message..."
            placeholderTextColor={Colors.text3}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable style={st.primaryBtnSm} onPress={handleAddCustom}>
              <Text style={st.primaryBtnSmText}>{editingId ? 'Update' : 'Add'}</Text>
            </Pressable>
            {editingId && (
              <Pressable style={[st.ghostBtn, { borderColor: Colors.danger }]} onPress={() => handleDelete(editingId)}>
                <Feather name="trash-2" size={16} color={Colors.danger} />
              </Pressable>
            )}
            <Pressable style={st.ghostBtn} onPress={() => { setShowCustom(false); setEditingId(null); }}>
              <Text style={st.ghostBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Schedule All Button */}
      <Pressable style={st.bigBtn} onPress={handleScheduleAll}>
        <Feather name="bell" size={20} color={Colors.white} style={{ marginRight: 10 }} />
        <Text style={st.bigBtnText}>Schedule All Reminders</Text>
      </Pressable>

      {/* Daily Checklist */}
      <Text style={[st.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>{t('stats')}</Text>
      <View style={st.card}>
        {reminders.map((r) => (
          <Pressable key={r.id} style={st.checklistItem} onPress={() => handleToggleDone(r.id)}>
            <View style={[st.checkCircle, r.done && st.checkCircleDone]}>
              {r.done && <Feather name="check" size={10} color={Colors.white} />}
            </View>
            <ReminderIcon icon={r.icon} lib={r.lib} color={r.done ? Colors.text3 : r.color} size={20} />
            <Text
              style={{
                flex: 1,
                fontWeight: '600',
                color: r.done ? Colors.text3 : Colors.text,
                textDecorationLine: r.done ? 'line-through' : 'none',
              }}
            >
              {r.title}
            </Text>
            <Text style={{ fontSize: 12, color: Colors.text3 }}>{r.times[0]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingTop: 110 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, paddingHorizontal: 4 },
  pageSub: { color: Colors.text2, fontSize: 14, marginTop: 4, marginBottom: 24, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  simpleCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  simpleCardDone: { borderColor: Colors.low, opacity: 0.7 },
  addCard: { borderStyle: 'dashed' },
  simpleIcon: { fontSize: 28, marginBottom: 8 },
  simpleTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  simpleTime: { fontSize: 12, color: Colors.text2 },
  simpleDone: { fontSize: 11, color: Colors.low, fontWeight: '700', marginTop: 6 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontWeight: '700', color: Colors.text, fontSize: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
  },
  row2: { flexDirection: 'row', gap: 10 },
  primaryBtnSm: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10 },
  primaryBtnSmText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  ghostBtnText: { color: Colors.text2, fontSize: 13 },
  bigBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  bigBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: Colors.low, borderColor: Colors.low },
});

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTaskStore, useAuthStore, useShoppingStore, useUIStore } from '../../src/store';
import { format, isToday } from 'date-fns';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { Colors } from '../../src/config/theme';
import { getTranslation } from '../../src/services/i18n';

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

function TaskIcon({ name, status, priority }) {
  const lowerName = name?.toLowerCase() || '';
  const tech = Object.keys(TECH_LOGOS).find(k => lowerName.includes(k));
  
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
    <View style={[s.checkbox, status === 'completed' && s.checkboxDone, { borderColor: pIcon.color }]}>
      {status === 'completed' ? (
        <Feather name="check" size={12} color={Colors.white} />
      ) : (
        <MaterialCommunityIcons name={pIcon.name} size={14} color={pIcon.color} />
      )}
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const switchMode = useAuthStore((s) => s.switchMode);
  const { tasks, fetchTasks, completeTask } = useTaskStore();
  const { lists, fetchLists } = useShoppingStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [xpPopup, setXpPopup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
  
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.8]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.8, 0]),
  }));

  const mainDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  useEffect(() => {
    fetchTasks();
    if (user?.mode === 'simple') fetchLists();
  }, [user?.mode]);

  const fetchTasksData = React.useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const todayTasks = tasks.filter(
    (t) => t.startTime && isToday(new Date(t.startTime)) && t.status !== 'completed'
  );
  const completedToday = tasks.filter((t) => t.completedAt && isToday(new Date(t.completedAt)));
  const criticalTasks = tasks.filter((t) => t.priority === 'Critical' && t.status !== 'completed');

  const handleComplete = async (id) => {
    try {
      const result = await completeTask(id);
      setXpPopup(`+${result.xpGained} XP`);
      setTimeout(() => setXpPopup(null), 2000);
    } catch {
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/profile/analyze');
      setInsights(res.data);
    } catch {
      Alert.alert('Error', 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };


  const levelProgress = ((user?.xp % 200) / 200) * 100;
  const nextLevelXP = Math.ceil((user?.xp || 0) / 200) * 200;

  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {xpPopup && (
        <View style={s.xpPopup}>
          <Text style={s.xpPopupText}>{xpPopup}</Text>
        </View>
      )}

      {/* Header */}
      <View style={s.headerContainer}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
           <Image source={require('../../assets/logo.png')} style={{ width: 60, height: 60, marginBottom: 10 }} />
        </View>
        <View style={s.topStatusRow}>
          <View style={s.statusBadge}>
            <View style={{ width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View style={[
                s.statusDotGlow, 
                dotStyle, 
                { backgroundColor: criticalTasks.length > 0 ? Colors.high : Colors.low }
              ]} />
              <Animated.View style={[
                s.statusDot, 
                mainDotStyle, 
                { backgroundColor: criticalTasks.length > 0 ? Colors.high : Colors.low }
              ]} />
            </View>
            <Text style={[s.statusText, { color: criticalTasks.length > 0 ? Colors.high : Colors.low }]}>
              {criticalTasks.length > 0 ? t('system_standby') : t('system_operational')}
            </Text>
          </View>
          <Text style={s.streakText}>🔥 {user?.streak || 0} {t('streak')}</Text>
        </View>

        <View style={s.centeredHeader}>
          <Text style={s.greeting}>
            {t(`greeting_${getGreeting()}`)}, <Text style={{ color: Colors.text }}>{user?.name?.split(' ')[0]}</Text> 👋
          </Text>
          <Text style={s.subtitle}>
            {format(new Date(), 'EEEE, MMMM d')} · {user?.mode === 'ultimate' ? `${todayTasks.length} ${t('objectives')}` : t('maintenance')}
          </Text>
        </View>
      </View>


      {user?.mode === 'ultimate' ? (
        <View>
          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Feather name="box" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
              <Text style={[s.statValue, { color: Colors.accent }]}>{todayTasks.length}</Text>
              <Text style={s.statLabel}>{t('pending')}</Text>
            </View>
            <View style={s.statCard}>
              <Feather name="check-circle" size={18} color={Colors.low} style={{ marginBottom: 4 }} />
              <Text style={[s.statValue, { color: Colors.low }]}>{completedToday.length}</Text>
              <Text style={s.statLabel}>{t('completed')}</Text>
            </View>
            <View style={s.statCard}>
              <Feather name="alert-triangle" size={18} color={criticalTasks.length > 0 ? Colors.critical : Colors.text3} style={{ marginBottom: 4 }} />
              <Text style={[s.statValue, { color: criticalTasks.length > 0 ? Colors.critical : Colors.text }]}>
                {criticalTasks.length}
              </Text>
              <Text style={s.statLabel}>{t('critical')}</Text>
            </View>
          </View>

          {/* XP Progress */}
          <View style={s.card}>
            <View style={s.xpHeader}>
              <Text style={s.xpLabel}>{t('level')} {user?.level} {t('progress')}</Text>
              <Text style={s.xpMono}>{user?.xp} / {nextLevelXP} {t('xp')}</Text>
            </View>
            <View style={s.xpBarWrap}>
              <View style={[s.xpBarFill, { width: `${levelProgress}%` }]} />
            </View>
          </View>

          {/* Today's Tasks Summary */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{t('today_tasks')}</Text>
            <Pressable style={s.primaryBtnSm} onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={s.primaryBtnSmText}>{t('edit')}</Text>
            </Pressable>
          </View>

          {todayTasks.length === 0 ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
              <Feather name="check-circle" size={40} color={Colors.low} style={{ marginBottom: 12 }} />
              <Text style={{ color: Colors.text2 }}>All objectives met for this segment</Text>
            </View>
          ) : (
            todayTasks.slice(0, 3).map((task) => (
              <View key={task._id} style={[s.taskCard, { borderLeftColor: (PRIORITY_ICON[task.priority] || PRIORITY_ICON.Medium).color }]}>
                <Pressable style={s.taskIconPadding} onPress={() => handleComplete(task._id)}>
                   <TaskIcon name={task.name} status={task.status} priority={task.priority} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={s.taskName}>{task.name}</Text>
                  <Text style={s.taskXp}>+{task.xpReward} XP</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <View>
          {/* Simple Maintenance Summary */}
          <View style={s.card}>
            <Text style={s.sectionTitleSmall}>{t('maintenance').toUpperCase()}</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
               {[
                 { title: t('reminders'), status: 'Every 2hr', icon: 'refresh-cw', color: '#3b82f6' },
               ].map(item => (
                 <View key={item.title} style={s.simpleItem}>
                    <Feather name={item.icon} size={20} color={item.color} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                       <Text style={{ color: Colors.text, fontWeight: '700' }}>{item.title}</Text>
                    </View>
                    <Pressable style={s.ghostBtnSm} onPress={() => router.push('/(tabs)/simple')}>
                       <Text style={s.ghostBtnTextSmall}>{t('edit')}</Text>
                    </Pressable>
                 </View>
               ))}
            </View>
          </View>

          {/* Procurement Summary */}
          <View style={s.card}>
            <Text style={s.sectionTitleSmall}>{t('procurement').toUpperCase()}</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
               {lists.length > 0 ? (
                 lists.slice(0, 2).map(list => (
                   <View key={list._id} style={s.simpleItem}>
                      <MaterialCommunityIcons name="shopping-outline" size={20} color={Colors.accent} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                         <Text style={{ color: Colors.text, fontWeight: '700' }}>{list.title.toUpperCase()}</Text>
                         <Text style={{ color: Colors.text3, fontSize: 11 }}>{list.items.length} {t('shopping')}</Text>
                      </View>
                      <Text style={{ color: Colors.low, fontWeight: '800' }}>₹{(list.items?.reduce((a,b) => a + (b.cost*b.quantity), 0) || 0).toFixed(0)}</Text>
                   </View>
                 ))
               ) : (
                 <Text style={{ color: Colors.text3, textAlign: 'center', paddingVertical: 10 }}>{t('procurement')} Empty</Text>
               )}
               <Pressable style={[s.primaryBtnSm, { marginTop: 8 }]} onPress={() => router.push('/(tabs)/shopping')}>
                 <Text style={s.primaryBtnSmText}>{t('shopping')}</Text>
               </Pressable>
            </View>
          </View>

          {/* Simple Hero - Cylindrical Design */}
          <View style={s.simpleModeContainer}>
             <View style={s.simpleModePill}>
                <MaterialCommunityIcons name="leaf" size={14} color={Colors.accent} />
                <Text style={s.simpleModeText}>{t('simple').toUpperCase()} VIEW MODE</Text>
             </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingTop: 110 },
  headerContainer: { marginBottom: 24, paddingTop: 20 },
  topStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  centeredHeader: { alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { color: Colors.text2, fontSize: 14, marginTop: 6, textAlign: 'center' },
  streakText: { fontSize: 14, fontWeight: '700', color: Colors.text2 },
  xpText: { fontSize: 12, color: Colors.xp, fontFamily: 'monospace' },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg3,
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  modeBtnActive: { backgroundColor: Colors.accent },
  modeBtnText: { color: Colors.text3, fontWeight: '600', fontSize: 14 },
  modeBtnTextActive: { color: Colors.white },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: Colors.text2, marginTop: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  xpMono: { fontSize: 12, color: Colors.text2, fontFamily: 'monospace' },
  xpBarWrap: { height: 6, backgroundColor: Colors.bg3, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.xp, borderRadius: 3 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalLabel: { fontSize: 12, color: Colors.text2, marginBottom: 4 },
  goalValue: { fontWeight: '700', fontSize: 16, color: Colors.text, textTransform: 'capitalize' },
  weakText: { fontSize: 12, color: Colors.high, marginTop: 4 },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  ghostBtnText: { color: Colors.text2, fontSize: 13 },
  insightBox: { marginTop: 12, padding: 12, backgroundColor: Colors.bg3, borderRadius: 8 },
  insightText: { fontSize: 13, color: Colors.text2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  primaryBtnSm: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  primaryBtnSmText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    flexDirection: 'row',
    gap: 12,
  },
  taskIconPadding: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  badge: { fontSize: 12, fontWeight: '600' },
  taskTime: { fontSize: 12, color: Colors.text2 },
  taskXp: { fontSize: 12, color: Colors.xp, fontFamily: 'monospace' },
  taskQuote: { fontSize: 12, color: Colors.text3, fontStyle: 'italic', marginTop: 6 },
  xpPopup: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: Colors.xp,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  xpPopupText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  sectionTitleSmall: { fontSize: 13, fontWeight: '800', color: Colors.text3, letterSpacing: 1 },
  simpleItem: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8 },
  ghostBtnSm: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: Colors.border },
  ghostBtnTextSmall: { fontSize: 11, color: Colors.text2, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusDotGlow: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  statusText: { color: '#10b981', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  simpleModeContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  simpleModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    gap: 10,
  },
  simpleModeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});

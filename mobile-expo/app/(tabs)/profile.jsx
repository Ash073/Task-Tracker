import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore, useUIStore } from '../../src/store';
import api from '../../src/services/api';
import { Colors } from '../../src/config/theme';
import { getTranslation } from '../../src/services/i18n';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const LEVEL_NAMES = ['', 'Beginner', 'Focused', 'Dedicated', 'Achiever', 'Champion', 'Elite', 'Master', 'Legend', 'Immortal', 'God Mode'];
const LEVEL_XP = [0, 0, 50, 200, 500, 1000, 2000, 3500, 5000, 7500, 10000];

export default function ProfileScreen() {
  const { user, updateUser, updateSettings, logout } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newGoal, setNewGoal] = useState(user?.goal || '');
  const [saving, setSaving] = useState(false);

  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

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

  const loadStats = async () => {
    try {
      const res = await api.get('/profile');
      setStats(res.data);
    } catch {}
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post('/profile/analyze');
      setInsights(res.data.insights || 'Analysis complete.');
      updateUser({ detectedGoal: res.data.detectedGoal, weakAreas: res.data.weakAreas });
    } catch {}
    finally {
      setAnalyzing(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/profile', { name: newName, goal: newGoal });
      updateUser(res.data);
      setEditMode(false);
    } catch {}
    finally {
      setSaving(false);
    }
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      const permission = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission required', 'We need access to your photos to update your profile.');
        return;
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({ 
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.5, 
            base64: true 
          })
        : await ImagePicker.launchImageLibraryAsync({ 
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.5, 
            base64: true 
          });

      if (!pickerResult.canceled) {
        const base64 = `data:image/jpeg;base64,${pickerResult.assets[0].base64}`;
        setSaving(true);
        const res = await api.put('/profile', { avatarUrl: base64 });
        updateUser(res.data);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose a method',
      [
        { text: 'Camera', onPress: () => handlePickImage(true) },
        { text: 'Gallery', onPress: () => handlePickImage(false) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextXP = LEVEL_XP[Math.min(level + 1, 10)] || 10000;
  const progress = Math.min(((xp - LEVEL_XP[level]) / (nextXP - LEVEL_XP[level])) * 100, 100);

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Text style={st.pageTitle}>Profile</Text>

      {/* Profile Card */}
      <View style={st.card}>
        <View style={st.profileRow}>
            <View style={{ flex: 1 }}>
              <Pressable style={st.avatar} onPress={handleAvatarPress}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={st.avatarImage} />
                ) : (
                  <Text style={st.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                )}
                <View style={st.avatarEditBadge}>
                  <Feather name="camera" size={10} color={Colors.white} />
                </View>
              </Pressable>
              {editMode ? (
                <View style={{ gap: 8 }}>
                  <TextInput 
                    style={[st.input, { fontSize: 18, color: Colors.text }]} 
                    value={newName} 
                    onChangeText={setNewName}
                    placeholder="Username"
                    placeholderTextColor={Colors.text3}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={st.primaryBtnSm} onPress={handleSaveProfile} disabled={saving}>
                      <Text style={st.primaryBtnSmText}>{saving ? '...' : 'Save'}</Text>
                    </Pressable>
                    <Pressable style={st.ghostBtnSm} onPress={() => setEditMode(false)}>
                      <Text style={st.ghostBtnSmText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setEditMode(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={st.userName}>{user?.name} </Text>
                  <Feather name="edit-2" size={14} color={Colors.text3} />
                </Pressable>
              )}
            </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.xpBig}>{xp}</Text>
            <Text style={st.xpLabel}>Total XP</Text>
          </View>
        </View>

        {/* Level Progress */}
        <View style={{ marginVertical: 20 }}>
          <View style={st.levelRow}>
            <Text style={st.levelName}>Level {level} — {LEVEL_NAMES[level] || 'Master'}</Text>
            <Text style={st.levelXp}>{xp} / {nextXP} XP</Text>
          </View>
          <View style={st.xpBarWrap}>
            <View style={[st.xpBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={st.statsRow}>
          <View style={st.statBox}>
            <Text style={[st.statValue, { color: Colors.low }]}>{stats?.completedTasksCount || 0}</Text>
            <Text style={st.statLabel}>Tasks Done</Text>
          </View>
          <View style={st.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="fire" size={20} color={Colors.high} style={{ marginRight: 4 }} />
              <Text style={[st.statValue, { color: Colors.high }]}>{user?.streak || 0}</Text>
            </View>
            <Text style={st.statLabel}>Day Streak</Text>
          </View>
          <View style={st.statBox}>
            <Text style={[st.statValue, { color: Colors.accent, textTransform: 'capitalize' }]}>{user?.mode}</Text>
            <Text style={st.statLabel}>Mode</Text>
          </View>
        </View>
      </View>

      {/* Goal Section */}
      <View style={st.card}>
        <View style={st.goalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="target" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
            <Text style={[st.cardTitle, { marginBottom: 0 }]}>Goal Analysis</Text>
          </View>
          <Pressable style={st.primaryBtnSm} onPress={handleAnalyze} disabled={analyzing}>
            {analyzing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="refresh-cw" size={12} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={st.primaryBtnSmText}>Analyze</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={st.goalLabel}>Your Goal</Text>
          {editMode ? (
            <TextInput 
              style={[st.input, { marginTop: 4 }]} 
              value={newGoal} 
              onChangeText={setNewGoal}
              placeholder="What is your main goal?"
              placeholderTextColor={Colors.text3}
            />
          ) : (
            <Text style={st.goalValue}>{user?.goal || 'Not set'}</Text>
          )}
        </View>

        {user?.detectedGoal && (
          <View style={{ marginBottom: 12 }}>
            <Text style={st.goalLabel}>AI Detected Goal</Text>
            <Text style={[st.goalValue, { color: Colors.accent, textTransform: 'capitalize' }]}>
              {user.detectedGoal}
            </Text>
          </View>
        )}

        {user?.weakAreas?.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={st.goalLabel}>⚠ Weak Areas</Text>
            <View style={st.weakRow}>
              {user.weakAreas.map((area) => (
                <View key={area} style={st.weakBadge}>
                  <Text style={st.weakBadgeText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {insights ? (
          <View style={st.insightBox}>
            <Text style={st.insightText}>{insights}</Text>
          </View>
        ) : null}
      </View>

      {/* Language Section */}
      <View style={st.card}>
        <Text style={[st.cardTitle, { marginBottom: 16 }]}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { id: 'en', label: 'English' },
            { id: 'hi', label: 'हिंदी' },
            { id: 'te', label: 'తెలుగు' }
          ].map(l => (
            <Pressable 
              key={l.id}
              onPress={() => updateSettings({ language: l.id })}
              style={[st.langBtn, lang === l.id && st.langBtnActive]}
            >
              <Text style={[st.langBtnText, lang === l.id && st.langBtnTextActive]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={st.logoutBtn} onPress={logout}>
        <Text style={st.logoutBtnText}>{t('logout').toUpperCase()}</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingTop: 110 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, paddingHorizontal: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.white },
  userName: { fontSize: 20, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 14, color: Colors.text2 },
  xpBig: { fontSize: 28, fontWeight: '800', color: Colors.xp, fontFamily: 'monospace' },
  xpLabel: { color: Colors.text2, fontSize: 13 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelName: { fontWeight: '700', color: Colors.text },
  levelXp: { color: Colors.text2, fontSize: 12, fontFamily: 'monospace' },
  xpBarWrap: { height: 10, backgroundColor: Colors.bg3, borderRadius: 5, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: Colors.xp, borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.bg3,
    borderRadius: 8,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.text2, marginTop: 4 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontWeight: '700', fontSize: 16, color: Colors.text },
  primaryBtnSm: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  primaryBtnSmText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  goalLabel: { fontSize: 12, color: Colors.text2, marginBottom: 4 },
  goalValue: { fontWeight: '600', color: Colors.text, fontSize: 15 },
  weakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  weakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  weakBadgeText: { color: Colors.high, fontSize: 12 },
  insightBox: { padding: 12, backgroundColor: Colors.bg3, borderRadius: 8 },
  insightText: { fontSize: 13, color: Colors.text2 },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    padding: 10,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostBtnSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostBtnSmText: { color: Colors.text2, fontSize: 12, fontWeight: '600' },
  langBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border },
  langBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  langBtnText: { color: Colors.text3, fontWeight: '700' },
  langBtnTextActive: { color: Colors.white },
  logoutBtn: { marginVertical: 20, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,0,0,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,0,0,0.1)' },
  logoutBtnText: { color: '#ff4444', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.white,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border
  }
});

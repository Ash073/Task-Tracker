import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore, useUIStore } from '../../src/store';
import { notificationService } from '../../src/services/notifications';
import api from '../../src/services/api';
import { Colors } from '../../src/config/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, updateSettings, logout } = useAuthStore();
  const [settings, setSettings] = useState(user?.settings || {});
  const [aiStatus, setAiStatus] = useState(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiModePickerVisible, setAiModePickerVisible] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      Alert.alert('Saved', 'Settings saved successfully!');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const checkAIStatus = async () => {
    try {
      const res = await api.get('/ai/status');
      setAiStatus(res.data);
      Alert.alert('AI Status', `Provider: ${res.data.provider}\nMode: ${res.data.mode}`);
    } catch {
      Alert.alert('Error', 'Failed to check AI status');
    }
  };

  const testQuote = async () => {
    try {
      const res = await api.post('/ai/quote', {
        taskName: 'Test task',
        priority: 'High',
        goal: user?.detectedGoal || user?.goal,
      });
      Alert.alert('Test Quote', `"${res.data.quote}"`);
    } catch {
      Alert.alert('Error', 'Quote generation failed');
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await notificationService.requestPermission();
    Alert.alert(
      granted ? 'Granted' : 'Denied',
      granted ? 'Notifications are enabled!' : 'Please enable notifications in device settings'
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await notificationService.cancelAll();
          await logout();
        },
      },
    ]);
  };

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const AI_MODES = [
    { value: 'auto', label: 'Auto (Gemini → OpenAI → Local)' },
    { value: 'gemini', label: 'Gemini Only' },
    { value: 'openai', label: 'OpenAI Only' },
    { value: 'local', label: 'Local Only (No API)' },
  ];

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Text style={st.pageTitle}>Settings</Text>
      <Text style={st.pageSub}>Configure AI, notifications, and preferences</Text>

      {/* AI Settings */}
      <View style={st.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <MaterialCommunityIcons name="robot" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
          <Text style={[st.cardTitle, { marginBottom: 0 }]}>AI Configuration</Text>
        </View>

        <Text style={st.label}>AI Mode</Text>
        <Pressable style={st.input} onPress={() => setAiModePickerVisible(true)}>
          <Text style={{ color: Colors.text }}>
            {AI_MODES.find((m) => m.value === (settings.aiMode || 'auto'))?.label || 'Auto'}
          </Text>
        </Pressable>
        <Text style={st.hint}>Auto mode uses cheapest available model. Gemini Flash → GPT-4o-mini → local fallback.</Text>

        <Text style={st.label}>Your Gemini API Key (optional)</Text>
        <View style={st.keyRow}>
          <TextInput
            style={[st.input, { flex: 1 }]}
            secureTextEntry={!showGeminiKey}
            value={settings.userGeminiKey || ''}
            onChangeText={(v) => set('userGeminiKey', v)}
            placeholder="AIza..."
            placeholderTextColor={Colors.text3}
            autoCapitalize="none"
          />
          <Pressable style={st.eyeBtn} onPress={() => setShowGeminiKey(!showGeminiKey)}>
            <Feather name={showGeminiKey ? 'eye-off' : 'eye'} size={20} color={Colors.text2} />
          </Pressable>
        </View>
        <Text style={st.hint}>Used if developer key is exhausted. Get free key at ai.google.dev</Text>

        <Text style={st.label}>Your OpenAI API Key (optional)</Text>
        <View style={st.keyRow}>
          <TextInput
            style={[st.input, { flex: 1 }]}
            secureTextEntry={!showOpenAIKey}
            value={settings.userOpenAIKey || ''}
            onChangeText={(v) => set('userOpenAIKey', v)}
            placeholder="sk-..."
            placeholderTextColor={Colors.text3}
            autoCapitalize="none"
          />
          <Pressable style={st.eyeBtn} onPress={() => setShowOpenAIKey(!showOpenAIKey)}>
            <Feather name={showOpenAIKey ? 'eye-off' : 'eye'} size={20} color={Colors.text2} />
          </Pressable>
        </View>

        <View style={st.btnRow}>
          <Pressable style={st.ghostBtn} onPress={checkAIStatus}>
            <Text style={st.ghostBtnText}>Check Status</Text>
          </Pressable>
          <Pressable style={st.ghostBtn} onPress={testQuote}>
            <Text style={st.ghostBtnText}>Test Quote</Text>
          </Pressable>
          {aiStatus && (
            <Text style={{ fontSize: 12, color: Colors.low, alignSelf: 'center' }}>
              ✓ {aiStatus.provider}
            </Text>
          )}
        </View>
      </View>

      {/* Notification Settings */}
      <View style={st.card}>
        <Text style={st.cardTitle}>🔔 Notifications</Text>

        <View style={st.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.settingTitle}>15-Minute Repeating Reminders</Text>
            <Text style={st.settingDesc}>Remind every 15 min until task is completed</Text>
          </View>
          <Switch
            value={settings.reminder15min || false}
            onValueChange={(v) => set('reminder15min', v)}
            trackColor={{ false: Colors.bg3, true: Colors.accent }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={st.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.settingTitle}>Push Notifications</Text>
            <Text style={st.settingDesc}>Mobile push for tasks and reminders</Text>
          </View>
          <Switch
            value={settings.pushNotifications !== false}
            onValueChange={(v) => set('pushNotifications', v)}
            trackColor={{ false: Colors.bg3, true: Colors.accent }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Account Settings */}
      <View style={st.card}>
        <Text style={st.cardTitle}>👤 Account</Text>
        <Pressable style={st.ghostBtn} onPress={handleRequestNotifications}>
          <Text style={st.ghostBtnText}>Request Notification Permission</Text>
        </Pressable>
      </View>

      {/* Save */}
      <Pressable style={st.saveBtnWrap} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={st.saveBtnText}>Save Settings</Text>
        )}
      </Pressable>

      {/* Logout */}
      <Pressable style={st.logoutBtn} onPress={handleLogout}>
        <Text style={st.logoutBtnText}>Sign Out</Text>
      </Pressable>

      <View style={{ height: 40 }} />

      {/* AI Mode Picker */}
      {aiModePickerVisible && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setAiModePickerVisible(false)}
        >
          <View style={st.pickerOverlay}>
            <View style={st.pickerBox}>
              {AI_MODES.map((mode) => (
                <Pressable
                  key={mode.value}
                  style={[
                    st.pickerItem,
                    settings.aiMode === mode.value && { backgroundColor: Colors.accentDim },
                  ]}
                  onPress={() => {
                    set('aiMode', mode.value);
                    setAiModePickerVisible(false);
                  }}
                >
                  <Text style={{ color: Colors.text, fontSize: 14 }}>{mode.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingTop: 110 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, paddingHorizontal: 4 },
  pageSub: { color: Colors.text2, fontSize: 14, marginTop: 4, marginBottom: 24, paddingHorizontal: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontWeight: '700', fontSize: 16, color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginBottom: 6, marginTop: 16 },
  hint: { fontSize: 11, color: Colors.text3, marginTop: 6 },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
  },
  keyRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eyeBtn: { padding: 10 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostBtnText: { color: Colors.text2, fontSize: 13, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingTitle: { fontWeight: '600', fontSize: 14, color: Colors.text },
  settingDesc: { fontSize: 12, color: Colors.text2, marginTop: 2 },
  saveBtnWrap: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 16 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 8,
    width: 280,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 20 },
});

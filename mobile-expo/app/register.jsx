import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store';
import { Colors } from '../src/config/theme';
import { Feather } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [form, setForm] = useState({ name: '', email: '', password: '', goal: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.goal);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={Colors.text2} />
        </Pressable>

        <View style={s.header}>
          <Text style={s.logo}>
            <Text style={{ color: Colors.accent }}>Task</Text>Tracker
          </Text>
          <Text style={s.tagline}>Initialize new tracking profile...</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Identity Creation</Text>

          <View style={s.inputContainer}>
            <Text style={s.label}>Full Designation</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. John Operator"
              placeholderTextColor={Colors.text3}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </View>

          <View style={s.inputContainer}>
            <Text style={s.label}>Communication Link (Email)</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            />
          </View>

          <View style={s.inputContainer}>
            <Text style={s.label}>Security Phrase (Password)</Text>
            <TextInput
              style={s.input}
              placeholder="Min 6 characters"
              placeholderTextColor={Colors.text3}
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
            />
          </View>

          <View style={s.inputContainer}>
            <Text style={s.label}>Primary Objective (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Master React Native"
              placeholderTextColor={Colors.text3}
              value={form.goal}
              onChangeText={(v) => setForm((f) => ({ ...f, goal: v }))}
            />
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={s.btnText}>ACTIVATE PROFILE</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/login')} style={s.linkRow}>
          <Text style={s.linkText}>
            Existing entity? <Text style={{ color: Colors.accent, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1.5 },
  tagline: { color: Colors.text3, marginTop: 4, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: Colors.card, borderRadius: 24, padding: 32, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 32 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 18,
    color: Colors.text,
    fontSize: 16,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  linkRow: { alignItems: 'center', marginTop: 32 },
  linkText: { color: Colors.text2, fontSize: 14 },
});

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
        <View style={s.header}>
          <Text style={s.logo}>
            <Text style={{ color: Colors.accent }}>Task</Text>Tracker
          </Text>
          <Text style={s.tagline}>Start achieving your goals today</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Create Account</Text>

          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            placeholder="John Doe"
            placeholderTextColor={Colors.text3}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.text3}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="Min 6 characters"
            placeholderTextColor={Colors.text3}
            secureTextEntry
            value={form.password}
            onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          />

          <Text style={s.label}>Main Goal (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Get placement, Pass exam, Get fit..."
            placeholderTextColor={Colors.text3}
            value={form.goal}
            onChangeText={(v) => setForm((f) => ({ ...f, goal: v }))}
          />

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={s.btnText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/login')} style={s.linkRow}>
            <Text style={s.linkText}>
              Have account? <Text style={{ color: Colors.accent }}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -1 },
  tagline: { color: Colors.text2, marginTop: 8, fontSize: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 28, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  linkRow: { alignItems: 'center', marginTop: 16 },
  linkText: { color: Colors.text2, fontSize: 14 },
});

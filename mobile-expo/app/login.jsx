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

export default function LoginScreen() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.text2} />
        </Pressable>

        <View style={s.header}>
          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.tagline}>Enter your details to continue.</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="name@example.com"
              placeholderTextColor={Colors.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.text3}
              secureTextEntry
              value={form.password}
              onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
            />
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/register')} style={s.linkRow}>
          <Text style={s.linkText}>
            Don't have an account? <Text style={{ color: Colors.accent, fontWeight: '700' }}>Create One</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  header: { marginBottom: 48 },
  title: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  tagline: { color: '#94a3b8', marginTop: 8, fontSize: 16, fontWeight: '500' },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  input: {
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    color: '#ffffff',
    fontSize: 16,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  linkRow: { alignItems: 'center', marginTop: 40 },
  linkText: { color: '#94a3b8', fontSize: 15 },
});

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store';
import { Colors } from '../src/config/theme';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [hydrated, isAuthenticated]);

  if (isAuthenticated) return null;

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      
      {/* Elegant minimalist background */}
      <View style={s.background}>
        <View style={s.topGlow} />
      </View>

      <View style={s.content}>
        <View style={s.heroSection}>
          <Image 
            source={require('../assets/logo.png')} 
            style={s.logo} 
            resizeMode="contain" 
          />
          <Text style={s.title}>Focus. Plan. Achieve.</Text>
          <Text style={s.subtitle}>The simple way to master your daily tasks and achieve your goals.</Text>
        </View>

        <View style={s.actionSection}>
          <Pressable 
            style={s.mainBtn} 
            onPress={() => router.push('/login')}
          >
            <Text style={s.mainBtnText}>Sign In</Text>
            <Feather name="arrow-right" size={18} color={Colors.white} />
          </Pressable>

          <Pressable 
            style={s.linkBtn} 
            onPress={() => router.push('/register')}
          >
            <Text style={s.linkBtnText}>Create regular account</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Professional Task Management</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0b' 
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0b',
  },
  topGlow: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  content: { 
    flex: 1, 
    paddingHorizontal: 40, 
    justifyContent: 'space-between', 
    paddingTop: 120,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 40,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#ffffff', 
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5
  },
  subtitle: { 
    color: '#94a3b8', 
    fontSize: 16, 
    textAlign: 'center', 
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 10
  },
  actionSection: {
    gap: 16,
    width: '100%',
  },
  mainBtn: {
    backgroundColor: Colors.accent,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mainBtnText: { 
    color: '#ffffff', 
    fontWeight: '700', 
    fontSize: 18,
  },
  linkBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnText: { 
    color: '#94a3b8', 
    fontWeight: '600', 
    fontSize: 15,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: { 
    color: '#475569', 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 2, 
    textTransform: 'uppercase' 
  },
});

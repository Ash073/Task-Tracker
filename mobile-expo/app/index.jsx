import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store';
import { Colors } from '../src/config/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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
      {/* Dynamic Background Pattern */}
      <View style={s.bgCapture}>
         <View style={[s.glow, { top: -100, right: -100, backgroundColor: 'rgba(59, 130, 246, 0.4)' }]} />
         <View style={[s.glow, { bottom: -150, left: -100, backgroundColor: 'rgba(139, 92, 246, 0.3)' }]} />
      </View>

      <View style={s.content}>
        <View style={s.header}>
          <View style={s.logoIcon}>
            <MaterialCommunityIcons name="lightning-bolt" size={40} color={Colors.white} />
          </View>
          <Text style={s.title}>
            <Text style={{ color: Colors.accent }}>Task</Text>Tracker
          </Text>
          <Text style={s.subtitle}>Precision. Progress. Productivity.</Text>
        </View>

        <View style={s.onboardingCard}>
           <Text style={s.cardHeading}>Elevate Your Workflow</Text>
           <Text style={s.cardSub}>The ultimate AI-powered environment for goal achievement and task optimization.</Text>
           
           <View style={s.featureGrid}>
              <View style={s.featureItem}>
                 <Feather name="zap" size={20} color={Colors.accent} />
                 <Text style={s.featureText}>AI Optimization</Text>
              </View>
              <View style={s.featureItem}>
                 <Feather name="shield" size={20} color={Colors.low} />
                 <Text style={s.featureText}>Secure Sync</Text>
              </View>
              <View style={s.featureItem}>
                 <Feather name="activity" size={20} color={Colors.high} />
                 <Text style={s.featureText}>Data Extraction</Text>
              </View>
           </View>
        </View>

        <View style={s.actions}>
          <Pressable 
            style={s.primaryBtn} 
            onPress={() => router.push('/login')}
          >
            <Text style={s.primaryBtnText}>SIGN IN TO ENGINE</Text>
            <Feather name="arrow-right" size={20} color={Colors.white} />
          </Pressable>

          <Pressable 
            style={s.secondaryBtn} 
            onPress={() => router.push('/register')}
          >
            <Text style={s.secondaryBtnText}>INITIALIZE NEW ACCOUNT</Text>
          </Pressable>
        </View>

        <Text style={s.footerText}>SECURE TERMINAL ACCESS V1.0.0</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgCapture: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.5 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between', paddingTop: 100 },
  header: { alignItems: 'center' },
  logoIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    backgroundColor: Colors.accent, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10
  },
  title: { fontSize: 42, fontWeight: '900', color: Colors.text, letterSpacing: -2 },
  subtitle: { color: Colors.text2, fontSize: 16, fontWeight: '600', marginTop: 8, opacity: 0.7 },
  onboardingCard: {
    backgroundColor: Colors.card,
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20
  },
  cardHeading: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  cardSub: { color: Colors.text2, fontSize: 15, lineHeight: 22, opacity: 0.8 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: Colors.bg2, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  featureText: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  actions: { gap: 16 },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  primaryBtnText: { color: Colors.white, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  secondaryBtn: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  secondaryBtnText: { color: Colors.text2, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  footerText: { color: Colors.text3, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 2, opacity: 0.5 },
});

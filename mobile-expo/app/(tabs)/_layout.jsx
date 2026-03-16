import { View, Text, Pressable, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore, useUIStore } from '../../src/store';
import { Colors } from '../../src/config/theme';
import { getTranslation } from '../../src/services/i18n';
import { ShoppingIcon, DashboardIcon, ProfileIcon, SettingsIcon } from '../../src/components/CustomIcons';

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const [isMinimized, setIsMinimized] = useState(true);
  const sidebarWidth = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  
  const showTopBar = useUIStore((s) => s.showTopBar);
  const topBarAnim = useRef(new Animated.Value(0)).current;

  const switchMode = useAuthStore(s => s.switchMode);
  const updateSettings = useAuthStore(s => s.updateSettings);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    Animated.spring(topBarAnim, {
      toValue: showTopBar ? 0 : -120,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [showTopBar]);

  if (hydrated && !isAuthenticated) return null;

  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const toggleSidebar = () => {
    const toValue = isMinimized ? width * 0.85 : 0;
    setIsMinimized(!isMinimized);
    
    Animated.parallel([
      Animated.timing(sidebarWidth, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: isMinimized ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start();
  };

  const navItems = [
    { name: 'index', title: t('dashboard'), icon: 'grid', lib: DashboardIcon },
    { name: 'tasks', title: t('objectives'), icon: 'list', lib: Feather, mode: 'ultimate' },
    { name: 'simple', title: t('reminders'), icon: 'clock', lib: Feather, mode: 'simple' },
    { name: 'shopping', title: t('shopping'), icon: 'shopping-outline', lib: ShoppingIcon, mode: 'simple' },
    { name: 'profile', title: t('profile'), icon: 'user', lib: ProfileIcon },
  ];



   return (
    <View style={s.container}>
      <Animated.View 
        style={[s.mainContent, { opacity: contentOpacity }]}
        pointerEvents={isMinimized ? 'auto' : 'none'}
      >
        <Slot />
      </Animated.View>

      {/* Integrated Top Bar */}
      <Animated.View style={[
        s.topBar, 
        !isMinimized && { opacity: 0 },
        { transform: [{ translateY: topBarAnim }] }
      ]}>
        <Pressable 
          onPress={toggleSidebar} 
          style={s.menuBubble}
          pointerEvents={isMinimized ? 'auto' : 'none'}
        >
          <Feather name="menu" size={24} color={Colors.accent} />
        </Pressable>
      </Animated.View>

      <Animated.View style={[s.sidebar, { width: sidebarWidth, borderRightWidth: isMinimized ? 0 : 1 }]}>
        <View style={s.sidebarHeader}>
          <Pressable onPress={toggleSidebar} style={s.menuBtn}>
            <Feather name="chevron-left" size={24} color={Colors.accent} />
          </Pressable>
        </View>

        <View style={s.navGroup}>
          {navItems.map((item) => {
            if (item.mode && user?.mode && item.mode !== user.mode && item.name !== 'index') return null;
            
            const isActive = pathname.includes(item.name) || (item.name === 'index' && pathname === '/');
            const IconLib = item.lib;

            return (
              <Pressable
                key={item.name}
                onPress={() => {
                  router.push(item.name === 'index' ? '/(tabs)' : `/(tabs)/${item.name}`);
                  if (!isMinimized) toggleSidebar();
                }}
                style={[s.navItem, isActive && s.navItemActive]}
              >
                <IconLib name={item.icon} size={22} color={isActive ? Colors.accent : Colors.text3} />
                {!isMinimized && (
                  <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>
                    {item.title}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={s.sidebarFooter}>
          {!isMinimized && (
            <>
              <View style={s.modeSection}>
                <Text style={s.modeTitle}>{t('language')}</Text>
                <View style={s.modeRow}>
                  {['en', 'hi', 'te'].map((l) => (
                    <Pressable 
                      key={l}
                      style={[s.modeBtn, lang === l && s.modeBtnActive]} 
                      onPress={() => updateSettings({ language: l })}
                    >
                      <Text style={[s.modeBtnText, lang === l && s.modeBtnTextActive]}>{t(l)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.modeSection}>
                <Text style={s.modeTitle}>{t('view_mode')}</Text>
                <View style={s.modeRow}>
                  <Pressable 
                    style={[s.modeBtn, user?.mode === 'simple' && s.modeBtnActive]} 
                    onPress={() => switchMode('simple')}
                  >
                    <MaterialCommunityIcons name="leaf" size={18} color={user?.mode === 'simple' ? Colors.white : Colors.text3} />
                    <Text style={[s.modeBtnText, user?.mode === 'simple' && s.modeBtnTextActive]}>{t('simple')}</Text>
                  </Pressable>
                  <Pressable 
                    style={[s.modeBtn, user?.mode === 'ultimate' && s.modeBtnActive]} 
                    onPress={() => switchMode('ultimate')}
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color={user?.mode === 'ultimate' ? Colors.white : Colors.text3} />
                    <Text style={[s.modeBtnText, user?.mode === 'ultimate' && s.modeBtnTextActive]}>{t('ultimate')}</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
          
          <Pressable
            onPress={() => {
              router.push('/(tabs)/settings');
              if (!isMinimized) toggleSidebar();
            }}
            style={[s.navItem, pathname.includes('settings') && s.navItemActive]}
          >
          <SettingsIcon size={22} color={pathname.includes('settings') ? Colors.accent : Colors.text3} />
            {!isMinimized && (
              <Text style={[s.navLabel, pathname.includes('settings') && s.navLabelActive]}>
                {t('settings')}
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.bg,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingTop: 45,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  menuBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bg,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10001,
  },
  sidebar: {
    backgroundColor: Colors.bg,
    borderRightColor: Colors.accent,
    borderRightWidth: 3,
    paddingTop: 45,
    zIndex: 10000,
    position: 'absolute',
    height: '100%',
    left: 0,
    top: 0,
    overflow: 'hidden', 
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGroup: {
    paddingHorizontal: 12,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 52,
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  navLabel: {
    marginLeft: 16,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  navLabelActive: {
    color: Colors.accent,
  },
  mainContent: {
    flex: 1,
  },
  sidebarFooter: {
    marginTop: 'auto',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.3)',
    gap: 10,
    marginBottom: 20,
  },
  modeSection: {
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  modeTitle: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg3,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
  },
  modeBtnText: {
    color: Colors.text3,
    fontSize: 12,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: Colors.white,
  },
});

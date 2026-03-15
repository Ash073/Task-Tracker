import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, LogBox, Linking } from 'react-native';
import { useAuthStore } from '../src/store';
import { notificationService } from '../src/services/notifications';
import { Colors } from '../src/config/theme';

// Ignore unavoidable Expo Go and New Architecture warnings
LogBox.ignoreLogs([
  'expo-notifications',
  'setLayoutAnimationEnabledExperimental',
  'New Architecture',
]);

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const registerPushToken = useAuthStore((s) => s.registerPushToken);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (hydrated && user) {
      const setupPush = async () => {
        const hasPermission = await notificationService.requestPermission();
        if (hasPermission) {
          const token = await notificationService.getPushTokenAsync();
          if (token) registerPushToken(token);
        }
      };
      setupPush();
    }

    const responseSub = notificationService.onNotificationResponse((response) => {
      const data = response.notification.request.content.data;
      if (data?.link) {
        Linking.openURL(data.link);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, [hydrated, user]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

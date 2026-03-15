import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/login" />;
}

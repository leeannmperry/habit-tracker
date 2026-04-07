import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { migrateFromAsyncStorage } from './src/lib/migrate';
import TopTabBar, { TabName } from './src/components/TopTabBar';
import HomeScreen from './src/screens/HomeScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import TodoScreen from './src/screens/TodoScreen';
import AuthScreen from './src/screens/AuthScreen';
import { Colors } from './src/theme';

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<TabName>('HOME');
  const [migrated, setMigrated] = useState(false);

  const userId = session?.user?.id;

  // Run one-time migration when user first logs in
  useEffect(() => {
    if (!userId) { setMigrated(false); return; }
    setMigrated(false);
    migrateFromAsyncStorage(userId).finally(() => setMigrated(true));
  }, [userId]);

  if (loading || (userId && !migrated)) {
    return <View style={styles.loading} />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <TopTabBar active={tab} onSelect={setTab} />
      <View style={styles.screen}>
        {tab === 'HOME' && <HomeScreen userId={userId!} />}
        {tab === 'HABITS' && <HabitsScreen userId={userId!} />}
        {tab === 'WORK' && <TodoScreen domain="work" userId={userId!} />}
        {tab === 'LIFE' && <TodoScreen domain="life" userId={userId!} />}
        {tab === 'CREATIVE' && <TodoScreen domain="creative" userId={userId!} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.bg },
  root: { flex: 1, backgroundColor: Colors.bg },
  screen: { flex: 1 },
});

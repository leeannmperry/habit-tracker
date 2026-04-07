import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import TopTabBar, { TabName } from './src/components/TopTabBar';
import HomeScreen from './src/screens/HomeScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import TodoScreen from './src/screens/TodoScreen';
import { Colors } from './src/theme';

export default function App() {
  const [tab, setTab] = useState<TabName>('HOME');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <TopTabBar active={tab} onSelect={setTab} />
      <View style={styles.screen}>
        {tab === 'HOME' && <HomeScreen />}
        {tab === 'HABITS' && <HabitsScreen />}
        {tab === 'WORK' && <TodoScreen domain="work" />}
        {tab === 'LIFE' && <TodoScreen domain="life" />}
        {tab === 'CREATIVE' && <TodoScreen domain="creative" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  screen: {
    flex: 1,
  },
});

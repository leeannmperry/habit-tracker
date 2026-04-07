import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography } from '../theme';
import { getCurrentRune } from '../utils/rune';

export type TabName = 'HOME' | 'HABITS' | 'WORK' | 'LIFE' | 'CREATIVE';

interface Props {
  active: TabName;
  onSelect: (tab: TabName) => void;
}

const TABS: TabName[] = ['HOME', 'HABITS', 'WORK', 'LIFE', 'CREATIVE'];

const OWNER = process.env.EXPO_PUBLIC_OWNER_NAME ?? '';

export default function TopTabBar({ active, onSelect }: Props) {
  const rune = getCurrentRune();

  return (
    <View style={styles.bar}>
      <View style={styles.runeWrap}>
        <Text style={styles.rune}>{rune}</Text>
        {!!OWNER && <Text style={styles.owner}>{OWNER}</Text>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} onPress={() => onSelect(tab)} style={styles.tab}>
            <Text style={[styles.label, active === tab && styles.labelActive]}>
              {tab}
            </Text>
            {active === tab && <View style={styles.indicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg2,
    paddingLeft: 12,
    paddingTop: 48,
  },
  runeWrap: {
    flexShrink: 0,
    alignItems: 'center',
    marginRight: 10,
    paddingBottom: 4,
  },
  rune: {
    fontFamily: 'Georgia',
    fontSize: 48,
    color: Colors.ink3,
    lineHeight: 52,
  },
  owner: {
    fontFamily: 'Georgia',
    fontSize: 9,
    color: Colors.ink4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    marginRight: 18,
    paddingBottom: 10,
    position: 'relative',
  },
  label: {
    ...Typography.navLabel,
    color: Colors.ink3,
  },
  labelActive: {
    color: Colors.ink,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.ink,
  },
});

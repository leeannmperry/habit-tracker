import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveHabits } from '../store/habits';
import { saveTasks } from '../store/tasks';
import { saveHome } from '../store/home';
import { supabase } from './supabase';

/**
 * One-time migration: if the user has local AsyncStorage data and no Supabase
 * data yet, copy everything over. Safe to call on every login — it's a no-op
 * once the DB has data.
 */
export async function migrateFromAsyncStorage(userId: string): Promise<void> {
  // Check if this user already has habits in Supabase
  const { data } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  if (data && data.length > 0) return; // already migrated

  const ops: Promise<void>[] = [];

  const rawHabits = await AsyncStorage.getItem('ritual:habits');
  if (rawHabits) {
    try {
      const habits = JSON.parse(rawHabits);
      if (habits.length > 0) ops.push(saveHabits(userId, habits));
    } catch {}
  }

  const rawTasks = await AsyncStorage.getItem('ritual:tasks');
  if (rawTasks) {
    try {
      const tasks = JSON.parse(rawTasks);
      if (tasks.length > 0) ops.push(saveTasks(userId, tasks));
    } catch {}
  }

  const rawHome = await AsyncStorage.getItem('ritual:home');
  if (rawHome) {
    try {
      const home = JSON.parse(rawHome);
      ops.push(saveHome(userId, home));
    } catch {}
  }

  await Promise.all(ops);
}

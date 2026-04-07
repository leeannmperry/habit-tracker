import AsyncStorage from '@react-native-async-storage/async-storage';

export type CompletionValue = true | { sym: string };

export interface Habit {
  id: string;
  name: string;
  color: string;
  goalType: 'weekly' | 'monthly' | '';
  goal: number | null;
  completions: Record<string, CompletionValue>;
  types: string[]; // subtypes — full string, only first char displayed
}

const KEY = 'ritual:habits';

export async function loadHabits(): Promise<Habit[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(habits));
}

export function createHabit(fields: Omit<Habit, 'id' | 'completions'>): Habit {
  return {
    id: Date.now().toString(),
    completions: {},
    ...fields,
  };
}

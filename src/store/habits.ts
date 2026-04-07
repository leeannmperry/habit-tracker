import { supabase } from '../lib/supabase';

export type CompletionValue = true | { sym: string };

export interface Habit {
  id: string;
  name: string;
  color: string;
  goalType: 'weekly' | 'monthly' | '';
  goal: number | null;
  completions: Record<string, CompletionValue>;
  types: string[];
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    goalType: row.goal_type,
    goal: row.goal,
    completions: row.completions ?? {},
    types: row.types ?? [],
  };
}

function habitToRow(habit: Habit, userId: string, index: number) {
  return {
    id: habit.id,
    user_id: userId,
    name: habit.name,
    color: habit.color,
    goal_type: habit.goalType,
    goal: habit.goal,
    completions: habit.completions,
    types: habit.types,
    sort_order: index,
  };
}

// ─── ID cache (for diffing deletes) ──────────────────────────────────────────

const knownIds = new Map<string, Set<string>>();

// ─── Realtime skip flag (suppress echo from this device's own writes) ─────────

let _skipNext = false;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadHabits(userId: string): Promise<Habit[]> {
  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');
  const habits = (data ?? []).map(rowToHabit);
  knownIds.set(userId, new Set(habits.map(h => h.id)));
  return habits;
}

export async function saveHabits(userId: string, habits: Habit[]): Promise<void> {
  _skipNext = true;
  const known = knownIds.get(userId) ?? new Set<string>();
  const current = new Set(habits.map(h => h.id));
  const toDelete = [...known].filter(id => !current.has(id));

  if (habits.length > 0) {
    await supabase.from('habits').upsert(habits.map((h, i) => habitToRow(h, userId, i)));
  }
  if (toDelete.length > 0) {
    await supabase.from('habits').delete().in('id', toDelete).eq('user_id', userId);
  }
  knownIds.set(userId, current);
}

export function subscribeHabits(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`habits:${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
      () => {
        if (_skipNext) { _skipNext = false; return; }
        onChange();
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function createHabit(fields: Omit<Habit, 'id' | 'completions'>): Habit {
  return {
    id: Date.now().toString(),
    completions: {},
    ...fields,
  };
}

import { supabase } from '../lib/supabase';

export type Domain = 'work' | 'life' | 'creative';

export interface Task {
  id: number;
  name: string;
  domain: Domain;
  project: string;
  parent: number | null;
  start: string | null;   // YYYY-MM-DD
  due: string | null;     // YYYY-MM-DD
  reward: string;
  notes: string;
  done: boolean;
  doneAt: number | null;  // epoch ms
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

function rowToTask(row: any): Task {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    project: row.project,
    parent: row.parent,
    start: row.start_date,
    due: row.due_date,
    reward: row.reward,
    notes: row.notes,
    done: row.done,
    doneAt: row.done_at,
  };
}

function taskToRow(task: Task, userId: string, index: number) {
  return {
    id: task.id,
    user_id: userId,
    name: task.name,
    domain: task.domain,
    project: task.project,
    parent: task.parent,
    start_date: task.start,
    due_date: task.due,
    reward: task.reward,
    notes: task.notes,
    done: task.done,
    done_at: task.doneAt,
    sort_order: index,
  };
}

// ─── ID cache ─────────────────────────────────────────────────────────────────

const knownIds = new Map<string, Set<number>>();
let _skipNext = false;
let _nextId = Date.now();

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadTasks(userId: string): Promise<Task[]> {
  const midnight = getMidnight();
  // Prune completed tasks from DB before loading
  await supabase.from('tasks')
    .delete()
    .eq('user_id', userId)
    .eq('done', true)
    .lt('done_at', midnight);

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');
  const tasks = (data ?? []).map(rowToTask);
  knownIds.set(userId, new Set(tasks.map(t => t.id)));
  return tasks;
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
  _skipNext = true;
  const known = knownIds.get(userId) ?? new Set<number>();
  const current = new Set(tasks.map(t => t.id));
  const toDelete = [...known].filter(id => !current.has(id));

  if (tasks.length > 0) {
    await supabase.from('tasks').upsert(tasks.map((t, i) => taskToRow(t, userId, i)));
  }
  if (toDelete.length > 0) {
    await supabase.from('tasks').delete().in('id', toDelete).eq('user_id', userId);
  }
  knownIds.set(userId, current);
}

export function subscribeTasks(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`tasks:${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      () => {
        if (_skipNext) { _skipNext = false; return; }
        onChange();
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function createTask(fields: Omit<Task, 'id' | 'done' | 'doneAt'>): Task {
  return {
    id: _nextId++,
    done: false,
    doneAt: null,
    ...fields,
  };
}

export function getMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getNextMidnight(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

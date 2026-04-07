import AsyncStorage from '@react-native-async-storage/async-storage';

export type Domain = 'work' | 'life' | 'creative';

export interface Task {
  id: number;
  name: string;
  domain: Domain;
  project: string;
  parent: number | null; // null = top-level
  start: string | null;  // YYYY-MM-DD
  due: string | null;    // YYYY-MM-DD
  reward: string;
  notes: string;
  done: boolean;
  doneAt: number | null; // timestamp
}

const KEY = 'ritual:tasks';
let _nextId = Date.now();

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const tasks: Task[] = JSON.parse(raw);
  // Prune tasks completed before today's midnight
  const midnight = getMidnight();
  return tasks.filter(t => !(t.done && t.doneAt !== null && t.doneAt < midnight));
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(tasks));
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

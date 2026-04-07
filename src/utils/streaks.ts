import { Habit } from '../store/habits';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCurrentStreak(habit: Habit): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const key = toDateString(cursor);
    if (habit.completions[key]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getBestStreak(habit: Habit): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let best = 0;
  let current = 0;

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateString(d);
    if (habit.completions[key]) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function getWeeklyCount(habit: Habit): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = getMondayOfWeek(today);
  let count = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    if (d > today) break;
    const key = toDateString(d);
    if (habit.completions[key]) count++;
  }
  return count;
}

export function getMonthlyCount(habit: Habit, year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (habit.completions[key]) count++;
  }
  return count;
}

export function getDoneToday(habits: Habit[]): number {
  const key = toDateString(new Date());
  return habits.filter(h => h.completions[key]).length;
}

export function getDoneThisWeek(habits: Habit[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = getMondayOfWeek(today);
  let total = 0;

  for (const habit of habits) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      if (d > today) break;
      const key = toDateString(d);
      if (habit.completions[key]) total++;
    }
  }
  return total;
}

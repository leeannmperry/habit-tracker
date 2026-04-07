import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Colors, HabitSwatches, Typography } from '../theme';
import { Habit, CompletionValue, loadHabits, saveHabits, subscribeHabits, createHabit } from '../store/habits';
import { getCurrentStreak, getBestStreak } from '../utils/streaks';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CELL = 19;

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function todayKey(): string {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekStart(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function firstChar(s: string): string {
  return s ? [...s][0] ?? '' : '';
}

// ─── Subtype Picker Modal ─────────────────────────────────────────────────────

interface SubtypeModalProps {
  visible: boolean;
  habitName: string;
  types: string[];
  hasValue: boolean;
  onSelect: (sym: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function SubtypeModal({ visible, habitName, types, hasValue, onSelect, onClear, onClose }: SubtypeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, styles.typeModalCard]} onPress={() => {}}>
          <Text style={styles.modalTitle}>{habitName.toUpperCase()}</Text>
          {hasValue && (
            <TouchableOpacity onPress={onClear}>
              <Text style={styles.clearLink}>clear this day</Text>
            </TouchableOpacity>
          )}
          {types.map((sym, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onSelect(sym)}
              style={[styles.typePickRow, i < types.length - 1 && styles.typePickRowBorder]}
            >
              <Text style={styles.typePickSym}>{firstChar(sym)}</Text>
              <Text style={styles.typePickName}>{sym}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.mact}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Habit Modal (Add/Edit) ───────────────────────────────────────────────────

interface HabitModalProps {
  habit: Habit | null;
  visible: boolean;
  onSave: (data: Omit<Habit, 'id' | 'completions'>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function HabitModal({ habit, visible, onSave, onDelete, onClose }: HabitModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(HabitSwatches[0]);
  const [goalType, setGoalType] = useState<'weekly' | 'monthly' | ''>('');
  const [goal, setGoal] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [typeInput, setTypeInput] = useState('');

  useEffect(() => {
    if (visible) {
      setName(habit?.name ?? '');
      setColor(habit?.color ?? HabitSwatches[0]);
      setGoalType(habit?.goalType ?? '');
      setGoal(habit?.goal?.toString() ?? '');
      setTypes(habit?.types ?? []);
      setTypeInput('');
    }
  }, [habit, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color,
      goalType,
      goal: goal.trim() ? parseInt(goal, 10) : null,
      types,
    });
  };

  const addType = () => {
    const t = typeInput.trim();
    if (t && !types.includes(t)) setTypes(prev => [...prev, t]);
    setTypeInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{habit ? 'EDIT HABIT' : 'ADD HABIT'}</Text>

            {/* Scrollable fields */}
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>NAME</Text>
                <TextInput
                  style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  placeholderTextColor={Colors.ink4}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>COLOR</Text>
                <View style={styles.copts}>
                  {HabitSwatches.map(sw => (
                    <TouchableOpacity
                      key={sw}
                      onPress={() => setColor(sw)}
                      style={[styles.copt, { backgroundColor: sw }, color === sw && styles.coptOn]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.frow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>GOAL TYPE</Text>
                  <View style={[styles.finput, styles.finputSelect]}>
                    {(['', 'weekly', 'monthly'] as const).map(gt => (
                      <TouchableOpacity
                        key={gt}
                        onPress={() => setGoalType(gt)}
                        style={[styles.gtBtn, goalType === gt && styles.gtBtnOn]}
                      >
                        <Text style={[styles.gtBtnText, goalType === gt && styles.gtBtnTextOn]}>
                          {gt === '' ? '—' : gt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>GOAL #</Text>
                  <TextInput
                    style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    value={goal}
                    onChangeText={setGoal}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.ink4}
                    editable={goalType !== ''}
                  />
                </View>
              </View>

              <View style={styles.sep} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SUBTYPES</Text>
                {types.map((sym, i) => (
                  <View key={i} style={styles.typeRow}>
                    <Text style={styles.typeRowSym}>{firstChar(sym)}</Text>
                    <Text style={styles.typeRowLabel}>{sym}</Text>
                    <TouchableOpacity onPress={() => setTypes(prev => prev.filter((_, j) => j !== i))}>
                      <Text style={styles.typeRowRemove}>remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.typeAddRow}>
                  <TextInput
                    style={[styles.typeAddInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    value={typeInput}
                    onChangeText={setTypeInput}
                    onSubmitEditing={addType}
                    returnKeyType="done"
                    placeholderTextColor={Colors.ink4}
                  />
                  <TouchableOpacity onPress={addType} style={styles.btnSave}>
                    <Text style={styles.btnSaveText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Action buttons — always visible outside scroll */}
            <View style={styles.mact}>
              {habit && (
                <TouchableOpacity onPress={() => onDelete(habit.id)} style={styles.btnDelete}>
                  <Text style={styles.btnDeleteText}>DELETE</Text>
                </TouchableOpacity>
              )}
              <View style={styles.mactRight}>
                <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                  <Text style={styles.btnCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.btnSave}>
                  <Text style={styles.btnSaveText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Habit Row ────────────────────────────────────────────────────────────────

interface HabitRowProps {
  habit: Habit;
  year: number;
  month: number;
  days: number;
  isCurrentMonth: boolean;
  todayDate: number;
  cellWidth: number;
  onCellPress: (day: number) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function HabitRow({
  habit, year, month, days, isCurrentMonth, todayDate, cellWidth,
  onCellPress, onEdit, onMoveUp, onMoveDown, isFirst, isLast,
}: HabitRowProps) {
  const [reordering, setReordering] = useState(false);
  const { cur: streak, best } = React.useMemo(() => {
    const today = new Date();
    let cur = 0, b = 0, tmp = 0;
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (habit.completions[k]) { tmp++; b = Math.max(b, tmp); } else tmp = 0;
    }
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (habit.completions[k]) cur++; else break;
    }
    return { cur, best: b };
  }, [habit.completions]);

  // Progress
  const progress = React.useMemo(() => {
    if (!habit.goalType || !habit.goal) return null;
    if (habit.goalType === 'monthly') {
      let c = 0;
      for (let d = 1; d <= days; d++) if (habit.completions[dateKey(year, month, d)]) c++;
      return { c, g: habit.goal, lbl: `${c}/${habit.goal} mo` };
    }
    const ws = weekStart(); let c = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(ws.getDate() + i);
      if (habit.completions[dateKey(d.getFullYear(), d.getMonth(), d.getDate())]) c++;
    }
    return { c, g: habit.goal, lbl: `${c}/${habit.goal} wk` };
  }, [habit, year, month, days]);

  const pct = progress ? Math.min(1, progress.c / progress.g) : null;
  const meta = (progress ? progress.lbl + ' · ' : '') + `${streak} | ${best}`;

  return (
    <View style={styles.hr}>
      {/* Info column */}
      <View style={styles.hi}>
        <TouchableOpacity
          onPress={() => setReordering(r => !r)}
          style={styles.dragHandle}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {reordering ? (
            <View>
              <TouchableOpacity onPress={() => { onMoveUp(); setReordering(false); }} disabled={isFirst} style={styles.reorderBtn}>
                <Text style={[styles.reorderArrow, isFirst && styles.reorderDisabled]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onMoveDown(); setReordering(false); }} disabled={isLast} style={styles.reorderBtn}>
                <Text style={[styles.reorderArrow, isLast && styles.reorderDisabled]}>▼</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.dragGlyph}>⋮⋮</Text>
          )}
        </TouchableOpacity>

        <View style={styles.hiBody}>
          <View style={styles.hn}>
            <View style={[styles.hdot, { backgroundColor: habit.color }]} />
            <Text style={styles.hnText} numberOfLines={1}>{habit.name}</Text>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={styles.editBtn}>✎</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hmeta}>{meta}</Text>
          {pct !== null && (
            <View style={styles.pw}>
              <View style={[styles.pb, { width: `${Math.round(pct * 100)}%`, backgroundColor: habit.color }]} />
            </View>
          )}
        </View>
      </View>

      {/* Day cells */}
      <View style={styles.hdays}>
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const k = dateKey(year, month, d);
          const val = habit.completions[k] as CompletionValue | undefined;
          const isFuture = isCurrentMonth && d > todayDate;
          const filled = !!val && !isFuture;
          const sym = typeof val === 'object' ? firstChar(val.sym) : null;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => !isFuture && onCellPress(d)}
              activeOpacity={isFuture ? 1 : 0.7}
              style={[
                styles.dc,
                { width: cellWidth },
                isFuture ? styles.dcFut : filled ? { backgroundColor: habit.color } : styles.dcEmpty,
              ]}
            >
              {filled && sym ? <Text style={styles.dcSym}>{sym}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Month Calendar Block (mobile) ───────────────────────────────────────────

const CAL_DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface CalBlockProps {
  habit: Habit;
  year: number;
  month: number;
  days: number;
  isCurrentMonth: boolean;
  todayDate: number;
  screenWidth: number;
  onCellPress: (day: number) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  streak: number;
  best: number;
  meta: string;
  pct: number | null;
}

function MonthCalendarBlock({
  habit, year, month, days, isCurrentMonth, todayDate, screenWidth,
  onCellPress, onEdit, onMoveUp, onMoveDown, isFirst, isLast,
  streak, best, meta, pct,
}: CalBlockProps) {
  const [reordering, setReordering] = useState(false);

  // Cell fills screen: (screenWidth - scrollPad*2 - cardPad*2) / 7
  const cellSize = Math.floor((screenWidth - 40) / 7);
  const hdrSize = Math.round(cellSize * 0.55);

  // Monday-first offset
  const firstDayJS = new Date(year, month, 1).getDay();
  const offset = firstDayJS === 0 ? 6 : firstDayJS - 1;

  // Build rows of exactly 7, padding last row with nulls
  const flat: (number | null)[] = [];
  for (let i = 0; i < offset; i++) flat.push(null);
  for (let d = 1; d <= days; d++) flat.push(d);
  while (flat.length % 7 !== 0) flat.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));

  return (
    <View style={styles.calCard}>
      {/* Header */}
      <View style={styles.calHeader}>
        <TouchableOpacity
          onPress={() => setReordering(r => !r)}
          style={styles.dragHandle}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {reordering ? (
            <View>
              <TouchableOpacity onPress={() => { onMoveUp(); setReordering(false); }} disabled={isFirst} style={styles.reorderBtn}>
                <Text style={[styles.reorderArrow, isFirst && styles.reorderDisabled]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onMoveDown(); setReordering(false); }} disabled={isLast} style={styles.reorderBtn}>
                <Text style={[styles.reorderArrow, isLast && styles.reorderDisabled]}>▼</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.dragGlyph}>⋮⋮</Text>
          )}
        </TouchableOpacity>

        <View style={styles.calNameRow}>
          <View style={[styles.hdot, { backgroundColor: habit.color }]} />
          <Text style={styles.calName} numberOfLines={1}>{habit.name}</Text>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={styles.editBtn}>✎</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calStreakBlock}>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>STR</Text>
          {best > streak && <>
            <Text style={[styles.streakNum, styles.streakBestNum]}>{best}</Text>
            <Text style={styles.streakLabel}>BEST</Text>
          </>}
        </View>
      </View>

      {meta ? <Text style={styles.hmeta}>{meta}</Text> : null}

      {pct !== null && (
        <View style={[styles.pw, { marginBottom: 6 }]}>
          <View style={[styles.pb, { width: `${Math.round(pct * 100)}%`, backgroundColor: habit.color }]} />
        </View>
      )}

      {/* Day-of-week header row — same cell width as grid rows */}
      <View style={{ flexDirection: 'row' }}>
        {CAL_DAY_HEADERS.map((d, i) => (
          <View key={i} style={{ width: cellSize, height: hdrSize, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.calDayHdr}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid rows — explicit rows of 7 guarantee alignment */}
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((day, ci) => {
            if (!day) {
              return <View key={ci} style={{ width: cellSize, height: cellSize }} />;
            }
            const k = dateKey(year, month, day);
            const val = habit.completions[k] as CompletionValue | undefined;
            const isFuture = isCurrentMonth && day > todayDate;
            const isToday = isCurrentMonth && day === todayDate;
            const filled = !!val && !isFuture;
            const sym = typeof val === 'object' ? firstChar(val.sym) : null;
            return (
              <TouchableOpacity
                key={ci}
                onPress={() => !isFuture && onCellPress(day)}
                activeOpacity={isFuture ? 1 : 0.7}
                style={[
                  { width: cellSize, height: cellSize, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
                  isFuture ? styles.dcFut : filled ? { backgroundColor: habit.color } : styles.dcEmpty,
                  isToday && !filled && styles.cellToday,
                ]}
              >
                {filled && sym ? (
                  <Text style={{ fontFamily: 'Georgia', fontSize: cellSize * 0.38, color: Colors.bg3 }}>{sym}</Text>
                ) : !filled && !isFuture ? (
                  <Text style={{ fontFamily: 'Georgia', fontSize: cellSize * 0.3, color: Colors.ink4 }}>{day}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface HabitsScreenProps { userId: string; }

export default function HabitsScreen({ userId }: HabitsScreenProps) {
  const now = new Date();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [habitModal, setHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [subtypeModal, setSubtypeModal] = useState<{ hi: number; key: string } | null>(null);

  useEffect(() => {
    loadHabits(userId).then(setHabits);
    return subscribeHabits(userId, () => { loadHabits(userId).then(setHabits); });
  }, [userId]);

  const persist = useCallback((next: Habit[]) => {
    setHabits(next);
    saveHabits(userId, next);
  }, [userId]);

  const days = daysInMonth(viewYear, viewMonth);
  const today = new Date();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const todayDate = today.getDate();
  const INFO_COL = 155;
  const webCellWidth = isMobile ? CELL : Math.max(CELL, Math.floor((width - INFO_COL - 20) / days));

  // Counters
  const doneToday = habits.filter(h => h.completions[todayKey()]).length;
  const doneWeek = React.useMemo(() => {
    const ws = weekStart();
    let count = 0;
    for (const h of habits) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        if (d > today) break;
        if (h.completions[dateKey(d.getFullYear(), d.getMonth(), d.getDate())]) count++;
      }
    }
    return count;
  }, [habits]);

  const handleCellPress = (habitId: string, day: number) => {
    const hi = habits.findIndex(h => h.id === habitId);
    const h = habits[hi];
    const k = dateKey(viewYear, viewMonth, day);
    if (h.types && h.types.length > 0) {
      setSubtypeModal({ hi, key: k });
    } else {
      const comp = { ...h.completions };
      if (comp[k]) delete comp[k]; else comp[k] = true;
      persist(habits.map((x, i) => i === hi ? { ...x, completions: comp } : x));
    }
  };

  const handleSubtypeSelect = (sym: string) => {
    if (!subtypeModal) return;
    const { hi, key } = subtypeModal;
    const comp = { ...habits[hi].completions };
    comp[key] = { sym };
    persist(habits.map((x, i) => i === hi ? { ...x, completions: comp } : x));
    setSubtypeModal(null);
  };

  const handleSubtypeClear = () => {
    if (!subtypeModal) return;
    const { hi, key } = subtypeModal;
    const comp = { ...habits[hi].completions };
    delete comp[key];
    persist(habits.map((x, i) => i === hi ? { ...x, completions: comp } : x));
    setSubtypeModal(null);
  };

  const saveHabit = useCallback((data: Omit<Habit, 'id' | 'completions'>) => {
    if (editingHabit) {
      persist(habits.map(h => h.id === editingHabit.id ? { ...editingHabit, ...data } : h));
    } else {
      persist([...habits, createHabit(data)]);
    }
    setHabitModal(false);
    setEditingHabit(null);
  }, [editingHabit, habits, persist]);

  const deleteHabit = useCallback((id: string) => {
    persist(habits.filter(h => h.id !== id));
    setHabitModal(false);
    setEditingHabit(null);
  }, [habits, persist]);

  const moveHabit = (idx: number, dir: -1 | 1) => {
    const next = [...habits];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const subtypeHabit = subtypeModal !== null ? habits[subtypeModal.hi] : null;

  return (
    <View style={styles.container}>
      {/* Counters */}
      <View style={styles.ctrs}>
        <View style={styles.ctr}>
          <Text style={styles.ctrL}>DONE TODAY</Text>
          <Text style={styles.ctrV}>{doneToday}</Text>
        </View>
        <View style={styles.ctr}>
          <Text style={styles.ctrL}>DONE THIS WEEK</Text>
          <Text style={styles.ctrV}>{doneWeek}</Text>
        </View>
      </View>

      {/* Month bar */}
      <View style={styles.hbar}>
        <View style={styles.mnav}>
          <TouchableOpacity onPress={prevMonth} style={styles.mnavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.mnavBtnText}>&#8249;</Text>
          </TouchableOpacity>
          <Text style={styles.mlbl}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.mnavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.mnavBtnText}>&#8250;</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { setEditingHabit(null); setHabitModal(true); }} style={styles.badd}>
          <Text style={styles.baddText}>+ HABIT</Text>
        </TouchableOpacity>
      </View>

      {/* Grid — mobile: calendar blocks; web: horizontal scroll grid */}
      {isMobile ? (
        <ScrollView contentContainerStyle={styles.mobileScroll}>
          {habits.length === 0 && (
            <Text style={styles.emptyText}>No habits yet — tap + HABIT to add one.</Text>
          )}
          {habits.map((habit, idx) => {
            const { cur: streak, best } = (() => {
              const today = new Date(); let cur = 0, b = 0, tmp = 0;
              for (let i = 364; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate()); if (habit.completions[k]) { tmp++; b = Math.max(b, tmp); } else tmp = 0; }
              for (let i = 0; i < 365; i++) { const d = new Date(today); d.setDate(today.getDate() - i); const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate()); if (habit.completions[k]) cur++; else break; }
              return { cur, best: b };
            })();
            const progress = (() => {
              if (!habit.goalType || !habit.goal) return null;
              if (habit.goalType === 'monthly') { let c = 0; for (let d = 1; d <= days; d++) if (habit.completions[dateKey(viewYear, viewMonth, d)]) c++; return { c, g: habit.goal, lbl: `${c}/${habit.goal} mo` }; }
              const ws = weekStart(); let c = 0; for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(ws.getDate() + i); if (habit.completions[dateKey(d.getFullYear(), d.getMonth(), d.getDate())]) c++; } return { c, g: habit.goal, lbl: `${c}/${habit.goal} wk` };
            })();
            const pct = progress ? Math.min(1, progress.c / progress.g) : null;
            const meta = (progress ? progress.lbl + ' · ' : '') + `${streak} | ${best}`;
            return (
              <MonthCalendarBlock
                key={habit.id}
                habit={habit}
                year={viewYear}
                month={viewMonth}
                days={days}
                isCurrentMonth={isCurrentMonth}
                todayDate={todayDate}
                screenWidth={width}
                onCellPress={(day) => handleCellPress(habit.id, day)}
                onEdit={() => { setEditingHabit(habit); setHabitModal(true); }}
                onMoveUp={() => moveHabit(idx, -1)}
                onMoveDown={() => moveHabit(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === habits.length - 1}
                streak={streak}
                best={best}
                meta={meta}
                pct={pct}
              />
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView>
          <View style={styles.ghdr}>
            <View style={styles.hiSpacer} />
            <View style={styles.dhdrs}>
              {Array.from({ length: days }, (_, i) => (
                <Text key={i + 1} style={[styles.dlbl, { width: webCellWidth }]}>{i + 1}</Text>
              ))}
            </View>
          </View>
          {habits.map((habit, idx) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              year={viewYear}
              month={viewMonth}
              days={days}
              isCurrentMonth={isCurrentMonth}
              todayDate={todayDate}
              cellWidth={webCellWidth}
              onCellPress={(day) => handleCellPress(habit.id, day)}
              onEdit={() => { setEditingHabit(habit); setHabitModal(true); }}
              onMoveUp={() => moveHabit(idx, -1)}
              onMoveDown={() => moveHabit(idx, 1)}
              isFirst={idx === 0}
              isLast={idx === habits.length - 1}
            />
          ))}
          {habits.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No habits yet — tap + HABIT to add one.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <HabitModal
        habit={editingHabit}
        visible={habitModal}
        onSave={saveHabit}
        onDelete={deleteHabit}
        onClose={() => { setHabitModal(false); setEditingHabit(null); }}
      />

      {subtypeHabit && (
        <SubtypeModal
          visible={subtypeModal !== null}
          habitName={subtypeHabit.name}
          types={subtypeHabit.types}
          hasValue={!!subtypeHabit.completions[subtypeModal!.key]}
          onSelect={handleSubtypeSelect}
          onClear={handleSubtypeClear}
          onClose={() => setSubtypeModal(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Counters
  ctrs: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    paddingBottom: 0,
  },
  ctr: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 6,
    padding: 8,
    paddingHorizontal: 12,
  },
  ctrL: { ...Typography.sectionLabel, fontSize: 10, letterSpacing: 0.8 },
  ctrV: { fontFamily: 'Georgia', fontSize: 22, color: Colors.ink, marginTop: 2 },

  // Month bar
  hbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mnav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mnavBtn: {
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    backgroundColor: Colors.bg3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  mnavBtnText: { fontFamily: 'Georgia', fontSize: 16, color: Colors.ink },
  mlbl: {
    fontFamily: 'Georgia',
    fontSize: 12,
    letterSpacing: 0.5,
    minWidth: 115,
    textAlign: 'center',
    color: Colors.ink,
  },
  badd: {
    backgroundColor: Colors.ink,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  baddText: { ...Typography.navLabel, fontSize: 10, color: Colors.bg },

  // Grid header
  ghdr: { flexDirection: 'row', paddingLeft: 10 },
  hiSpacer: { width: 155 },
  dhdrs: { flexDirection: 'row' },
  dlbl: {
    width: CELL,
    textAlign: 'center',
    fontFamily: 'Georgia',
    fontSize: 10,
    color: Colors.ink4,
  },

  // Habit row
  hr: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: Colors.bg2,
    alignItems: 'center',
    paddingLeft: 10,
    paddingVertical: 2,
  },

  // Info column
  hi: {
    width: 155,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 6,
    paddingVertical: 5,
    gap: 5,
  },
  dragHandle: {
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 3,
  },
  dragGlyph: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink4,
    letterSpacing: -3,
  },
  reorderBtn: { alignItems: 'center', paddingVertical: 1 },
  reorderArrow: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink2 },
  reorderDisabled: { color: Colors.ink4 },
  hiBody: { flex: 1, minWidth: 0 },
  hn: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  hdot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  hnText: { fontFamily: 'Georgia', fontSize: 12, color: Colors.ink, flex: 1 },
  editBtn: { fontSize: 11, color: Colors.ink4 },
  hmeta: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink3, marginTop: 1 },
  pw: {
    height: 3,
    backgroundColor: Colors.bg2,
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  pb: { height: 3, borderRadius: 2 },

  // Day cells
  hdays: { flexDirection: 'row', paddingVertical: 2 },
  dc: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dcEmpty: { backgroundColor: Colors.bg2, opacity: 0.4 },
  dcFut: { backgroundColor: Colors.bg2, opacity: 0.15 },
  dcSym: { fontFamily: 'Georgia', fontSize: 9, color: Colors.bg3, fontWeight: '600' },

  emptyRow: { padding: 24, alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.ink3 },

  // Mobile calendar blocks
  mobileScroll: { padding: 10, paddingBottom: 40 },
  calCard: {
    backgroundColor: Colors.bg2,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 4,
  },
  calNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 1,
  },
  calName: {
    ...Typography.sectionLabel,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.ink,
    flex: 1,
  },
  calStreakBlock: { alignItems: 'flex-end', minWidth: 36 },
  streakNum: { fontFamily: 'Georgia', fontSize: 15, color: Colors.ink, lineHeight: 17 },
  streakBestNum: { fontSize: 12, color: Colors.ink3, marginTop: 2 },
  streakLabel: { ...Typography.sectionLabel, fontSize: 8, letterSpacing: 0.8 },
  calDayHdr: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink4,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: Colors.ink2,
  },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 90, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.bg3,
    borderRadius: 10,
    padding: 18,
    width: '100%',
    maxWidth: 370,
    maxHeight: '84%',
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    flexDirection: 'column',
  },
  typeModalCard: { maxWidth: 200, alignSelf: 'center' },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.ink,
    marginBottom: 12,
  },

  // Subtype modal
  clearLink: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  typePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  typePickRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.bg2 },
  typePickSym: {
    fontFamily: 'Georgia',
    fontSize: 18,
    width: 28,
    textAlign: 'center',
    color: Colors.ink,
  },
  typePickName: { fontFamily: 'Georgia', fontSize: 13, color: Colors.ink },

  // Habit modal fields
  field: { marginBottom: 9 },
  frow: { flexDirection: 'row', gap: 8 },
  fieldLabel: {
    fontFamily: 'Georgia',
    fontSize: 10,
    color: Colors.ink3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  finput: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 5,
    fontFamily: 'Georgia',
    fontSize: 12,
    backgroundColor: Colors.bg,
    color: Colors.ink,
  },
  finputSelect: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  gtBtn: {
    flex: 1,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 4,
    alignItems: 'center',
  },
  gtBtnOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  gtBtnText: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink3 },
  gtBtnTextOn: { color: Colors.bg },
  copts: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 3 },
  copt: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: 'transparent' },
  coptOn: { borderColor: Colors.ink },
  sep: { height: 0.5, backgroundColor: Colors.bg2, marginVertical: 9 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeRowSym: { fontFamily: 'Georgia', fontSize: 15, width: 26, color: Colors.ink },
  typeRowLabel: { flex: 1, fontFamily: 'Georgia', fontSize: 11, color: Colors.ink3 },
  typeRowRemove: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    textDecorationLine: 'underline',
  },
  typeAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeAddInput: {
    flex: 1,
    padding: 5,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 4,
    fontFamily: 'Georgia',
    fontSize: 14,
    backgroundColor: Colors.bg,
    color: Colors.ink,
  },
  mact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.bg2,
  },
  mactRight: { flexDirection: 'row', gap: 7 },
  btnCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 5,
  },
  btnCancelText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink },
  btnSave: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.ink,
    borderRadius: 5,
  },
  btnSaveText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.bg },
  btnDelete: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.ink3,
    borderRadius: 5,
  },
  btnDeleteText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink3 },
});

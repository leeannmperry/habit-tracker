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
} from 'react-native';
import { Colors, Typography } from '../theme';
import { Task, Domain, loadTasks, saveTasks, subscribeTasks, createTask, getNextMidnight } from '../store/tasks';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DP_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DP_DAY_HDRS = ['M','T','W','T','F','S','S'];

function dpDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function dpKey(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function dpTodayKey() { const d = new Date(); return dpKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function formatDate(k: string): string {
  if (!k) return '';
  const [y, mo, d] = k.split('-');
  return `${DP_MONTHS[parseInt(mo)-1].slice(0,3)} ${parseInt(d)}, ${y}`;
}

function isFutureStart(start: string | null): boolean {
  if (!start) return false;
  return new Date(start + 'T00:00:00') > new Date();
}

// ─── Date Picker Modal ────────────────────────────────────────────────────────

interface DatePickerProps {
  visible: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

function DatePickerModal({ visible, value, onSelect, onClose }: DatePickerProps) {
  const initDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth());
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setSelected(value);
    }
  }, [visible, value]);

  const days = dpDaysInMonth(year, month);
  const firstDayJS = new Date(year, month, 1).getDay();
  const offset = firstDayJS === 0 ? 6 : firstDayJS - 1; // Mon-first
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset + days; i++) {
    cells.push(i < offset ? null : i - offset + 1);
  }
  const today = dpTodayKey();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dpCard} onPress={() => {}}>
          {/* Month nav */}
          <View style={styles.dpNav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dpArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.dpTitle}>{DP_MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dpArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dpRow}>
            {DP_DAY_HDRS.map((h, i) => (
              <View key={i} style={styles.dpCell}>
                <Text style={styles.dpDayHdr}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.dpGrid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.dpCell} />;
              const k = dpKey(year, month, day);
              const isSel = k === selected;
              const isToday = k === today;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelected(k)}
                  style={[styles.dpCell, styles.dpDayCell, isSel && styles.dpSelCell, isToday && !isSel && styles.dpTodayCell]}
                >
                  <Text style={[styles.dpDayText, isSel && styles.dpSelText]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.mact}>
            {selected ? (
              <TouchableOpacity onPress={() => { onSelect(''); onClose(); }} style={styles.btnCancel}>
                <Text style={styles.btnCancelText}>CLEAR</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (selected) onSelect(selected); onClose(); }}
              style={[styles.btnSave, !selected && styles.btnSaveDisabled]}
            >
              <Text style={styles.btnSaveText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Date Field ───────────────────────────────────────────────────────────────

function DateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity onPress={onPress} style={styles.dateField}>
        <Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}>
          {value ? formatDate(value) : 'tap to set'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task | null;
  domain: Domain;
  allTasks: Task[];
  visible: boolean;
  onSave: (data: Omit<Task, 'id' | 'done' | 'doneAt'>) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

function TaskModal({ task, domain, allTasks, visible, onSave, onDelete, onClose }: TaskModalProps) {
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [newProject, setNewProject] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');
  const [reward, setReward] = useState('');
  const [notes, setNotes] = useState('');
  const [datePicker, setDatePicker] = useState<'start' | 'due' | null>(null);

  const projects = React.useMemo(() => {
    const s = new Set<string>();
    allTasks.filter(t => t.domain === domain && t.project).forEach(t => s.add(t.project));
    return [...s];
  }, [allTasks, domain]);

  const parentCandidates = React.useMemo(() => {
    const proj = showNewProject ? newProject.trim() : project;
    return allTasks.filter(t =>
      t.domain === domain &&
      t.project === proj &&
      t.parent === null &&
      (!task || t.id !== task.id)
    );
  }, [allTasks, domain, project, newProject, showNewProject, task]);

  useEffect(() => {
    if (visible) {
      if (task) {
        setName(task.name);
        const taskProjs = new Set(allTasks.filter(t => t.domain === task.domain && t.project).map(t => t.project));
        if (taskProjs.has(task.project)) {
          setProject(task.project); setShowNewProject(false);
        } else {
          setProject(''); setNewProject(task.project); setShowNewProject(true);
        }
        setParentId(task.parent);
        setStart(task.start ?? '');
        setDue(task.due ?? '');
        setReward(task.reward);
        setNotes(task.notes);
      } else {
        setName('');
        setProject(projects[0] ?? ''); setShowNewProject(projects.length === 0); setNewProject('');
        setParentId(null); setStart(''); setDue(''); setReward(''); setNotes('');
      }
      setDatePicker(null);
    }
  }, [visible, task]);

  const handleSave = () => {
    if (!name.trim()) return;
    const finalProject = showNewProject ? (newProject.trim() || 'general') : (project || 'general');
    const parentTask = parentId ? allTasks.find(t => t.id === parentId) : null;
    onSave({
      name: name.trim(), domain,
      project: parentTask ? parentTask.project : finalProject,
      parent: parentId,
      start: start || null, due: due || null,
      reward: reward.trim(), notes: notes.trim(),
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{task ? 'EDIT TASK' : 'ADD TASK'}</Text>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>TASK NAME</Text>
                  <TextInput
                    style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    value={name} onChangeText={setName} autoFocus placeholderTextColor={Colors.ink4}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PROJECT</Text>
                  {!showNewProject && projects.length > 0 ? (
                    <View style={styles.projBtns}>
                      {projects.map(p => (
                        <TouchableOpacity key={p} onPress={() => setProject(p)} style={[styles.projBtn, project === p && styles.projBtnOn]}>
                          <Text style={[styles.projBtnText, project === p && styles.projBtnTextOn]} numberOfLines={1}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity onPress={() => { setShowNewProject(true); setProject(''); }} style={styles.projBtn}>
                        <Text style={styles.projBtnText}>+ new...</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TextInput
                        style={[styles.finput, { flex: 1 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                        value={newProject} onChangeText={setNewProject}
                        placeholder="new project name" placeholderTextColor={Colors.ink4}
                      />
                      {projects.length > 0 && (
                        <TouchableOpacity onPress={() => { setShowNewProject(false); setProject(projects[0]); }}>
                          <Text style={styles.smallLink}>existing</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {parentCandidates.length > 0 && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>PARENT TASK</Text>
                    <View style={styles.projBtns}>
                      <TouchableOpacity onPress={() => setParentId(null)} style={[styles.projBtn, parentId === null && styles.projBtnOn]}>
                        <Text style={[styles.projBtnText, parentId === null && styles.projBtnTextOn]}>— none —</Text>
                      </TouchableOpacity>
                      {parentCandidates.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => setParentId(t.id)} style={[styles.projBtn, parentId === t.id && styles.projBtnOn]}>
                          <Text style={[styles.projBtnText, parentId === t.id && styles.projBtnTextOn]} numberOfLines={1}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.frow}>
                  <DateField label="START DATE" value={start} onPress={() => setDatePicker('start')} />
                  <DateField label="DUE DATE" value={due} onPress={() => setDatePicker('due')} />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>REWARD WHEN DONE</Text>
                  <TextInput
                    style={[styles.finput, styles.rewardField, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    value={reward} onChangeText={setReward}
                    placeholderTextColor="rgba(253,250,248,0.55)" placeholder="treat yourself..."
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>NOTES</Text>
                  <TextInput
                    style={[styles.finput, styles.textarea, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    value={notes} onChangeText={setNotes} multiline placeholderTextColor={Colors.ink4}
                  />
                </View>
              </ScrollView>

              {/* Action buttons — always visible outside scroll */}
              <View style={styles.mact}>
                {task && onDelete && (
                  <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.btnDelete}>
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

      <DatePickerModal
        visible={datePicker !== null}
        value={datePicker === 'start' ? start : due}
        onSelect={v => { if (datePicker === 'start') setStart(v); else setDue(v); }}
        onClose={() => setDatePicker(null)}
      />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  domain: Domain;
  userId: string;
}

export default function TodoScreen({ domain, userId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reorderingTaskId, setReorderingTaskId] = useState<number | null>(null);

  useEffect(() => {
    loadTasks(userId).then(setTasks);
    return subscribeTasks(userId, () => { loadTasks(userId).then(setTasks); });
  }, [userId]);

  // Re-load when switching domains (data already in state, this keeps it fresh)
  useEffect(() => { loadTasks(userId).then(setTasks); }, [domain]);

  // Auto-prune done tasks at midnight
  useEffect(() => {
    const ms = getNextMidnight() - Date.now();
    const timer = setTimeout(() => { loadTasks(userId).then(setTasks); }, ms);
    return () => clearTimeout(timer);
  }, [userId]);

  const persist = useCallback((next: Task[]) => {
    setTasks(next);
    saveTasks(userId, next);
  }, [userId]);

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTaskModal(true);
  };

  const saveTask = useCallback((data: Omit<Task, 'id' | 'done' | 'doneAt'>) => {
    if (editingTask) {
      persist(tasks.map(t => t.id === editingTask.id ? { ...editingTask, ...data } : t));
    } else {
      persist([...tasks, createTask(data)]);
    }
    setTaskModal(false);
    setEditingTask(null);
  }, [editingTask, tasks, persist]);

  const deleteTask = useCallback((id: number) => {
    persist(tasks.filter(t => t.id !== id && t.parent !== id));
    setTaskModal(false);
    setEditingTask(null);
  }, [tasks, persist]);

  const toggleTask = (id: number) => {
    persist(tasks.map(t => {
      if (t.id !== id) return t;
      const done = !t.done;
      return { ...t, done, doneAt: done ? Date.now() : null };
    }));
  };

  const moveTask = (id: number, dir: -1 | 1) => {
    const arr = tasks.filter(t => t.domain === domain && !t.parent);
    const idx = arr.findIndex(t => t.id === id);
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    const newArr = [...arr];
    [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
    const others = tasks.filter(t => t.domain !== domain || t.parent !== null);
    persist([...others, ...newArr]);
  };

  const domainTasks = tasks.filter(t => t.domain === domain);
  const topLevel = domainTasks.filter(t => !t.parent);
  const groups: Record<string, Task[]> = {};
  topLevel.filter(t => !t.done).forEach(t => {
    const p = t.project || 'general';
    if (!groups[p]) groups[p] = [];
    groups[p].push(t);
  });
  const doneByProject: Record<string, Task[]> = {};
  topLevel.filter(t => t.done).forEach(t => {
    const p = t.project || 'general';
    if (!doneByProject[p]) doneByProject[p] = [];
    doneByProject[p].push(t);
  });
  const allProjects = [...new Set([...Object.keys(groups), ...Object.keys(doneByProject)])];
  const topLevelActive = topLevel.filter(t => !t.done);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {allProjects.length === 0 && (
          <Text style={styles.emptyText}>No tasks yet.</Text>
        )}

        {allProjects.map(proj => {
          const activeItems = groups[proj] ?? [];
          const doneItems = doneByProject[proj] ?? [];
          if (activeItems.length === 0 && doneItems.length === 0) return null;

          return (
            <View key={proj} style={styles.pg}>
              <View style={styles.pgh}>
                <Text style={styles.pgt}>{proj.toUpperCase()}</Text>
                <View style={styles.pgc}><Text style={styles.pgcText}>{activeItems.length}</Text></View>
              </View>

              {[...activeItems, ...doneItems].map(task => {
                const children = domainTasks.filter(c => c.parent === task.id && !c.done);
                const allChildren = domainTasks.filter(c => c.parent === task.id);
                const doneChildren = allChildren.filter(c => c.done).length;
                const isFut = isFutureStart(task.start);

                const chips: string[] = [];
                if (task.due) chips.push(task.due);
                if (task.start && isFut) chips.push(`from ${task.start}`);
                if (task.reward && !task.done) chips.push(task.reward);
                if (allChildren.length) chips.push(`${doneChildren}/${allChildren.length}`);

                const isReordering = reorderingTaskId === task.id;
                const taskIdxInActive = topLevelActive.findIndex(t => t.id === task.id);

                return (
                  <View key={task.id}>
                    <View style={[styles.ti, task.done && styles.tiDone]}>
                      {!task.done ? (
                        <TouchableOpacity
                          onPress={() => setReorderingTaskId(isReordering ? null : task.id)}
                          style={styles.tDrag}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          {isReordering ? (
                            <View>
                              <TouchableOpacity onPress={() => { moveTask(task.id, -1); setReorderingTaskId(null); }} disabled={taskIdxInActive === 0}>
                                <Text style={[styles.reorderArrow, taskIdxInActive === 0 && styles.reorderDisabled]}>▲</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => { moveTask(task.id, 1); setReorderingTaskId(null); }} disabled={taskIdxInActive === topLevelActive.length - 1}>
                                <Text style={[styles.reorderArrow, taskIdxInActive === topLevelActive.length - 1 && styles.reorderDisabled]}>▼</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={styles.tDragText}>⋮</Text>
                          )}
                        </TouchableOpacity>
                      ) : <View style={styles.tDrag} />}

                      <TouchableOpacity onPress={() => toggleTask(task.id)} style={[styles.tck, task.done && styles.tckOn]} />

                      <View style={styles.tb}>
                        <View style={styles.tnRow}>
                          <Text style={[styles.tnText, isFut && !task.done && styles.tnFuture, task.done && styles.tnDone]} numberOfLines={2}>{task.name}</Text>
                          {!task.done && (
                            <TouchableOpacity onPress={() => openEdit(task)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 4 }}>
                              <Text style={styles.editBtn}>✎</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {chips.length > 0 && (
                          <View style={styles.chips}>
                            {chips.map((ch, i) => (
                              <View key={i} style={[styles.chip, (isFut || task.done) && styles.chipFuture]}>
                                <Text style={[styles.chipText, (isFut || task.done) && styles.chipTextFuture]}>{ch}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    {children.map(sub => {
                      const subFut = isFutureStart(sub.start);
                      return (
                        <View key={sub.id} style={[styles.sub, sub.done && styles.tiDone]}>
                          <TouchableOpacity onPress={() => toggleTask(sub.id)} style={[styles.sck, sub.done && styles.sckOn]} />
                          <Text style={[styles.snText, subFut && styles.tnFuture, sub.done && styles.tnDone]} numberOfLines={2}>{sub.name}</Text>
                          {!sub.done && (
                            <TouchableOpacity onPress={() => openEdit(sub)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 4 }}>
                              <Text style={styles.editBtn}>✎</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.fabSpacer} />
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        onPress={() => { setEditingTask(null); setTaskModal(true); }}
        style={styles.fab}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TaskModal
        task={editingTask}
        domain={domain}
        allTasks={tasks}
        visible={taskModal}
        onSave={saveTask}
        onDelete={deleteTask}
        onClose={() => { setTaskModal(false); setEditingTask(null); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const DP_CELL = 36;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 80 },

  emptyText: { ...Typography.body, color: Colors.ink3, textAlign: 'center', marginTop: 32 },

  pg: { marginBottom: 10 },
  pgh: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: Colors.bg2, marginBottom: 2,
  },
  pgt: { ...Typography.sectionLabel, fontSize: 10, letterSpacing: 0.9, color: Colors.ink2 },
  pgc: { backgroundColor: Colors.bg2, paddingVertical: 1, paddingHorizontal: 6, borderRadius: 10 },
  pgcText: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink4 },

  ti: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingVertical: 6, paddingLeft: 4,
    borderBottomWidth: 0.5, borderBottomColor: Colors.bg2,
  },
  tiDone: { opacity: 0.5 },
  tDrag: { paddingTop: 3, flexShrink: 0, minWidth: 14, alignItems: 'center' },
  tDragText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink4 },
  reorderArrow: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink2, textAlign: 'center' },
  reorderDisabled: { color: Colors.ink4 },
  tck: { width: 13, height: 13, borderWidth: 1, borderColor: Colors.ink4, borderRadius: 2, flexShrink: 0, marginTop: 2 },
  tckOn: { backgroundColor: Colors.acc, borderColor: Colors.acc },
  tb: { flex: 1, minWidth: 0 },
  tnRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' },
  tnText: { fontFamily: 'Georgia', fontSize: 20, color: Colors.ink, flex: 1 },
  tnFuture: { color: Colors.ink4 },
  tnDone: { textDecorationLine: 'line-through', color: Colors.ink3 },
  editBtn: { fontFamily: 'Georgia', fontSize: 16, color: Colors.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  chip: { backgroundColor: Colors.acc, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 10 },
  chipFuture: { backgroundColor: Colors.bg2 },
  chipText: { fontFamily: 'Georgia', fontSize: 10, color: Colors.bg },
  chipTextFuture: { color: Colors.ink4 },

  sub: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 4, paddingLeft: 22,
    borderBottomWidth: 0.5, borderBottomColor: Colors.bg2,
  },
  sck: { width: 10, height: 10, borderWidth: 1, borderColor: Colors.ink4, borderRadius: 2, flexShrink: 0 },
  sckOn: { backgroundColor: Colors.acc, borderColor: Colors.acc },
  snText: { fontFamily: 'Georgia', fontSize: 17, color: Colors.ink, flex: 1 },

  // FAB
  fabSpacer: { height: 60 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { fontFamily: 'Georgia', fontSize: 26, color: Colors.bg, lineHeight: 30 },

  // Date picker
  dpCard: {
    backgroundColor: Colors.bg3,
    borderRadius: 10,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
  },
  dpNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dpArrow: { fontFamily: 'Georgia', fontSize: 22, color: Colors.ink2, paddingHorizontal: 4 },
  dpTitle: { fontFamily: 'Georgia', fontSize: 13, color: Colors.ink, letterSpacing: 0.3 },
  dpRow: { flexDirection: 'row', marginBottom: 2 },
  dpCell: { width: DP_CELL, height: DP_CELL, alignItems: 'center', justifyContent: 'center' },
  dpDayHdr: { fontFamily: 'Georgia', fontSize: 10, color: Colors.ink4 },
  dpGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dpDayCell: { borderRadius: 18 },
  dpSelCell: { backgroundColor: Colors.ink },
  dpTodayCell: { borderWidth: 1.5, borderColor: Colors.ink2 },
  dpDayText: { fontFamily: 'Georgia', fontSize: 13, color: Colors.ink },
  dpSelText: { color: Colors.bg },

  // Date field
  dateField: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 5,
    backgroundColor: Colors.bg,
  },
  dateFieldText: { fontFamily: 'Georgia', fontSize: 12, color: Colors.ink },
  dateFieldPlaceholder: { color: Colors.ink4 },

  // Modal shared
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 90, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.bg3, borderRadius: 10, padding: 18,
    width: '100%', maxWidth: 370, maxHeight: '84%',
    borderWidth: 0.5, borderColor: Colors.bg2,
    flexDirection: 'column',
  },
  modalTitle: {
    fontFamily: 'Georgia', fontSize: 10, letterSpacing: 1.4,
    textTransform: 'uppercase', color: Colors.ink, marginBottom: 12,
  },
  field: { marginBottom: 9 },
  frow: { flexDirection: 'row', gap: 8 },
  fieldLabel: {
    fontFamily: 'Georgia', fontSize: 10, color: Colors.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3,
  },
  finput: {
    width: '100%', paddingVertical: 6, paddingHorizontal: 8,
    borderWidth: 0.5, borderColor: Colors.bg2, borderRadius: 5,
    fontFamily: 'Georgia', fontSize: 12, backgroundColor: Colors.bg, color: Colors.ink,
  },
  rewardField: { backgroundColor: Colors.acc, color: Colors.bg },
  textarea: { height: 52, textAlignVertical: 'top' },
  projBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  projBtn: { paddingVertical: 4, paddingHorizontal: 9, borderWidth: 0.5, borderColor: Colors.bg2, borderRadius: 4 },
  projBtnOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  projBtnText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink3 },
  projBtnTextOn: { color: Colors.bg },
  smallLink: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink3, textDecorationLine: 'underline' },
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
  btnCancel: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 0.5, borderColor: Colors.bg2, borderRadius: 5 },
  btnCancelText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink },
  btnSave: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.ink, borderRadius: 5 },
  btnSaveDisabled: { opacity: 0.4 },
  btnSaveText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.bg },
  btnDelete: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 0.5, borderColor: Colors.ink3, borderRadius: 5 },
  btnDeleteText: { fontFamily: 'Georgia', fontSize: 11, color: Colors.ink3 },
});

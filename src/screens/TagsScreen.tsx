import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
  AppState,
  Share,
} from 'react-native';
import { Colors, Typography } from '../theme';
import {
  Tag,
  loadTags,
  saveTags,
  deleteTag,
  subscribeTags,
  createTag,
  logTagEntry,
  loadTagLog,
  loadAllTagsMap,
  hasAutoLogToday,
} from '../store/tags';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localTimeStr(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function tzOffset(): string {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

// ─── Tag Modal (Create / Edit) ────────────────────────────────────────────────

interface TagModalProps {
  tag: Tag | null;
  visible: boolean;
  onSave: (fields: { name: string; defaultAmount: string | null; autoLog: boolean }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function TagModal({ tag, visible, onSave, onDelete, onClose }: TagModalProps) {
  const [name, setName] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [autoLog, setAutoLog] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(tag?.name ?? '');
      setDefaultAmount(tag?.defaultAmount ?? '');
      setAutoLog(tag?.autoLog ?? false);
    }
  }, [tag, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), defaultAmount: defaultAmount.trim() || null, autoLog });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tag ? 'EDIT TAG' : 'ADD TAG'}</Text>

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
              <Text style={styles.fieldLabel}>DEFAULT AMOUNT</Text>
              <TextInput
                style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                value={defaultAmount}
                onChangeText={setDefaultAmount}
                placeholder="leave blank for N/A"
                placeholderTextColor={Colors.ink4}
              />
            </View>

            <View style={[styles.field, styles.toggleRow]}>
              <Text style={styles.fieldLabel}>AUTO-LOG AT 6AM DAILY</Text>
              <Switch
                value={autoLog}
                onValueChange={setAutoLog}
                trackColor={{ false: Colors.bg2, true: Colors.ink3 }}
                thumbColor={autoLog ? Colors.ink : Colors.ink4}
              />
            </View>

            <View style={styles.mact}>
              {tag && (
                <TouchableOpacity onPress={() => onDelete(tag.id)} style={styles.btnDelete}>
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

// ─── Log Entry Modal ──────────────────────────────────────────────────────────

interface LogModalProps {
  tag: Tag | null;
  visible: boolean;
  onSave: (loggedAt: string, amount: string | null) => void;
  onClose: () => void;
}

function LogModal({ tag, visible, onSave, onClose }: LogModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setDate(localDateStr(now));
      setTime(localTimeStr(now));
      setAmount(tag?.defaultAmount ?? '');
    }
  }, [tag, visible]);

  const handleSave = () => {
    const loggedAt = `${date}T${time}:00${tzOffset()}`;
    onSave(loggedAt, amount.trim() || null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tag?.name.toUpperCase() ?? 'LOG ENTRY'}</Text>

            <View style={styles.frow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>DATE</Text>
                <TextInput
                  style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.ink4}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>TIME</Text>
                <TextInput
                  style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.ink4}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>AMOUNT</Text>
              <TextInput
                style={[styles.finput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                value={amount}
                onChangeText={setAmount}
                placeholder="leave blank for N/A"
                placeholderTextColor={Colors.ink4}
              />
            </View>

            <View style={[styles.mact, { justifyContent: 'flex-end' }]}>
              <View style={styles.mactRight}>
                <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                  <Text style={styles.btnCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.btnSave}>
                  <Text style={styles.btnSaveText}>LOG</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface TagsScreenProps { userId: string; }

export default function TagsScreen({ userId }: TagsScreenProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagModal, setTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [logModal, setLogModal] = useState(false);
  const [loggingTag, setLoggingTag] = useState<Tag | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const tagsRef = useRef<Tag[]>([]);
  tagsRef.current = tags;

  useEffect(() => {
    loadTags(userId).then(setTags);
    return subscribeTags(userId, () => { loadTags(userId).then(setTags); });
  }, [userId]);

  // Auto-log: for each tag with autoLog=true, write a 6AM entry if it's past
  // 6AM and one hasn't been written yet today. Runs on load and app foreground.
  const runAutoLog = useCallback(async (currentTags: Tag[]) => {
    const now = new Date();
    if (now.getHours() < 6) return;
    for (const tag of currentTags) {
      if (!tag.autoLog) continue;
      const already = await hasAutoLogToday(userId, tag.id);
      if (!already) {
        const logTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
        const loggedAt = `${localDateStr(logTime)}T06:00:00${tzOffset()}`;
        await logTagEntry(userId, tag.id, tag.name, tag.defaultAmount, loggedAt);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (tags.length > 0) runAutoLog(tags);
  }, [tags, runAutoLog]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') runAutoLog(tagsRef.current);
    });
    return () => sub.remove();
  }, [runAutoLog]);

  const handleSaveTag = useCallback(async (fields: { name: string; defaultAmount: string | null; autoLog: boolean }) => {
    let next: Tag[];
    if (editingTag) {
      next = tags.map(t => t.id === editingTag.id ? { ...editingTag, ...fields } : t);
    } else {
      next = [...tags, createTag(fields)];
    }
    await saveTags(userId, next);
    setTags(next);
    setTagModal(false);
    setEditingTag(null);
  }, [editingTag, tags, userId]);

  const handleDeleteTag = useCallback(async (id: string) => {
    await deleteTag(userId, id);
    setTags(prev => prev.filter(t => t.id !== id));
    setTagModal(false);
    setEditingTag(null);
  }, [userId]);

  const moveTag = useCallback((idx: number, dir: -1 | 1) => {
    const next = [...tags];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setTags(next);
    saveTags(userId, next);
    setReorderingId(null);
  }, [tags, userId]);

  const handleLog = useCallback(async (loggedAt: string, amount: string | null) => {
    if (!loggingTag) return;
    await logTagEntry(userId, loggingTag.id, loggingTag.name, amount, loggedAt);
    setLogModal(false);
    setLoggingTag(null);
  }, [loggingTag, userId]);

  const exportCSV = useCallback(async () => {
    const [entries, tagsMap] = await Promise.all([
      loadTagLog(userId),
      loadAllTagsMap(userId),
    ]);
    const rows = entries.map(e => {
      const deletedAt = tagsMap.get(e.tagId);
      const deleted = deletedAt != null ? 1 : 0;
      const tag = `"${e.tagName.replace(/"/g, '""')}"`;
      const amount = e.amount != null ? `"${e.amount.replace(/"/g, '""')}"` : '';
      return `${e.loggedAt},${tag},${amount},${deleted}`;
    });
    const csv = 'timestamp,tag,amount,deleted\n' + rows.join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ritual-tags.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: csv, title: 'Ritual Tag Log' });
    }
  }, [userId]);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.hbar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => { setEditingTag(null); setTagModal(true); }}
          style={styles.badd}
        >
          <Text style={styles.baddText}>+ TAG</Text>
        </TouchableOpacity>
      </View>

      {/* Tag grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {tags.length === 0 ? (
          <Text style={styles.emptyText}>No tags yet — tap + TAG to add one.</Text>
        ) : (
          <View style={styles.tagGrid}>
            {tags.map((tag, idx) => (
              <View key={tag.id} style={styles.tagBtn}>
                {/* Reorder handle — top-left; sibling of content so no nested-touchable conflict */}
                <TouchableOpacity
                  style={styles.tagHandle}
                  onPress={() => setReorderingId(prev => prev === tag.id ? null : tag.id)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.tagHandleGlyph}>⋮</Text>
                </TouchableOpacity>

                {/* Auto-log dot — top-right */}
                {tag.autoLog && <View style={styles.autoLogDot} />}

                {/* Reorder arrows OR tap-to-log content */}
                {reorderingId === tag.id ? (
                  <View style={styles.tagReorderArea}>
                    <TouchableOpacity
                      onPress={() => moveTag(idx, -1)}
                      disabled={idx === 0}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.reorderArrow, idx === 0 && styles.reorderDisabled]}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveTag(idx, 1)}
                      disabled={idx === tags.length - 1}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.reorderArrow, idx === tags.length - 1 && styles.reorderDisabled]}>▶</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.tagTapArea}
                    onPress={() => { setLoggingTag(tag); setLogModal(true); }}
                    onLongPress={() => { setEditingTag(tag); setTagModal(true); }}
                    delayLongPress={400}
                  >
                    <Text style={styles.tagBtnName}>{tag.name}</Text>
                    {tag.defaultAmount ? (
                      <Text style={styles.tagBtnAmount}>{tag.defaultAmount}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={exportCSV} style={styles.btnExport}>
          <Text style={styles.btnExportText}>EXPORT CSV</Text>
        </TouchableOpacity>
      </View>

      <TagModal
        tag={editingTag}
        visible={tagModal}
        onSave={handleSaveTag}
        onDelete={handleDeleteTag}
        onClose={() => { setTagModal(false); setEditingTag(null); }}
      />

      <LogModal
        tag={loggingTag}
        visible={logModal}
        onSave={handleLog}
        onClose={() => { setLogModal(false); setLoggingTag(null); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  hbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  badd: {
    backgroundColor: Colors.ink,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  baddText: { ...Typography.navLabel, fontSize: 10, color: Colors.bg },

  grid: { padding: 10, paddingBottom: 20, flexGrow: 1 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // ── Tag button ──────────────────────────────────────────────────────────────
  tagBtn: {
    backgroundColor: Colors.bg2,
    borderRadius: 6,
    minWidth: 80,
    position: 'relative',
    paddingTop: 24, // reserve room for the handle row
  },
  tagHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingTop: 6,
    paddingLeft: 8,
    paddingRight: 6,
    paddingBottom: 4,
  },
  tagHandleGlyph: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink4,
    letterSpacing: -1,
  },
  autoLogDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ink3,
  },
  tagTapArea: {
    paddingBottom: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  tagBtnName: {
    fontFamily: 'Georgia',
    fontSize: 12,
    color: Colors.ink,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagBtnAmount: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 3,
    textAlign: 'center',
  },
  tagReorderArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  reorderArrow: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: Colors.ink2,
  },
  reorderDisabled: { color: Colors.ink4 },

  emptyText: { ...Typography.body, color: Colors.ink3, textAlign: 'center', marginTop: 40 },

  footer: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.bg2,
    padding: 12,
    alignItems: 'center',
  },
  btnExport: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
    borderRadius: 5,
  },
  btnExportText: { ...Typography.navLabel, fontSize: 10, color: Colors.ink2 },

  // ── Shared modal styles (mirrors HabitsScreen) ──────────────────────────────

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 90, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // No maxHeight — content is small and fixed, so natural size always fits.
  // Previously maxHeight: '84%' caused children to overflow the card's visual bounds.
  modalCard: {
    backgroundColor: Colors.bg3,
    borderRadius: 10,
    padding: 18,
    width: '100%',
    maxWidth: 370,
    borderWidth: 0.5,
    borderColor: Colors.bg2,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.ink,
    marginBottom: 12,
  },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

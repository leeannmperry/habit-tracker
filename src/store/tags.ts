import { supabase } from '../lib/supabase';

export interface Tag {
  id: string;
  name: string;
  defaultAmount: string | null;
  autoLog: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TagLogEntry {
  id: string;
  tagId: string;
  tagName: string;
  amount: string | null;
  loggedAt: string;
  createdAt: string;
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

function rowToTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    defaultAmount: row.default_amount ?? null,
    autoLog: row.auto_log ?? false,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

function rowToLogEntry(row: any): TagLogEntry {
  return {
    id: row.id,
    tagId: row.tag_id,
    tagName: row.tag_name,
    amount: row.amount ?? null,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

// ─── Realtime skip flag ───────────────────────────────────────────────────────

let _skipNext = false;

// ─── Tags API ─────────────────────────────────────────────────────────────────

export async function loadTags(userId: string): Promise<Tag[]> {
  const { data } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order')
    .order('created_at');
  return (data ?? []).map(rowToTag);
}

// Upsert the full ordered array — used for create, edit, and reorder.
// Each tag's sort_order is set to its index in the array.
export async function saveTags(userId: string, tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  _skipNext = true;
  await supabase.from('tags').upsert(
    tags.map((t, i) => ({
      id: t.id,
      user_id: userId,
      name: t.name,
      default_amount: t.defaultAmount || null,
      auto_log: t.autoLog,
      sort_order: i,
    }))
  );
}

// Soft-delete: stamps deleted_at so the tag disappears from the UI but its
// log entries remain in the CSV export with deleted = 1.
export async function deleteTag(userId: string, tagId: string): Promise<void> {
  _skipNext = true;
  await supabase
    .from('tags')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tagId)
    .eq('user_id', userId);
}

export function subscribeTags(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`tags:${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
      () => {
        if (_skipNext) { _skipNext = false; return; }
        onChange();
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function createTag(fields: Pick<Tag, 'name' | 'defaultAmount' | 'autoLog'>): Tag {
  return {
    id: Date.now().toString(),
    sortOrder: 0, // overwritten by saveTags based on array index
    createdAt: new Date().toISOString(),
    ...fields,
  };
}

// ─── Log API ──────────────────────────────────────────────────────────────────

export async function logTagEntry(
  userId: string,
  tagId: string,
  tagName: string,
  amount: string | null,
  loggedAt: string,
): Promise<void> {
  await supabase.from('tag_log').insert({
    user_id: userId,
    tag_id: tagId,
    tag_name: tagName,
    amount: amount || null,
    logged_at: loggedAt,
  });
}

export async function loadTagLog(userId: string): Promise<TagLogEntry[]> {
  const { data } = await supabase
    .from('tag_log')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at');
  return (data ?? []).map(rowToLogEntry);
}

// Returns a map of tagId → deletedAt for all tags (including soft-deleted),
// used to annotate the CSV export with the deleted column.
export async function loadAllTagsMap(userId: string): Promise<Map<string, string | null>> {
  const { data } = await supabase
    .from('tags')
    .select('id, deleted_at')
    .eq('user_id', userId);
  const map = new Map<string, string | null>();
  for (const row of data ?? []) {
    map.set(row.id, row.deleted_at ?? null);
  }
  return map;
}

// Check if an auto-log entry already exists for a tag on today's local date.
// Uses local-midnight boundaries converted to UTC so the query is correct
// regardless of the device's timezone offset.
export async function hasAutoLogToday(userId: string, tagId: string): Promise<boolean> {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const { data } = await supabase
    .from('tag_log')
    .select('id')
    .eq('user_id', userId)
    .eq('tag_id', tagId)
    .gte('logged_at', dayStart.toISOString())
    .lte('logged_at', dayEnd.toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

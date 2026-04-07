import { supabase } from '../lib/supabase';

export interface HomeData {
  tarotUri: string | null;
  intentions: {
    work: string;
    life: string;
    creative: string;
  };
}

const DEFAULT: HomeData = {
  tarotUri: null,
  intentions: { work: '', life: '', creative: '' },
};

let _skipNext = false;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadHome(userId: string): Promise<HomeData> {
  const { data } = await supabase
    .from('home')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return DEFAULT;
  return {
    tarotUri: data.tarot_url ?? null,
    intentions: {
      work: data.intention_work ?? '',
      life: data.intention_life ?? '',
      creative: data.intention_creative ?? '',
    },
  };
}

export async function saveHome(userId: string, data: HomeData): Promise<void> {
  _skipNext = true;
  await supabase.from('home').upsert({
    user_id: userId,
    tarot_url: data.tarotUri,
    intention_work: data.intentions.work,
    intention_life: data.intentions.life,
    intention_creative: data.intentions.creative,
  });
}

export async function uploadTarot(userId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${userId}/tarot.jpg`;
  const { error } = await supabase.storage
    .from('tarot')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('tarot').getPublicUrl(path);
  return data.publicUrl;
}

export function subscribeHome(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`home:${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'home', filter: `user_id=eq.${userId}` },
      () => {
        if (_skipNext) { _skipNext = false; return; }
        onChange();
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

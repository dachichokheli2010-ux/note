import { createClient } from '@supabase/supabase-js';
import type { Note } from '../model';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, tags, content, updated_at, archived')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(note => ({
    id: note.id,
    title: note.title,
    tags: Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    content: note.content,
    updatedAt: note.updated_at,
    archived: note.archived,
  }));
}

export async function saveUserNotes(userId: string, notes: Note[], previousNotes: Note[]): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const previousById = new Map(previousNotes.map(note => [note.id, note]));
  const nextById = new Map(notes.map(note => [note.id, note]));
  const changedNotes = notes.filter(note => JSON.stringify(note) !== JSON.stringify(previousById.get(note.id)));
  const removedIds = previousNotes.filter(note => !nextById.has(note.id)).map(note => note.id);

  if (changedNotes.length) {
    const { error } = await supabase.from('notes').upsert(changedNotes.map(note => ({
      id: note.id,
      user_id: userId,
      title: note.title,
      tags: note.tags,
      content: note.content,
      updated_at: note.updatedAt,
      archived: note.archived,
    })));
    if (error) throw error;
  }

  if (removedIds.length) {
    const { error } = await supabase.from('notes').delete().eq('user_id', userId).in('id', removedIds);
    if (error) throw error;
  }
}

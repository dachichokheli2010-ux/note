import { createClient } from '@supabase/supabase-js';
import { toPreferences } from '../model';
import type { Note, NoteVersion, Preferences } from '../model';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function toTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];
}

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const { data, error } = await client()
    .from('notes')
    .select('id, title, tags, content, updated_at, archived, favorite, last_opened_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(note => ({
    id: note.id,
    title: note.title,
    tags: toTags(note.tags),
    content: note.content,
    updatedAt: note.updated_at,
    archived: note.archived,
    favorite: note.favorite,
    lastOpenedAt: note.last_opened_at || '',
  }));
}

export async function saveUserNotes(userId: string, notes: Note[], previousNotes: Note[]): Promise<void> {
  const db = client();
  const previousById = new Map(previousNotes.map(note => [note.id, note]));
  const nextById = new Map(notes.map(note => [note.id, note]));
  const changedNotes = notes.filter(note => JSON.stringify(note) !== JSON.stringify(previousById.get(note.id)));
  const removedIds = previousNotes.filter(note => !nextById.has(note.id)).map(note => note.id);

  if (changedNotes.length) {
    const { error } = await db.from('notes').upsert(changedNotes.map(note => ({
      id: note.id,
      user_id: userId,
      title: note.title,
      tags: note.tags,
      content: note.content,
      updated_at: note.updatedAt,
      archived: note.archived,
      favorite: note.favorite,
      last_opened_at: note.lastOpenedAt || null,
    })));
    if (error) throw error;
  }

  if (removedIds.length) {
    const { error } = await db.from('notes').delete().eq('user_id', userId).in('id', removedIds);
    if (error) throw error;
    const { error: versionsError } = await db.from('note_versions').delete().eq('user_id', userId).in('note_id', removedIds);
    if (versionsError) throw versionsError;
  }
}

export async function fetchNoteVersions(userId: string, noteId: string): Promise<NoteVersion[]> {
  const { data, error } = await client()
    .from('note_versions')
    .select('id, note_id, title, tags, content, saved_at')
    .eq('user_id', userId)
    .eq('note_id', noteId)
    .order('saved_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.map(version => ({
    id: version.id,
    noteId: version.note_id,
    title: version.title,
    tags: toTags(version.tags),
    content: version.content,
    savedAt: version.saved_at,
  }));
}

export async function insertNoteVersion(userId: string, version: NoteVersion): Promise<void> {
  const { error } = await client().from('note_versions').insert({
    id: version.id,
    user_id: userId,
    note_id: version.noteId,
    title: version.title,
    tags: version.tags,
    content: version.content,
    saved_at: version.savedAt,
  });
  if (error) throw error;
}

export async function fetchUserPreferences(userId: string): Promise<Preferences | null> {
  const { data, error } = await client()
    .from('user_preferences')
    .select('theme, font, font_size')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPreferences({ theme: data.theme, font: data.font, fontSize: data.font_size }) : null;
}

export async function saveUserPreferences(userId: string, preferences: Preferences): Promise<void> {
  const { error } = await client().from('user_preferences').upsert({
    user_id: userId,
    theme: preferences.theme,
    font: preferences.font,
    font_size: preferences.fontSize,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

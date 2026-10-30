import { seedNotes } from './seed';

export interface Note {
  id: string;
  title: string;
  tags: string[];
  content: string;
  updatedAt: string;
  archived: boolean;
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  font: 'sans' | 'serif' | 'mono';
}

const NOTES_STORAGE_KEY = 'note-taking.notes.v1';
const PREFERENCES_STORAGE_KEY = 'note-taking.preferences.v1';
const defaultPreferences: Preferences = { theme: 'light', font: 'sans' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNote(value: unknown): value is Note {
  return isRecord(value)
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.title === 'string'
    && Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === 'string')
    && typeof value.content === 'string'
    && typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))
    && typeof value.archived === 'boolean';
}

function isNotes(value: unknown): value is Note[] {
  return Array.isArray(value)
    && value.every(isNote)
    && new Set(value.map((note) => note.id)).size === value.length;
}

function isPreferences(value: unknown): value is Preferences {
  return isRecord(value)
    && (value.theme === 'light' || value.theme === 'dark' || value.theme === 'system')
    && (value.font === 'sans' || value.font === 'serif' || value.font === 'mono');
}

function freshSeed(): Note[] {
  return seedNotes.map((note) => ({ ...note, tags: [...note.tags] }));
}

export function loadNotes(): Note[] {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(NOTES_STORAGE_KEY) : null;
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (isNotes(parsed)) return parsed;
    }
  } catch {
    // Storage may be blocked by the browser, or a previous value may be malformed.
  }
  return freshSeed();
}

export function saveNotes(notes: Note[]): boolean {
  try {
    if (typeof window === 'undefined' || !isNotes(notes)) return false;
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function loadPreferences(): Preferences {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PREFERENCES_STORAGE_KEY) : null;
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (isPreferences(parsed)) return parsed;
    }
  } catch {
    // The interface still works with defaults when persistent storage is unavailable.
  }
  return { ...defaultPreferences };
}

export function savePreferences(preferences: Preferences): boolean {
  try {
    if (typeof window === 'undefined' || !isPreferences(preferences)) return false;
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(',').map((tag) => tag.trim()).filter((tag) => {
    const normalized = tag.toLocaleLowerCase('en');
    if (!tag || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

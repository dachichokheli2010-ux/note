import { seedNotes } from './seed';

export interface Note {
  id: string;
  title: string;
  tags: string[];
  content: string;
  updatedAt: string;
  archived: boolean;
  favorite: boolean;
  lastOpenedAt: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  tags: string[];
  content: string;
  savedAt: string;
}

export type FontTheme = 'sans' | 'serif' | 'mono' | 'rounded' | 'slab' | 'legible';
export type FontSize = 'small' | 'medium' | 'large';

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  font: FontTheme;
  fontSize: FontSize;
}

export const FONT_THEMES: FontTheme[] = ['sans', 'serif', 'mono', 'rounded', 'slab', 'legible'];
export const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];
export const RECENT_LIMIT = 10;
const VERSIONS_PER_NOTE = 20;

const NOTES_STORAGE_KEY = 'note-taking.notes.v1';
const VERSIONS_STORAGE_KEY = 'note-taking.versions.v1';
const PREFERENCES_STORAGE_KEY = 'note-taking.preferences.v1';
export const defaultPreferences: Preferences = { theme: 'light', font: 'sans', fontSize: 'medium' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

// Older saved notes lack favorite/lastOpenedAt, so missing values fall back to defaults.
function toNote(value: unknown): Note | null {
  if (!isRecord(value)
    || typeof value.id !== 'string' || !value.id
    || typeof value.title !== 'string'
    || !isStringArray(value.tags)
    || typeof value.content !== 'string'
    || !isDate(value.updatedAt)
    || typeof value.archived !== 'boolean') return null;
  return {
    id: value.id,
    title: value.title,
    tags: value.tags,
    content: value.content,
    updatedAt: value.updatedAt,
    archived: value.archived,
    favorite: value.favorite === true,
    lastOpenedAt: isDate(value.lastOpenedAt) ? value.lastOpenedAt : '',
  };
}

function toVersion(value: unknown): NoteVersion | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.noteId !== 'string'
    || typeof value.title !== 'string'
    || !isStringArray(value.tags)
    || typeof value.content !== 'string'
    || !isDate(value.savedAt)) return null;
  return { id: value.id, noteId: value.noteId, title: value.title, tags: value.tags, content: value.content, savedAt: value.savedAt };
}

export function toPreferences(value: unknown): Preferences | null {
  if (!isRecord(value)) return null;
  if (value.theme !== 'light' && value.theme !== 'dark' && value.theme !== 'system') return null;
  if (!FONT_THEMES.includes(value.font as FontTheme)) return null;
  const fontSize = FONT_SIZES.includes(value.fontSize as FontSize) ? value.fontSize as FontSize : 'medium';
  return { theme: value.theme, font: value.font as FontTheme, fontSize };
}

function freshSeed(): Note[] {
  return seedNotes.map((note) => ({ ...note, tags: [...note.tags], favorite: false, lastOpenedAt: '' }));
}

function readStorage(key: string): unknown {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return stored === null ? null : JSON.parse(stored);
  } catch {
    // Storage may be blocked by the browser, or a previous value may be malformed.
    return null;
  }
}

function writeStorage(key: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadNotes(): Note[] {
  const parsed = readStorage(NOTES_STORAGE_KEY);
  if (Array.isArray(parsed)) {
    const notes = parsed.map(toNote);
    if (notes.every((note): note is Note => note !== null) && new Set(notes.map((note) => note.id)).size === notes.length) return notes;
  }
  return freshSeed();
}

export function saveNotes(notes: Note[]): boolean {
  return writeStorage(NOTES_STORAGE_KEY, notes);
}

export function loadVersions(): NoteVersion[] {
  const parsed = readStorage(VERSIONS_STORAGE_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(toVersion).filter((version): version is NoteVersion => version !== null);
}

export function saveVersions(versions: NoteVersion[]): boolean {
  return writeStorage(VERSIONS_STORAGE_KEY, versions);
}

// Keeps the newest versions for each note so local storage stays small.
export function trimVersions(versions: NoteVersion[]): NoteVersion[] {
  const counts = new Map<string, number>();
  return [...versions].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).filter((version) => {
    const count = (counts.get(version.noteId) || 0) + 1;
    counts.set(version.noteId, count);
    return count <= VERSIONS_PER_NOTE;
  });
}

export function loadPreferences(): Preferences {
  return toPreferences(readStorage(PREFERENCES_STORAGE_KEY)) || { ...defaultPreferences };
}

export function savePreferences(preferences: Preferences): boolean {
  return writeStorage(PREFERENCES_STORAGE_KEY, preferences);
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

const CHECKLIST_LINE = /^(\s*)- \[( |x|X)\] (.*)$/;

export interface ChecklistItem {
  line: number;
  text: string;
  checked: boolean;
}

export function getChecklist(content: string): ChecklistItem[] {
  return content.split('\n').flatMap((text, line) => {
    const match = CHECKLIST_LINE.exec(text);
    return match ? [{ line, text: match[3], checked: match[2] !== ' ' }] : [];
  });
}

export function toggleChecklistLine(content: string, line: number): string {
  const lines = content.split('\n');
  const match = CHECKLIST_LINE.exec(lines[line] ?? '');
  if (!match) return content;
  lines[line] = `${match[1]}- [${match[2] === ' ' ? 'x' : ' '}] ${match[3]}`;
  return lines.join('\n');
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

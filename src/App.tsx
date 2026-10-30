import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Archive, ArrowLeft, ChevronRight, CircleCheck, Clock3, FileText,
  Home, Info, Lock, LogOut, Monitor, Moon, Plus, RotateCcw, Search, Settings,
  Sun, Tag, Trash2, Type, X,
} from 'lucide-react';
import {
  formatDate, loadNotes, loadPreferences, parseTags, saveNotes, savePreferences,
} from './model';
import type { Note, Preferences } from './model';
import type { Session } from '@supabase/supabase-js';
import AuthScreen, { MIN_PASSWORD_LENGTH } from './components/AuthScreen';
import Brand from './components/Brand';
import PasswordField from './components/PasswordField';
import { fetchUserNotes, saveUserNotes, supabase, supabaseConfigured } from './lib/supabase';

type View = 'all' | 'archive' | 'tag' | 'settings' | 'tags';
type Draft = Omit<Note, 'tags'> & { tags: string };
type ModalState = { kind: 'archive' | 'delete' | 'discard'; run: () => void };
type SettingsTab = 'theme' | 'font' | 'password' | 'about';
type PasswordForm = { current: string; next: string; confirm: string };
type ToastState = { message: string; destination?: 'archive' | 'all' };

function toDraft(note: Note | undefined): Draft | null {
  return note ? { ...note, tags: note.tags.join(', ') } : null;
}

function Confirmation({ modal, close }: { modal: ModalState; close: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const copy = {
    archive: ['Archive Note', 'Are you sure you want to archive this note? You can find it in the Archived Notes section and restore it anytime.', 'Archive Note'],
    delete: ['Delete Note', 'Are you sure you want to permanently delete this note? This action cannot be undone.', 'Delete Note'],
    discard: ['Discard changes?', 'You have unsaved changes. Are you sure you want to discard them?', 'Discard Changes'],
  }[modal.kind];
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [close]);
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" ref={dialogRef}>
      <div className="modal-heading">
        <div className="modal-icon">{modal.kind === 'archive' ? <Archive size={24} /> : modal.kind === 'delete' ? <Trash2 size={24} /> : <FileText size={24} />}</div>
        <div><h2 id="dialog-title">{copy[0]}</h2><p id="dialog-description">{copy[1]}</p></div>
      </div>
      <div className="modal-footer">
        <button className="button button-secondary" ref={cancelRef} onClick={close}>Cancel</button>
        <button className={`button ${modal.kind === 'delete' ? 'button-danger' : 'button-primary'}`} onClick={() => { close(); modal.run(); }}>{copy[2]}</button>
      </div>
    </div>
  </div>;
}

export default function App() {
  const [notes, setNotes] = useState(loadNotes);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [view, setView] = useState<View>('all');
  const [activeTag, setActiveTag] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(() => toDraft(notes.find(note => !note.archived)));
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [notesStorageError, setNotesStorageError] = useState(false);
  const [preferencesStorageError, setPreferencesStorageError] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('theme');
  const [pendingPreferences, setPendingPreferences] = useState<Preferences>(preferences);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState('');
  const [cloudLoading, setCloudLoading] = useState(supabaseConfigured);
  const [cloudError, setCloudError] = useState('');
  const [cloudLoadError, setCloudLoadError] = useState('');
  const [cloudRetry, setCloudRetry] = useState(0);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [passwordBusy, setPasswordBusy] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const savedNote = draft ? notes.find(note => note.id === draft.id) : undefined;
  const isNew = Boolean(draft && !savedNote);
  const dirty = Boolean(draft && (savedNote
    ? draft.title !== savedNote.title || draft.tags !== savedNote.tags.join(', ') || draft.content !== savedNote.content
    : draft.title || draft.tags || draft.content));
  const tags = [...new Set(notes.flatMap(note => note.tags))].sort((a, b) => a.localeCompare(b));
  const normalizedQuery = query.trim().toLocaleLowerCase();

  function getVisibleNotes(source: Note[] = notes, currentView = view, currentTag = activeTag, currentQuery = normalizedQuery) {
    return source.filter(note => {
      if (currentView === 'archive' ? !note.archived : note.archived) return false;
      if (currentView === 'tag' && !note.tags.includes(currentTag)) return false;
      return !currentQuery || `${note.title} ${note.content} ${note.tags.join(' ')}`.toLocaleLowerCase().includes(currentQuery);
    }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  const filteredNotes = getVisibleNotes();

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
        setSession(nextSession);
        setAuthLoading(false);
        setAuthError('');
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      else setSession(data.session);
      setAuthLoading(false);
    }).catch(error => {
      if (!active) return;
      setAuthError(error instanceof Error ? error.message : 'Could not check your sign-in status.');
      setAuthLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !session) {
      setCloudLoading(false);
      return;
    }
    let active = true;
    setCloudLoading(true);
    setCloudLoadError('');
    setNotes([]);
    setDraft(null);
    void fetchUserNotes(session.user.id).then(userNotes => {
      if (!active) return;
      setCloudError('');
      setNotes(userNotes);
      setDraft(toDraft(userNotes.find(note => !note.archived)));
      saveNotes(userNotes);
    }).catch(error => {
      if (active) setCloudLoadError(error instanceof Error ? error.message : 'Could not load your cloud notes.');
    }).finally(() => {
      if (active) setCloudLoading(false);
    });
    return () => { active = false; };
  }, [session?.user.id, cloudRetry]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.font = preferences.font;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e121b' : '#ffffff');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    const fitTitle = () => {
      element.style.height = '0px';
      element.style.height = `${element.scrollHeight}px`;
    };
    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [draft?.title, mobileView, view, preferences.font]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || notesStorageError) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, notesStorageError]);

  function guard(action: () => void) {
    if (dirty) setModal({ kind: 'discard', run: action });
    else action();
  }

  function commitNotes(next: Note[]) {
    setNotes(next);
    const persisted = saveNotes(next);
    setNotesStorageError(!persisted);
    if (session && supabaseConfigured) {
      void saveUserNotes(session.user.id, next, notes).then(() => setCloudError('')).catch(error => {
        setCloudError(error instanceof Error ? error.message : 'Could not sync your notes to Supabase.');
      });
    }
    return persisted;
  }

  function signOut() {
    guard(() => {
      if (!supabase) return;
      void supabase.auth.signOut().then(({ error }) => {
        if (error) setAuthError(error.message);
      }).catch(error => {
        setAuthError(error instanceof Error ? error.message : 'Could not sign out.');
      });
    });
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user.email) return;
    const errors: typeof passwordErrors = {};
    if (!passwordForm.current) errors.current = 'Please enter your old password.';
    if (passwordForm.next.length < MIN_PASSWORD_LENGTH) errors.next = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (passwordForm.confirm !== passwordForm.next) errors.confirm = 'Passwords do not match.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;
    setPasswordBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: passwordForm.current });
      if (verifyError) { setPasswordErrors({ current: 'Your old password is incorrect.' }); return; }
      const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
      if (error) { setPasswordErrors({ next: error.message }); return; }
      setPasswordForm({ current: '', next: '', confirm: '' });
      setToast({ message: 'Password changed successfully!' });
    } catch (error) {
      setPasswordErrors({ next: error instanceof Error ? error.message : 'Could not change your password.' });
    } finally {
      setPasswordBusy(false);
    }
  }

  function selectNote(note: Note) {
    if (draft?.id === note.id) { setMobileView('editor'); return; }
    guard(() => { setDraft(toDraft(note)); setValidationError(''); setMobileView('editor'); });
  }

  function navigate(nextView: View, tag = '') {
    guard(() => {
      setView(nextView);
      setActiveTag(tag);
      setQuery('');
      setValidationError('');
      setMobileView('list');
      if (nextView === 'settings' || nextView === 'tags') {
        if (nextView === 'settings') setPendingPreferences(preferences);
        setDraft(toDraft(savedNote));
      } else {
        const next = getVisibleNotes(notes, nextView, tag)[0];
        setDraft(toDraft(next));
      }
    });
  }

  function createNote() {
    guard(() => {
      setView('all'); setQuery(''); setActiveTag('');
      setDraft({ id: crypto.randomUUID(), title: '', tags: '', content: '', updatedAt: '', archived: false });
      setMobileView('editor'); setValidationError('');
      window.setTimeout(() => titleRef.current?.focus(), 0);
    });
  }

  function updateSearch(value: string) {
    const nextView = view === 'settings' || view === 'tags' ? 'all' : view;
    const term = value.trim().toLocaleLowerCase();
    const matches = getVisibleNotes(notes, nextView, activeTag, term);
    if (nextView !== view) { setView(nextView); setMobileView('list'); }
    setQuery(value);
    if (!dirty) {
      setDraft(toDraft(matches.find(note => note.id === draft?.id) || matches[0]));
      setValidationError('');
    }
  }

  function saveNote(event?: FormEvent) {
    event?.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      setValidationError('Please give your note a title.');
      titleRef.current?.focus();
      return;
    }
    const note: Note = { ...draft, title: draft.title.trim(), tags: parseTags(draft.tags), updatedAt: new Date().toISOString() };
    const persisted = commitNotes([note, ...notes.filter(item => item.id !== note.id)]);
    setDraft(toDraft(note)); setValidationError('');
    setToast({ message: persisted ? 'Note saved successfully!' : 'Note updated in this tab. Browser storage is unavailable.' });
  }

  function cancelEdit() {
    guard(() => {
      const next = savedNote || getVisibleNotes().find(note => note.id !== draft?.id) || getVisibleNotes()[0];
      setDraft(toDraft(next));
      setValidationError(''); setMobileView('list');
    });
  }

  function requestArchive() {
    if (!savedNote) return;
    const note = savedNote;
    guard(() => setModal({ kind: 'archive', run: () => {
      const updated = notes.map(item => item.id === note.id ? { ...item, archived: true } : item);
      commitNotes(updated);
      const next = getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase()).find(item => item.id !== note.id) || getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase())[0];
      setDraft(toDraft(next));
      setMobileView('list');
      setToast({ message: 'Note archived.', destination: 'archive' });
    } }));
  }

  function restoreNote() {
    if (!savedNote) return;
    const note = savedNote;
    guard(() => {
      const updated = notes.map(item => item.id === note.id ? { ...item, archived: false } : item);
      commitNotes(updated);
      const next = getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase()).find(item => item.id !== note.id) || getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase())[0];
      setDraft(toDraft(next));
      setMobileView('list');
      setToast({ message: 'Note restored to All Notes.', destination: 'all' });
    });
  }

  function requestDelete() {
    if (!savedNote) return;
    const note = savedNote;
    guard(() => setModal({ kind: 'delete', run: () => {
      const updated = notes.filter(item => item.id !== note.id);
      commitNotes(updated);
      const next = getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase()).find(item => item.id !== note.id) || getVisibleNotes(updated, view, activeTag, query.trim().toLocaleLowerCase())[0];
      setDraft(toDraft(next));
      setMobileView('list');
      setToast({ message: 'Note permanently deleted.' });
    } }));
  }

  function applyPreferences() {
    setPreferences(pendingPreferences);
    const persisted = savePreferences(pendingPreferences);
    setPreferencesStorageError(!persisted);
    setToast({ message: persisted ? 'Settings updated successfully!' : 'Settings applied for this session.' });
  }

  const settingsLabels: Record<SettingsTab, string> = { theme: 'Color Theme', font: 'Font Theme', password: 'Change Password', about: 'About Notes' };
  const settingsIcons: Record<SettingsTab, ReactNode> = { theme: <Sun size={20} />, font: <Type size={20} />, password: <Lock size={20} />, about: <Info size={20} /> };
  const title = view === 'settings' ? 'Settings' : view === 'archive' ? 'Archived Notes' : view === 'tags' ? 'Tags' : query ? 'Search' : view === 'tag' ? `Notes Tagged: ${activeTag}` : 'All Notes';
  const showNotes = view !== 'settings' && view !== 'tags';

  function tagNavigation(mobile = false) {
    return <div className={mobile ? 'mobile-tags-panel' : 'tag-navigation'}>
      {tags.map(tag => <button key={tag} className={`nav-item${view === 'tag' && activeTag === tag ? ' is-active' : ''}`} aria-label={`Open notes tagged ${tag}`} onClick={() => navigate('tag', tag)}>
        <Tag size={20} aria-hidden="true" /><span>{tag}</span>{view === 'tag' && activeTag === tag && <ChevronRight size={18} className="nav-chevron" />}
      </button>)}
      {!tags.length && <p className="list-empty">Tags will appear here when you add them to a note.</p>}
    </div>;
  }

  function settingOption<T extends string>(value: T, selected: T, icon: ReactNode, label: string, description: string, onChange: (value: T) => void) {
    return <button key={value} className={`option-card${selected === value ? ' is-selected' : ''}`} role="radio" aria-checked={selected === value} tabIndex={selected === value ? 0 : -1} onClick={() => onChange(value)} onKeyDown={event => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const options = [...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
      const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (options.indexOf(event.currentTarget) + direction + options.length) % options.length;
      options[index].focus(); options[index].click();
    }}>
      <span className="option-icon">{icon}</span>
      <span className="option-copy"><span className="option-title">{label}</span><span className="option-description">{description}</span></span>
      <span className="radio-dot">{selected === value && <span />}</span>
    </button>;
  }

  if (supabaseConfigured && authLoading) return <main className="auth-page"><p>Checking your account…</p></main>;
  if (supabaseConfigured && passwordRecovery) return <AuthScreen initialMode="reset" onPasswordReset={() => { setPasswordRecovery(false); setToast({ message: 'Password reset successfully!' }); }} />;
  if (supabaseConfigured && !session) return <><AuthScreen />{authError && <p className="auth-global-error" role="alert">{authError}</p>}</>;
  if (supabaseConfigured && cloudLoading) return <main className="auth-page"><p>Loading your notes…</p></main>;
  if (supabaseConfigured && cloudLoadError) return <main className="auth-page"><section className="auth-card">
    <p className="auth-error" role="alert">Could not load your cloud notes: {cloudLoadError}</p>
    <button className="button button-primary" onClick={() => setCloudRetry(value => value + 1)}>Retry loading</button>
    <button className="button button-secondary" onClick={signOut}>Sign out</button>
  </section></main>;

  return <div className="app-shell" data-mobile-view={mobileView} data-view={view} data-section={query ? 'search' : undefined}>
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <nav className="sidebar-navigation">
        <button className={`nav-item${view === 'all' ? ' is-active' : ''}`} aria-label="Open all notes" onClick={() => navigate('all')}><Home size={20} /><span>All Notes</span>{view === 'all' && <ChevronRight size={18} className="nav-chevron" />}</button>
        <button className={`nav-item${view === 'archive' ? ' is-active' : ''}`} aria-label="Open archived notes" onClick={() => navigate('archive')}><Archive size={20} /><span>Archived Notes</span>{view === 'archive' && <ChevronRight size={18} className="nav-chevron" />}</button>
      </nav>
      <div className="sidebar-divider" />
      <p className="tags-heading">Tags</p>
      {tagNavigation()}
    </aside>

    <header className="workspace-header">
      <Brand mobile />
      <h1 className="workspace-title">{view === 'tag' && !query ? <><span className="title-muted">Notes Tagged: </span>{activeTag}</> : title}</h1>
      <div className="header-tools">
        <label className="search-field"><Search size={20} aria-hidden="true" /><span className="sr-only">Search notes</span>
          <input ref={searchRef} type="search" placeholder="Search by title, content, or tags..." value={query} onChange={event => updateSearch(event.target.value)} />
          {query && <button className="clear-search" aria-label="Clear search" onClick={() => updateSearch('')}><X size={16} /></button>}
        </label>
        <button className={`settings-button${view === 'settings' ? ' is-active' : ''}`} aria-label="Open settings" onClick={() => navigate('settings')}><Settings size={24} /></button>
      </div>
    </header>

    {showNotes && <>
      <section className="notes-panel" aria-label="Notes list">
        <button className="button button-primary button-create" onClick={createNote}><Plus size={20} />Create New Note</button>
        {view === 'archive' && <p className="search-description">All your archived notes are stored here. You can restore or delete them anytime.</p>}
        {view === 'tag' && <p className="search-description">All notes with the <strong>{activeTag}</strong> tag are shown here.</p>}
        {query && <p className="search-description">{filteredNotes.length} {filteredNotes.length === 1 ? 'result' : 'results'} for “{query}”</p>}
        <div className="notes-scroll">
          {isNew && draft && <button className="note-card is-selected" onClick={() => setMobileView('editor')}><span className="note-card-title">{draft.title || 'Untitled Note'}</span><span className="note-card-date">Not yet saved</span></button>}
          {filteredNotes.map(note => <button key={note.id} className={`note-card${draft?.id === note.id ? ' is-selected' : ''}`} onClick={() => selectNote(note)} aria-current={draft?.id === note.id ? 'true' : undefined}>
            <span className="note-card-title">{note.title}</span>
            <span className="note-card-tags">{note.tags.map(tag => <span className="tag-chip" key={tag}>{tag}</span>)}</span>
            <span className="note-card-date">{formatDate(note.updatedAt)}</span>
          </button>)}
          {!filteredNotes.length && !isNew && <div className="list-empty"><FileText className="list-empty-icon" size={28} />
            <p>{query ? 'No notes found. Try a different search.' : view === 'archive' ? 'No archived notes yet.' : view === 'tag' ? 'No notes with this tag.' : 'You don’t have any notes yet. Start a new note to capture your thoughts and ideas.'}</p>
          </div>}
        </div>
      </section>

      <main className="editor-panel" aria-label="Note editor">
        {draft ? <form className="editor-content" onSubmit={saveNote}>
          <div className="editor-mobile-toolbar">
            <button type="button" className="toolbar-back" onClick={cancelEdit}><ArrowLeft size={18} />Go Back</button>
            <div className="toolbar-actions">
              {savedNote && <><button type="button" aria-label="Delete note" onClick={requestDelete}><Trash2 size={20} /></button><button type="button" aria-label={savedNote.archived ? 'Restore note' : 'Archive note'} onClick={savedNote.archived ? restoreNote : requestArchive}>{savedNote.archived ? <RotateCcw size={20} /> : <Archive size={20} />}</button></>}
              <button type="button" onClick={cancelEdit}>Cancel</button><button type="submit" className="toolbar-save mobile-save">Save Note</button>
            </div>
          </div>
          <label className="sr-only" htmlFor="note-title">Note title</label>
          <textarea ref={titleRef} id="note-title" className="title-input" rows={1} placeholder="Enter a title..." value={draft.title} maxLength={200} onChange={event => { setDraft({ ...draft, title: event.target.value.replace(/[\r\n]/g, ' ') }); setValidationError(''); }} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'title-error' : undefined} />
          {validationError && <p className="validation-error" id="title-error" role="alert">{validationError}</p>}
          <div className="editor-meta">
            <div className="meta-row"><label className="meta-label" htmlFor="note-tags"><Tag size={16} />Tags</label><input className="tags-input meta-value" id="note-tags" placeholder="Add tags separated by commas" value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} /></div>
            <div className="meta-row"><span className="meta-label"><Clock3 size={16} />Last edited</span><span className="meta-value">{draft.updatedAt ? formatDate(draft.updatedAt) : 'Not yet saved'}</span></div>
            {draft.archived && <div className="meta-row"><span className="meta-label"><Archive size={16} />Status</span><span className="meta-value">Archived</span></div>}
          </div>
          <div className="editor-divider" />
          <label className="sr-only" htmlFor="note-content">Note content</label>
          <textarea className="note-body" id="note-content" placeholder="Start typing your note here..." value={draft.content} onChange={event => setDraft({ ...draft, content: event.target.value })} spellCheck="false" />
          <div className="editor-footer"><button className="button button-primary" type="submit">Save Note</button><button className="button button-secondary" type="button" onClick={cancelEdit}>Cancel</button>{dirty && <span className="unsaved-indicator">Unsaved changes</span>}</div>
        </form> : <div className="empty-editor"><FileText size={40} /><h2>{query ? 'Find your next idea' : 'A place for your thoughts'}</h2><p>{query ? 'Select a result to read or edit your note.' : 'Select a note to get started, or create something new.'}</p><button className="button button-primary" onClick={createNote}><Plus size={18} />Create New Note</button></div>}
      </main>

      <aside className="actions-panel" aria-label="Note actions">
        {savedNote && <div className="actions-stack"><button className="button button-outline action-button" onClick={savedNote.archived ? restoreNote : requestArchive}>{savedNote.archived ? <RotateCcw size={20} /> : <Archive size={20} />}{savedNote.archived ? 'Restore Note' : 'Archive Note'}</button><button className="button button-outline action-button" onClick={requestDelete}><Trash2 size={20} />Delete Note</button></div>}
      </aside>
    </>}

    {view === 'tags' && <main className="mobile-tags-page">{tagNavigation(true)}</main>}

    {view === 'settings' && <main className="settings-panel">
      <nav className="settings-sidebar" aria-label="Settings categories">
        {(['theme', 'font', session ? 'password' : 'about'] as const).map(tab => <button key={tab} className={`settings-nav-item${settingsTab === tab ? ' is-active' : ''}`} onClick={() => setSettingsTab(tab)}>{settingsIcons[tab]}<span>{settingsLabels[tab]}</span>{settingsTab === tab && <ChevronRight className="nav-chevron" size={18} />}</button>)}
        {session && <><div className="sidebar-divider settings-divider" /><button className="settings-nav-item" onClick={signOut}><LogOut size={20} /><span>Logout</span></button></>}
      </nav>
      <section className="settings-content">
        <h2 className="settings-heading">{settingsLabels[settingsTab]}</h2>
        {settingsTab !== 'password' && <p className="settings-description">{settingsTab === 'theme' ? 'Choose your color theme:' : settingsTab === 'font' ? 'Choose your font theme:' : 'A little space for everything on your mind.'}</p>}
        {settingsTab === 'theme' && <div className="setting-options" role="radiogroup" aria-label="Color theme">
          {settingOption('light', pendingPreferences.theme, <Sun size={24} />, 'Light Mode', 'Pick a clean and classic light theme.', theme => setPendingPreferences({ ...pendingPreferences, theme }))}
          {settingOption('dark', pendingPreferences.theme, <Moon size={24} />, 'Dark Mode', 'Select a sleek and modern dark theme.', theme => setPendingPreferences({ ...pendingPreferences, theme }))}
          {settingOption('system', pendingPreferences.theme, <Monitor size={24} />, 'System', 'Adapts to your device’s theme.', theme => setPendingPreferences({ ...pendingPreferences, theme }))}
        </div>}
        {settingsTab === 'font' && <div className="setting-options" role="radiogroup" aria-label="Font theme">
          {settingOption('sans', pendingPreferences.font, <span className="font-preview font-sans">Aa</span>, 'Sans-serif', 'Clean and modern, easy to read.', font => setPendingPreferences({ ...pendingPreferences, font }))}
          {settingOption('serif', pendingPreferences.font, <span className="font-preview font-serif">Aa</span>, 'Serif', 'Classic and elegant for a timeless feel.', font => setPendingPreferences({ ...pendingPreferences, font }))}
          {settingOption('mono', pendingPreferences.font, <span className="font-preview font-mono">Aa</span>, 'Monospace', 'Code-like, great for a technical vibe.', font => setPendingPreferences({ ...pendingPreferences, font }))}
        </div>}
        {settingsTab === 'password' && <form className="password-form" onSubmit={changePassword} noValidate>
          <PasswordField id="old-password" label="Old Password" value={passwordForm.current} onChange={current => setPasswordForm({ ...passwordForm, current })} autoComplete="current-password" error={passwordErrors.current} />
          <PasswordField id="new-password" label="New Password" value={passwordForm.next} onChange={next => setPasswordForm({ ...passwordForm, next })} autoComplete="new-password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`} error={passwordErrors.next} />
          <PasswordField id="confirm-password" label="Confirm New Password" value={passwordForm.confirm} onChange={confirm => setPasswordForm({ ...passwordForm, confirm })} autoComplete="new-password" error={passwordErrors.confirm} />
          <div className="settings-actions"><button className="button button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Saving…' : 'Save Password'}</button></div>
        </form>}
        {settingsTab === 'password' ? null : settingsTab !== 'about' ? <div className="settings-actions"><button className="button button-primary" onClick={applyPreferences}>Apply Changes</button></div> : <div className="about-card"><Brand /><p>Create notes, add tags, and find the details you need with search.</p><p>{session ? 'Your notes are stored in your Supabase account and sync across devices.' : 'Your notes and preferences are saved in this browser. Use the same browser and device to come back to them.'}</p></div>}
      </section>
    </main>}

    <nav className="mobile-nav" aria-label="Main navigation">
      <button className={`mobile-nav-item${view === 'all' ? ' is-active' : ''}`} onClick={() => navigate('all')}><Home size={22} /><span>Home</span></button>
      <button className={`mobile-nav-item${query ? ' is-active' : ''}`} onClick={() => { if (view === 'settings' || view === 'tags') navigate('all'); setMobileView('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }}><Search size={22} /><span>Search</span></button>
      <button className={`mobile-nav-item${view === 'archive' ? ' is-active' : ''}`} onClick={() => navigate('archive')}><Archive size={22} /><span>Archived</span></button>
      <button className={`mobile-nav-item${view === 'tag' || view === 'tags' ? ' is-active' : ''}`} onClick={() => navigate('tags')}><Tag size={22} /><span>Tags</span></button>
      <button className={`mobile-nav-item${view === 'settings' ? ' is-active' : ''}`} onClick={() => navigate('settings')}><Settings size={22} /><span>Settings</span></button>
    </nav>

    {(notesStorageError || preferencesStorageError) && <div className="storage-warning" role="alert">{notesStorageError ? 'Your browser couldn’t save your notes. Keep this tab open to preserve them.' : 'Your browser couldn’t save your settings. They may reset when you reload.'}</div>}
    {cloudError && <div className="storage-warning cloud-warning" role="alert">Cloud sync issue: {cloudError}</div>}
    {modal && <Confirmation modal={modal} close={() => setModal(null)} />}
    {toast && !modal && <div className="toast" role="status"><CircleCheck className="toast-icon" size={20} /><span className="toast-message">{toast.message}</span>{toast.destination && <button className="toast-action" aria-label={`View ${toast.destination === 'archive' ? 'archived notes' : 'all notes'} list`} onClick={() => { navigate(toast.destination!); setToast(null); }}>View {toast.destination === 'archive' ? 'Archived Notes' : 'All Notes'}</button>}<button className="toast-close" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={18} /></button></div>}
    <span className="sr-only" aria-live="polite">{dirty ? 'You have unsaved changes.' : ''}</span>
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import { formatDateTime } from '../model';
import type { NoteVersion } from '../model';

interface HistoryDialogProps {
  noteTitle: string;
  loadVersions: () => Promise<NoteVersion[]>;
  onRestore: (version: NoteVersion) => void;
  close: () => void;
}

export default function HistoryDialog({ noteTitle, loadVersions, onRestore, close }: HistoryDialogProps) {
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    loadVersions().then(result => {
      if (!active) return;
      setVersions(result);
      setSelectedId(result[0]?.id || '');
    }).catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load version history.');
    });
    return () => { active = false; };
  }, [loadVersions]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [close]);

  const selected = versions?.find(version => version.id === selectedId);

  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div className="modal-heading">
        <div className="modal-icon"><History size={24} /></div>
        <div><h2 id="history-title">Version History</h2><p>Earlier saved versions of “{noteTitle}”. Restoring loads a version into the editor so you can review it before saving.</p></div>
      </div>
      <button className="modal-close" ref={closeRef} aria-label="Close version history" onClick={close}><X /></button>
      <div className="history-body">
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!error && versions === null && <p className="history-empty">Loading versions…</p>}
        {versions?.length === 0 && <p className="history-empty">No earlier versions yet. A version is kept each time you save changes to this note.</p>}
        {!!versions?.length && <>
          <ul className="history-list">
            {versions.map(version => <li key={version.id}>
              <button className={`history-item${version.id === selectedId ? ' is-selected' : ''}`} onClick={() => setSelectedId(version.id)}>
                <span className="history-item-date">{formatDateTime(version.savedAt)}</span>
                <span className="history-item-title">{version.title || 'Untitled Note'}</span>
              </button>
            </li>)}
          </ul>
          {selected && <div className="history-preview">
            <h3>{selected.title}</h3>
            {!!selected.tags.length && <div className="note-card-tags">{selected.tags.map(tag => <span className="tag-chip" key={tag}>{tag}</span>)}</div>}
            <pre>{selected.content || 'This version had no content.'}</pre>
          </div>}
        </>}
      </div>
      <div className="modal-footer">
        <button className="button button-secondary" onClick={close}>Close</button>
        <button className="button button-primary" disabled={!selected} onClick={() => { if (selected) { onRestore(selected); close(); } }}><RotateCcw size={18} />Restore Version</button>
      </div>
    </div>
  </div>;
}

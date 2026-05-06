import React, { useState, useEffect, useRef } from 'react';

/**
 * IssueModal — bottom sheet for reporting a job issue.
 *
 * Props:
 *   job       object   — the job being reported
 *   onSubmit  fn(note) — called with the note text; should be async
 *   onClose   fn       — called on cancel or backdrop tap
 */
export default function IssueModal({ job, onSubmit, onClose }) {
  const [note, setNote]       = useState('');
  const [busy, setBusy]       = useState(false);
  const textareaRef           = useRef(null);

  // Focus textarea when sheet opens
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await onSubmit(note.trim());
    setBusy(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1000,
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position:     'fixed',
        bottom:       0,
        left:         0,
        right:        0,
        zIndex:       1001,
        background:   '#fff',
        borderRadius: '16px 16px 0 0',
        padding:      '20px 20px 32px',
        boxShadow:    '0 -4px 24px rgba(0,0,0,0.12)',
        maxHeight:    '80vh',
        overflowY:    'auto',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, background: '#d1d5db',
          borderRadius: 99, margin: '0 auto 20px',
        }} />

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Report Issue
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Job #{job.id} · {job.item_name || job.sku || '—'}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe the issue…"
          rows={4}
          style={{
            width:        '100%',
            padding:      '12px 14px',
            fontSize:     15,
            lineHeight:   1.5,
            border:       '1px solid #d1d5db',
            borderRadius: 10,
            resize:       'none',
            outline:      'none',
            boxSizing:    'border-box',
            fontFamily:   'inherit',
            color:        '#111827',
          }}
          onFocus={e => (e.target.style.borderColor = '#f59e0b')}
          onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1, padding: '13px 0', fontSize: 15, fontWeight: 600,
              background: '#f1f5f9', color: '#374151',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              minHeight: 48, touchAction: 'manipulation',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !note.trim()}
            style={{
              flex: 2, padding: '13px 0', fontSize: 15, fontWeight: 600,
              background: busy || !note.trim() ? '#fde68a' : '#f59e0b',
              color: '#fff',
              border: 'none', borderRadius: 10,
              cursor: busy || !note.trim() ? 'not-allowed' : 'pointer',
              minHeight: 48, touchAction: 'manipulation',
              transition: 'background 0.15s',
            }}
          >
            {busy ? 'Submitting…' : '⚑ Submit Issue'}
          </button>
        </div>
      </div>
    </>
  );
}

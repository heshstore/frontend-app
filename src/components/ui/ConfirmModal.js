import React, { useState, useCallback } from 'react';

const overlay = {
  position: 'fixed', inset: 0, zIndex: 10000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)', padding: 16,
};
const card = {
  background: '#fff', borderRadius: 12, padding: '24px 24px 20px',
  maxWidth: 420, width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
};
const btnRow = { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 };
const btnBase = { padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' };

// ── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={overlay} onClick={onCancel}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: message ? 8 : 0 }}>{title}</div>
        {message && <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</div>}
        <div style={btnRow}>
          <button onClick={onCancel}  style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btnBase, background: danger ? '#dc2626' : '#2563eb', color: '#fff' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PromptModal ──────────────────────────────────────────────────────────────

function PromptModal({ open, title, message, placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState('');
  if (!open) return null;
  const submit = () => { if (value.trim()) { onConfirm(value.trim()); setValue(''); } };
  const cancel = () => { setValue(''); onCancel(); };
  return (
    <div style={overlay}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: message ? 8 : 14 }}>{title}</div>
        {message && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>{message}</div>}
        <textarea
          autoFocus
          rows={3}
          placeholder={placeholder || ''}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
        <div style={btnRow}>
          <button onClick={cancel} style={{ ...btnBase, background: '#f3f4f6', color: '#374151' }}>Cancel</button>
          <button onClick={submit} disabled={!value.trim()} style={{ ...btnBase, background: '#2563eb', color: '#fff', opacity: value.trim() ? 1 : 0.5 }}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', danger: false, resolve: null });

  const confirm = useCallback((title, message = '', opts = {}) => new Promise(resolve => {
    setState({ open: true, title, message, confirmLabel: opts.confirmLabel ?? 'Confirm', danger: opts.danger ?? false, resolve });
  }), []);

  const handleConfirm = useCallback(() => {
    setState(s => { s.resolve?.(true); return { ...s, open: false, resolve: null }; });
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => { s.resolve?.(false); return { ...s, open: false, resolve: null }; });
  }, []);

  const modal = (
    <ConfirmModal
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [confirm, modal];
}

export function usePromptModal() {
  const [state, setState] = useState({ open: false, title: '', message: '', placeholder: '', resolve: null });

  const prompt = useCallback((title, message = '', placeholder = '') => new Promise(resolve => {
    setState({ open: true, title, message, placeholder, resolve });
  }), []);

  const handleConfirm = useCallback((value) => {
    setState(s => { s.resolve?.(value); return { ...s, open: false, resolve: null }; });
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => { s.resolve?.(null); return { ...s, open: false, resolve: null }; });
  }, []);

  const modal = (
    <PromptModal
      open={state.open}
      title={state.title}
      message={state.message}
      placeholder={state.placeholder}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [prompt, modal];
}

import React, { useState, useEffect } from 'react';
import { toast as toastEmitter } from '../../utils/toast';

function ensureAnimation() {
  if (document.getElementById('toast-anim')) return;
  const s = document.createElement('style');
  s.id = 'toast-anim';
  s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateY(14px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}`;
  document.head.appendChild(s);
}

const STYLE = {
  success: { border: '#16a34a', bg: '#f0fdf4', icon: '✓', iconColor: '#16a34a' },
  error:   { border: '#dc2626', bg: '#fff1f2', icon: '✕', iconColor: '#dc2626' },
  warn:    { border: '#d97706', bg: '#fffbeb', icon: '⚠', iconColor: '#d97706' },
  info:    { border: '#2563eb', bg: '#eff6ff', icon: 'ℹ', iconColor: '#2563eb' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    ensureAnimation();
    return toastEmitter._subscribe((t) => {
      setToasts(prev => [...prev.slice(-4), t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration);
    });
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 16, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 'min(360px, calc(100vw - 32px))', pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = STYLE[t.type] || STYLE.info;
        return (
          <div key={t.id} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderLeft: `4px solid ${s.border}`,
            borderRadius: 8,
            padding: '10px 12px 10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
            animation: 'toastIn 0.22s ease-out both',
          }}>
            <span style={{ color: s.iconColor, fontWeight: 700, fontSize: 15, lineHeight: '1.35', flexShrink: 0, marginTop: 1 }}>
              {s.icon}
            </span>
            <span style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5, wordBreak: 'break-word', flex: 1 }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              title="Dismiss"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0,
                flexShrink: 0, marginTop: -2, marginLeft: 2,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { toast as toastEmitter } from '../../utils/toast';

const STYLE = {
  success: { border: '#16a34a', bg: '#f0fdf4', icon: '✓' },
  error:   { border: '#dc2626', bg: '#fff1f2', icon: '✕' },
  warn:    { border: '#d97706', bg: '#fffbeb', icon: '⚠' },
  info:    { border: '#2563eb', bg: '#eff6ff', icon: 'ℹ' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toastEmitter._subscribe((t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration);
    });
  }, []);

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
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
          }}>
            <span style={{ color: s.border, fontWeight: 700, fontSize: 15, lineHeight: '1.3', flexShrink: 0 }}>
              {s.icon}
            </span>
            <span style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.45, wordBreak: 'break-word' }}>
              {t.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}

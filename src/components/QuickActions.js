import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { icon: '📋', label: 'Create order',      path: '/order',         key: 'O', color: '#6366f1' },
  { icon: '📄', label: 'Create quotation',  path: '/quotation',     key: 'Q', color: '#0891b2' },
  { icon: '👤', label: 'Add customer',      path: '/add-customer',  key: 'C', color: '#16a34a' },
  { icon: '📦', label: 'Add service item',  path: '/add-item',      key: 'I', color: '#d97706' },
  { icon: '🎯', label: 'Add lead',          path: '/crm/leads/new', key: 'L', color: '#dc2626' },
  { icon: '🔗', label: 'Shopify items',     path: '/shopify-items', key: 'S', color: '#059669' },
];

function ensureAnimation() {
  if (document.getElementById('qa-anim')) return;
  const s = document.createElement('style');
  s.id = 'qa-anim';
  s.textContent = `@keyframes qaIn{from{opacity:0;transform:translateY(-12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`;
  document.head.appendChild(s);
}

export default function QuickActions() {
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const close = useCallback(() => { setOpen(false); setActive(0); }, []);

  const go = useCallback((path) => { navigate(path); close(); }, [navigate, close]);

  useEffect(() => {
    ensureAnimation();
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setActive(0);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape')    { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % ACTIONS.length); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => (a - 1 + ACTIONS.length) % ACTIONS.length); }
      if (e.key === 'Enter')     { go(ACTIONS[active].path); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, active, close, go]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 50000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'max(80px, 12vh)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          width: 'min(480px, calc(100vw - 32px))',
          overflow: 'hidden',
          animation: 'qaIn 0.18s ease-out both',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Quick actions
          </div>
          <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>
            ↑↓ navigate · Enter select · Esc close
          </div>
        </div>

        {/* Actions list */}
        <div style={{ padding: '8px 8px 8px' }}>
          {ACTIONS.map((action, i) => (
            <div
              key={action.key}
              onClick={() => go(action.path)}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: active === i ? '#f0f4ff' : 'transparent',
                transition: 'background 0.08s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: action.color + '1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {action.icon}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>
                {action.label}
              </span>
              <kbd style={{
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                background: active === i ? '#e8eeff' : '#f3f4f6',
                color: '#6b7280', border: '1px solid #e5e7eb', fontFamily: 'monospace',
              }}>
                {action.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 6, alignItems: 'center' }}>
          <kbd style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>⌘K</kbd>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>open anywhere · click outside or Esc to close</span>
        </div>
      </div>
    </div>
  );
}

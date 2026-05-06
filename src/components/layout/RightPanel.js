import React, { createContext, useContext, useEffect, useState } from 'react';

const RightPanelCtx = createContext(null);

export function RightPanelProvider({ children, isMobile = false }) {
  const [panel, setPanel] = useState({ open: false, content: null, title: '' });

  const openPanel  = (title, content) => setPanel({ open: true, title, content });
  const closePanel = () => setPanel(p => ({ ...p, open: false }));

  useEffect(() => {
    document.body.style.overflow = panel.open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panel.open]);

  return (
    <RightPanelCtx.Provider value={{ panel, openPanel, closePanel, isMobile }}>
      {children}
    </RightPanelCtx.Provider>
  );
}

export function useRightPanel() {
  return useContext(RightPanelCtx);
}

function PanelHeader({ title, onClose, backLabel }) {
  return (
    <div style={{
      padding: '14px 16px',
      flexShrink: 0,
      borderBottom: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff',
    }}>
      <button
        onClick={onClose}
        style={{
          background: '#f1f5f9', border: 'none', borderRadius: 6,
          padding: '5px 10px', fontSize: 13, cursor: 'pointer', color: '#374151',
          fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        {backLabel}
      </button>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111827' }}>
        {title}
      </span>
    </div>
  );
}

export default function RightPanel() {
  const { panel, closePanel, isMobile } = useRightPanel();

  // Render nothing when closed — no stacking context, no overlay, no z-index issues
  if (!panel.open) return null;

  // ── Mobile: full-screen overlay ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          height: '100dvh',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          animation: 'rpSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxSizing: 'border-box',
        }}>
          <PanelHeader title={panel.title} onClose={closePanel} backLabel="← Back" />
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 16px 24px',
          }}>
            {panel.content}
          </div>
        </div>

        <style>{`
          @keyframes rpSlideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // ── Desktop: backdrop + slide-in panel ──────────────────────────────────────
  // Both only exist when panel.open === true (component returns null otherwise)
  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        onClick={closePanel}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.18)',
          animation: 'rpFadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 360, zIndex: 41,
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          animation: 'rpSlideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <PanelHeader title={panel.title} onClose={closePanel} backLabel="✕" />
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {panel.content}
        </div>
      </div>

      <style>{`
        @keyframes rpFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rpSlideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

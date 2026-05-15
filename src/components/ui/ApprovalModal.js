import React, { useState, useEffect } from 'react';
import { theme } from '../../theme';

const inp = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
};
const lbl = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: theme.textMuted,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export default function ApprovalModal({ order, onConfirm, onClose, initialValues }) {
  const [advanceAmount,        setAdvanceAmount]        = useState(
    initialValues?.advance_amount != null && Number(initialValues.advance_amount) > 0
      ? String(Number(initialValues.advance_amount))
      : '',
  );
  const [processWithoutAdvance, setProcessWithoutAdvance] = useState(
    initialValues?.process_without_advance ?? false,
  );
  const [notes,                setNotes]                = useState(
    initialValues?.remarks ?? '',
  );
  const [submitting,           setSubmitting]           = useState(false);

  // Inject keyframe once
  useEffect(() => {
    if (document.getElementById('approval-modal-anim')) return;
    const style = document.createElement('style');
    style.id = 'approval-modal-anim';
    style.textContent = '@keyframes aModalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);
  }, []);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        advance_amount:         Number(advanceAmount) || 0,
        process_without_advance: processWithoutAdvance,
        remarks: notes.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const total = Number(order.total_amount || 0);
  const advance = Number(advanceAmount) || 0;
  const pending = Math.max(0, total - advance);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'aModalIn 0.18s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Send for Approval</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              {order.order_no || order.order_number || `Order #${order.id}`} · ₹{total.toLocaleString('en-IN')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: theme.textMuted, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Advance amount */}
          <div>
            <label style={lbl}>Advance Received (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              style={inp}
              autoFocus
            />
            {advance > 0 && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Pending after advance: <strong style={{ color: '#111827' }}>₹{pending.toLocaleString('en-IN')}</strong>
              </div>
            )}
          </div>

          {/* Process without advance */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setProcessWithoutAdvance(v => !v)}
              style={{
                width: 20, height: 20, borderRadius: 5, border: `2px solid ${processWithoutAdvance ? theme.primary : theme.border}`,
                background: processWithoutAdvance ? theme.primary : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer',
              }}
            >
              {processWithoutAdvance && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, color: '#374151' }}>Process without advance payment</span>
          </label>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="Any instructions for production or approval team…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 8, background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{ flex: 2, padding: '11px', borderRadius: 8, background: submitting ? '#93c5fd' : theme.primary, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
          >
            {submitting ? 'Sending…' : 'Send for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

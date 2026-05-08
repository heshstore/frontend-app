import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Shared input/select/textarea styles ──────────────────────────── */

export const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 14,
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  height: 38,
  fontFamily: 'inherit',
};

export const readonlyInputStyle = {
  ...inputStyle,
  background: '#f9fafb',
  color: '#6b7280',
  cursor: 'default',
};

export const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

export const textareaStyle = {
  ...inputStyle,
  height: 'auto',
  minHeight: 80,
  resize: 'vertical',
  lineHeight: 1.5,
};

/* ── FormSection ──────────────────────────────────────────────────── */

export function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {title && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: '#9ca3af',
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid #f3f4f6',
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── FormCard ─────────────────────────────────────────────────────── */

export function FormCard({ children, style }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      padding: '18px 20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── FormGrid ─────────────────────────────────────────────────────── */
/* Uses auto-fit so it naturally collapses on narrow screens.         */

export function FormGrid({ cols = 2, minColWidth = 200, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(${minColWidth}px, 1fr))`,
      gap: '12px 16px',
    }}>
      {children}
    </div>
  );
}

/* ── FormField ────────────────────────────────────────────────────── */

export function FormField({ label, required, help, children, colSpan, style }) {
  return (
    <div style={{ gridColumn: colSpan ? `span ${colSpan}` : undefined, ...style }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: '#374151',
          marginBottom: 5,
          lineHeight: 1.3,
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {help && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{help}</div>
      )}
    </div>
  );
}

/* ── FormActions ──────────────────────────────────────────────────── */

export function FormActions({
  onCancel,
  saveLabel  = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
}) {
  const navigate = useNavigate();
  const handleCancel = onCancel || (() => navigate(-1));

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      paddingTop: 20,
      borderTop: '1px solid #f3f4f6',
      marginTop: 24,
    }}>
      <button
        type="button"
        onClick={handleCancel}
        style={{
          padding: '9px 20px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          background: '#fff',
          color: '#374151',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={loading || disabled}
        style={{
          padding: '9px 24px',
          border: 'none',
          borderRadius: 6,
          background: (loading || disabled) ? '#93c5fd' : '#2563eb',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
          minWidth: 100,
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

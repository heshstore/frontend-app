import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

const MODES = [
  { value: 'cash', label: 'Cash',        icon: '💵' },
  { value: 'upi',  label: 'UPI',         icon: '📱' },
  { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  });

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', fontSize: 16,
  border: '1px solid #d1d5db', borderRadius: 10,
  outline: 'none', fontFamily: 'inherit', color: '#111827',
  boxSizing: 'border-box',
};

export default function PaymentForm() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { orderId: paramOrderId } = useParams();

  const stateOrder = location.state?.order;
  const orderId    = stateOrder?.id ?? Number(paramOrderId);

  // Always fetch fresh order data — stale navigation state causes pending=0
  // which permanently disables the submit button after a page refresh.
  const [liveOrder, setLiveOrder]   = useState(stateOrder ?? null);
  const [loadingOrder, setLoadingOrder] = useState(!stateOrder);

  useEffect(() => {
    if (!orderId) return;
    apiFetch(`/orders/${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLiveOrder(data); })
      .catch(() => {})
      .finally(() => setLoadingOrder(false));
  }, [orderId]);

  const order   = liveOrder;
  const pending = Number(order?.pending_amount ?? 0);

  const [amount, setAmount]         = useState('');
  const [mode, setMode]             = useState('');
  const [reference, setRef]         = useState('');
  const [refTouched, setRefTouched] = useState(false);
  const [notes, setNotes]           = useState('');
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState(null);

  // Stable key for the lifetime of this form — prevents cash payment duplicates on network retry.
  // Falls back to a timestamp+random string when crypto.randomUUID is unavailable (HTTP origins).
  const idempotencyKey = useRef(
    typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const amountNum       = Number(amount);
  const needsRef        = mode === 'upi' || mode === 'bank';
  const referenceValid  = !needsRef || reference.trim().length > 0;
  const isValid         = amountNum > 0 && amountNum <= pending && mode && referenceValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch('/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          order_id:          orderId,
          amount:            amountNum,
          payment_mode:      mode,
          payment_reference: reference.trim() || undefined,
          idempotency_key:   idempotencyKey.current,
          notes:             notes.trim()     || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Payment failed');
      navigate(`/accounts/history/${orderId}`, {
        replace: true,
        state: { order: data.order_id ? undefined : order },
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8,
            padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44,
          }}
        >← Back</button>
        <h3 style={{ margin: 0, fontSize: 17 }}>Add Payment</h3>
      </div>

      {/* Order context card */}
      {order && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1d4ed8', marginBottom: 2 }}>
            {order.order_no || `ORD-${order.id}`}
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
            {order.customer_name}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span>Total: <b>{inr(order.total_amount)}</b></span>
            <span style={{ color: '#15803d' }}>Paid: <b>{inr(order.paid_amount)}</b></span>
            <span style={{ color: '#dc2626' }}>Pending: <b>{inr(order.pending_amount)}</b></span>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fff1f0', border: '1px solid #fca5a5',
          borderRadius: 10, padding: 14, marginBottom: 16, color: '#dc2626', fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Amount */}
        <Field label={`Amount (₹)${pending > 0 ? ` — max ${inr(pending)}` : ''}`}>
          <input
            type="number"
            style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="1"
            max={pending || undefined}
            step="0.01"
            required
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
          />
          {amountNum > 0 && pending > 0 && amountNum > pending && (
            <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>
              Exceeds outstanding balance of {inr(pending)}
            </p>
          )}
        </Field>

        {/* Payment mode — tile selector */}
        <Field label="Payment Mode *">
          <div style={{ display: 'flex', gap: 8 }}>
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => { setMode(m.value); setRef(''); setRefTouched(false); }}
                style={{
                  flex: 1, padding: '16px 8px', fontSize: 13, fontWeight: 600,
                  border: `2px solid ${mode === m.value ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: 10, cursor: 'pointer', minHeight: 72,
                  background: mode === m.value ? '#eff6ff' : '#fff',
                  color: mode === m.value ? '#2563eb' : '#374151',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Reference — required for UPI / Bank */}
        {needsRef && (
          <Field label={`${mode === 'upi' ? 'UPI Reference / UTR' : 'Transaction / Reference No.'} *`}>
            <input
              style={{
                ...inputStyle,
                borderColor: refTouched && !reference.trim() ? '#f87171' : '#d1d5db',
              }}
              type="text"
              value={reference}
              onChange={e => setRef(e.target.value)}
              placeholder={mode === 'upi' ? '12-digit UPI ref…' : 'NEFT/RTGS ref…'}
              required
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => {
                setRefTouched(true);
                e.target.style.borderColor = reference.trim() ? '#d1d5db' : '#f87171';
              }}
            />
            {refTouched && !reference.trim() && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>
                Reference number is required for {mode.toUpperCase()} payments
              </p>
            )}
          </Field>
        )}

        {/* Notes */}
        <Field label="Notes (optional)">
          <textarea
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Advance, partial payment…"
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
          />
        </Field>

        <button
          type="submit"
          disabled={busy || loadingOrder || !isValid}
          style={{
            width: '100%', padding: '15px 0', fontSize: 16, fontWeight: 700,
            background: busy || loadingOrder || !isValid ? '#d1d5db' : '#16a34a',
            color: busy || loadingOrder || !isValid ? '#9ca3af' : '#fff',
            border: 'none', borderRadius: 10, cursor: busy || loadingOrder || !isValid ? 'not-allowed' : 'pointer',
            minHeight: 54, transition: 'background 0.15s',
          }}
        >
          {loadingOrder ? 'Loading…' : busy ? 'Recording…' : '✓ Record Payment'}
        </button>
      </form>
    </div>
  );
}

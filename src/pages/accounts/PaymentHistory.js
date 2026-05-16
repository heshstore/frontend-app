import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

const MODE_LABEL = { cash: 'Cash', upi: 'UPI', bank: 'Bank Transfer' };
const MODE_COLOR = { cash: '#15803d', upi: '#7c3aed', bank: '#1d4ed8' };

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  });

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PaymentHistory() {
  const navigate  = useNavigate();
  const { orderId } = useParams();
  const location  = useLocation();
  const order     = location.state?.order;

  const [payments, setPayments] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        apiFetch(`/payments/order/${orderId}`),
        apiFetch(`/payments/outstanding`),
      ]);

      if (!pRes.ok) throw new Error('Failed');
      const pData = await pRes.json();
      setPayments(Array.isArray(pData) ? pData : []);

      // Find this order in outstanding list for live totals
      if (sRes.ok) {
        const outstanding = await sRes.json();
        const match = Array.isArray(outstanding)
          ? outstanding.find(o => String(o.id) === String(orderId))
          : null;
        setSummary(match);
      }

      setError(null);
    } catch {
      setError('Could not load payment history.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const btn = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8,
    padding: '10px 16px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', minHeight: 44, touchAction: 'manipulation',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={btn('#f1f5f9', '#374151')}>← Back</button>
        <h3 style={{ margin: 0, flex: 1, fontSize: 17 }}>Payment History</h3>
        <button onClick={load} style={btn('#f1f5f9', '#374151')}>↻</button>
      </div>

      {/* Order summary */}
      {(order || summary) && (() => {
        const o = summary || order;
        return (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 2 }}>
              {o.order_no || `ORD-${o.id}`}
            </div>
            <div style={{ fontSize: 13, color: '#111827', marginBottom: 10 }}>
              {o.customer_name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total',   value: inr(o.total_amount),   color: '#374151' },
                { label: 'Paid',    value: inr(o.paid_amount),    color: '#16a34a' },
                { label: 'Pending', value: inr(o.pending_amount), color: '#dc2626' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Add payment shortcut */}
      {(summary?.pending_amount > 0 || (!summary && order?.pending_amount > 0)) && (
        <button
          onClick={() => navigate(`/accounts/payment/${orderId}`, { state: { order: summary || order } })}
          style={{ ...btn('#2563eb'), width: '100%', marginBottom: 16 }}
        >
          + Add Payment
        </button>
      )}

      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>Loading…</div>}
      {error && (
        <div style={{
          background: '#fff1f0', border: '1px solid #fca5a5',
          borderRadius: 10, padding: 14, marginBottom: 14, color: '#dc2626',
        }}>{error}</div>
      )}

      {!loading && payments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
          No payments recorded for this order.
        </div>
      )}

      {/* Payment records */}
      {payments.map((p, i) => (
        <div key={p.id} style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${MODE_COLOR[p.payment_mode] ?? '#374151'}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
              {inr(p.amount)}
            </span>
            <span style={{
              background: '#f1f5f9',
              color: MODE_COLOR[p.payment_mode] ?? '#374151',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            }}>
              {MODE_LABEL[p.payment_mode] ?? p.payment_mode?.toUpperCase()}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
              #{payments.length - i}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {fmtDate(p.created_at)}
            {p.received_by_name && (
              <span> · Received by <b>{p.received_by_name}</b></span>
            )}
          </div>

          {p.payment_reference && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Ref: <b style={{ color: '#374151' }}>{p.payment_reference}</b>
            </div>
          )}

          {p.notes && (
            <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 4 }}>
              {p.notes}
            </div>
          )}
        </div>
      ))}

      {/* Total paid */}
      {payments.length > 1 && (
        <div style={{
          textAlign: 'right', fontSize: 13, color: '#374151',
          fontWeight: 600, padding: '8px 4px',
        }}>
          Total recorded: <span style={{ color: '#16a34a' }}>{inr(totalPaid)}</span>
        </div>
      )}
    </div>
  );
}

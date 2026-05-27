import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import PageLayout from '../../components/layout/PageLayout';

const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 8,
  padding: '10px 16px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', minHeight: 44, touchAction: 'manipulation',
  whiteSpace: 'nowrap',
});

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  });

export default function OutstandingOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/payments/outstanding');
      if (!res.ok) throw new Error('Failed');
      setOrders(await res.json());
      setError(null);
    } catch {
      setError('Could not load outstanding orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPending = orders.reduce((s, o) => s + Number(o.pending_amount), 0);

  const refreshBtn = <button onClick={load} style={btn('#f1f5f9', '#374151')}>↻</button>;

  return (
    <PageLayout title="Outstanding Payments" onBack={() => navigate(-1)} actions={refreshBtn}>
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Summary banner */}
      {!loading && orders.length > 0 && (
        <div style={{
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#9a3412' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} pending
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
            {inr(totalPending)}
          </span>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>Loading…</div>}

      {error && (
        <div style={{
          background: '#fff1f0', border: '1px solid #fca5a5',
          borderRadius: 10, padding: 14, marginBottom: 14, color: '#dc2626',
        }}>{error}</div>
      )}

      {!loading && orders.length === 0 && (
        <div style={{
          textAlign: 'center', background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 12, padding: 40, color: '#15803d',
        }}>
          <div style={{ fontSize: 36 }}>✅</div>
          <p style={{ marginTop: 10, fontWeight: 600 }}>No outstanding payments.</p>
        </div>
      )}

      {orders.map(order => {
        const pct = Number(order.total_amount) > 0
          ? Math.min(100, (Number(order.paid_amount) / Number(order.total_amount)) * 100)
          : 0;

        return (
          <div key={order.id} style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderLeft: '4px solid #dc2626',
            borderRadius: 10, padding: '14px 16px', marginBottom: 10,
          }}>
            {/* Order / customer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                {order.order_no || `ORD-${order.id}`}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>
              {order.customer_name || '—'}
              {order.customer_phone && (
                <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                  📞 {order.customer_phone}
                </span>
              )}
            </div>

            {/* Amount grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8, marginBottom: 12,
            }}>
              {[
                { label: 'Total',   value: inr(order.total_amount),   color: '#374151' },
                { label: 'Paid',    value: inr(order.paid_amount),    color: '#16a34a' },
                { label: 'Pending', value: inr(order.pending_amount), color: '#dc2626' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6, background: '#f1f5f9', borderRadius: 99, marginBottom: 12, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: pct === 100 ? '#16a34a' : '#f59e0b',
                borderRadius: 99, transition: 'width 0.3s',
              }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate(`/accounts/payment/${order.id}`, { state: { order } })}
                style={{ ...btn('#2563eb'), flex: 1 }}
              >
                + Add Payment
              </button>
              <button
                onClick={() => navigate(`/accounts/history/${order.id}`, { state: { order } })}
                style={btn('#f1f5f9', '#374151')}
              >
                History
              </button>
            </div>
          </div>
        );
      })}
    </div>
    </PageLayout>
  );
}

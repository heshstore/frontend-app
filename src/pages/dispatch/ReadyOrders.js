import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';
import PageLayout from '../../components/layout/PageLayout';

const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 8,
  padding: '11px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', minHeight: 44, touchAction: 'manipulation',
  whiteSpace: 'nowrap',
});

function fmt(amount) {
  return Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export default function ReadyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/dispatch/ready-orders');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Could not load ready orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const headerActions = (
    <>
      <button type="button" onClick={() => navigate('/dispatch/orders')} style={btn('#e0e7ff', '#3730a3')}>Dispatch orders</button>
      <button onClick={load} style={btn('#f1f5f9', '#374151')}>↻</button>
    </>
  );

  return (
    <PageLayout title="Ready for Dispatch" onBack={() => navigate(-1)} actions={headerActions}>
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>Loading…</div>
      )}

      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #fca5a5', borderRadius: 10, padding: 14, marginBottom: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div style={{
          textAlign: 'center', background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 12, padding: 40, color: '#15803d',
        }}>
          <div style={{ fontSize: 36 }}>✅</div>
          <p style={{ marginTop: 10, fontWeight: 600 }}>No orders waiting for dispatch.</p>
        </div>
      )}

      {orders.map(order => (
        <div key={order.id} style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderLeft: '4px solid #f59e0b',
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>
              {order.order_no || `ORD${String(order.id).padStart(4, '0')}`}
            </span>
            <span style={{
              background: '#fef9c3', color: '#a16207',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            }}>
              {(order.status || 'READY').replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 4 }}>
            {order.customer_name || '—'}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 12, flexWrap: 'wrap' }}>
            {order.customer_phone && <span>📞 {order.customer_phone}</span>}
            <span>Amount: <b style={{ color: '#111827' }}>{fmt(order.total_amount)}</b></span>
            {order.due_date && (
              <span>Due: <b style={{ color: '#111827' }}>
                {new Date(order.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </b></span>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const res = await apiFetch('/dispatch/orders', {
                  method: 'POST',
                  body: JSON.stringify({ orderId: order.id }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Could not create dispatch');
                toast.success('Dispatch draft created');
                navigate(`/dispatch/orders/${data.id}`);
              } catch (e) {
                toast.error(e.message);
              }
            }}
            style={{ ...btn('#005fb8'), width: '100%', fontSize: 15, marginBottom: 8 }}
          >
            + New dispatch order (pick / pack)
          </button>

          <button
            onClick={() => navigate('/dispatch/create', { state: { order } })}
            style={{ ...btn('#f1f5f9', '#374151'), width: '100%', fontSize: 13 }}
          >
            Legacy single-step dispatch →
          </button>
        </div>
      ))}

      {/* Quick nav to dispatch list */}
      {!loading && (
        <button
          onClick={() => navigate('/dispatch/orders')}
          style={{ ...btn('#6b7280'), width: '100%', marginTop: 8 }}
        >
          All dispatch orders →
        </button>
      )}
    </div>
    </PageLayout>
  );
}

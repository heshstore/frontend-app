import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

const STATUS_STYLE = {
  PENDING:    { bg: '#f1f5f9', color: '#475569', label: 'Pending'    },
  DISPATCHED: { bg: '#eff6ff', color: '#1d4ed8', label: 'Dispatched' },
  DELIVERED:  { bg: '#dcfce7', color: '#15803d', label: 'Delivered'  },
};

const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 8,
  padding: '10px 16px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', minHeight: 44, touchAction: 'manipulation',
  whiteSpace: 'nowrap',
});

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, padding: '3px 10px',
      borderRadius: 99, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function fmt(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DispatchList() {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [marking, setMarking]       = useState(null); // dispatch id being marked

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/dispatch');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setDispatches(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Could not load dispatches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkDelivered = async (dispatch) => {
    if (!window.confirm(`Mark dispatch #${dispatch.id} as delivered?`)) return;
    setMarking(dispatch.id);
    try {
      const res = await apiFetch('/dispatch/mark-delivered', {
        method: 'POST',
        body: JSON.stringify({ dispatch_id: dispatch.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d?.message || 'Could not mark as delivered.');
      } else {
        if (d?.warning) alert(`⚠ ${d.warning}`);
        load();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setMarking(null);
    }
  };

  const pending   = dispatches.filter(d => d.dispatch_status !== 'DELIVERED');
  const delivered = dispatches.filter(d => d.dispatch_status === 'DELIVERED');

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={btn('#f1f5f9', '#374151')}>← Back</button>
        <h3 style={{ margin: 0, flex: 1, fontSize: 17 }}>All Dispatches</h3>
        <button onClick={load} style={btn('#f1f5f9', '#374151')}>↻</button>
      </div>

      {/* Quick action */}
      <button
        onClick={() => navigate('/dispatch')}
        style={{ ...btn('#16a34a'), width: '100%', marginBottom: 16, fontSize: 15 }}
      >
        + New Dispatch
      </button>

      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>Loading…</div>
      )}
      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #fca5a5', borderRadius: 10, padding: 14, marginBottom: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Active dispatches */}
      {!loading && pending.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            In Transit ({pending.length})
          </div>
          {pending.map(d => (
            <DispatchCard
              key={d.id}
              dispatch={d}
              isMarking={marking === d.id}
              onMarkDelivered={() => handleMarkDelivered(d)}
            />
          ))}
        </>
      )}

      {/* Delivered */}
      {!loading && delivered.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 10px' }}>
            Delivered ({delivered.length})
          </div>
          {delivered.map(d => (
            <DispatchCard key={d.id} dispatch={d} />
          ))}
        </>
      )}

      {!loading && dispatches.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48 }}>
          No dispatch records yet.
        </div>
      )}
    </div>
  );
}

function DispatchCard({ dispatch: d, onMarkDelivered, isMarking }) {
  const sStyle = STATUS_STYLE[d.dispatch_status] ?? STATUS_STYLE.PENDING;
  const isDone = d.dispatch_status === 'DELIVERED';

  const btnSmall = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', minHeight: 40, touchAction: 'manipulation',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${sStyle.color}`,
      borderRadius: 10, padding: '14px 16px', marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
          {d.order_no || `ORD-${d.order_id}`}
        </span>
        <StatusBadge status={d.dispatch_status} />
        {d.transport_type && (
          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99 }}>
            {d.transport_type}
          </span>
        )}
      </div>

      {/* Customer */}
      {d.customer_name && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          {d.customer_name}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280', flexWrap: 'wrap', marginBottom: isDone ? 0 : 10 }}>
        {d.tracking_number && <span>📦 {d.tracking_number}</span>}
        {d.dispatch_date   && <span>Dispatched: <b>{fmt(d.dispatch_date)}</b></span>}
        {d.delivery_date   && <span>Delivered: <b style={{ color: '#15803d' }}>{fmt(d.delivery_date)}</b></span>}
      </div>

      {d.notes && (
        <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginBottom: isDone ? 0 : 10 }}>
          {d.notes}
        </div>
      )}

      {/* Action */}
      {!isDone && onMarkDelivered && (
        <button
          onClick={onMarkDelivered}
          disabled={isMarking}
          style={btnSmall(isMarking ? '#d1d5db' : '#15803d', isMarking ? '#9ca3af' : '#fff')}
        >
          {isMarking ? 'Updating…' : '✓ Mark Delivered'}
        </button>
      )}
    </div>
  );
}

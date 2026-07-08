import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from '../../utils/toast';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ITEM_TYPE_STYLE = {
  MANUFACTURING: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Manufacturing' },
  TRADING:       { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Trading'       },
  OTHER:         { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Other'          },
};

function TypeBadge({ type }) {
  const s = ITEM_TYPE_STYLE[type] ?? ITEM_TYPE_STYLE.OTHER;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {s.label}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    PENDING:   { bg: '#fef3c7', color: '#92400e', label: 'Waiting'     },
    ASSIGNED:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Assigned'    },
    IN_WORK:   { bg: '#fff7ed', color: '#c2410c', label: 'In Work'     },
    DONE:      { bg: '#f0fdf4', color: '#15803d', label: 'Done'        },
    READY:     { bg: '#f0fdf4', color: '#15803d', label: 'Ready'       },
  };
  const s = map[status] ?? { bg: '#f1f5f9', color: '#64748b', label: status };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, departments, mode, onRefresh }) {
  const [items,        setItems]        = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [assigning,    setAssigning]    = useState({});
  const [deptPick,     setDeptPick]     = useState({});

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res  = await apiFetch(`/orders/${order.id}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error('Failed to load order items');
    } finally {
      setLoadingItems(false);
    }
  }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load items automatically — no click required
  useEffect(() => { loadItems(); }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignDept = async (item) => {
    const deptId = deptPick[item.id];
    if (!deptId) { toast.error('Select a department first'); return; }
    setAssigning(p => ({ ...p, [item.id]: true }));
    try {
      // Create / update production execution job for this item → department
      const res = await apiFetch(`/production/execution/assign`, {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, orderItemId: item.id, departmentId: Number(deptId) }),
      });
      if (res.ok) {
        toast.success('Assigned to department');
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Assignment failed');
      }
    } catch (e) {
      toast.error('Assignment failed: ' + e.message);
    } finally {
      setAssigning(p => ({ ...p, [item.id]: false }));
    }
  };

  const markReady = async (item) => {
    setAssigning(p => ({ ...p, [item.id]: true }));
    try {
      const res = await apiFetch(`/orders/${order.id}/items/${item.id}/mark-ready`, {
        method: 'PATCH',
      });
      if (res.ok) {
        toast.success('Item marked as ready');
        setItems(null); // force reload
        loadItems();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed');
      }
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setAssigning(p => ({ ...p, [item.id]: false }));
    }
  };

  const orderNo = order.order_no || order.order_number || `ORD${String(order.id).padStart(4, '0')}`;

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #7c3aed',
      borderRadius: 10,
      background: '#fff',
      marginBottom: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{orderNo}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: '#ede9fe', color: '#7c3aed',
            }}>In Production</span>
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 3, fontWeight: 600 }}>
            {order.customer_name || '—'}
            {order.customer_city && (
              <span style={{ fontWeight: 400, color: '#64748b' }}> · {order.customer_city}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Order: {fmtDate(order.order_date || order.created_at)}
            </span>
            <span style={{ fontSize: 12, color: order.delivery_date ? '#dc2626' : '#94a3b8', fontWeight: order.delivery_date ? 600 : 400 }}>
              Delivery: {fmtDate(order.delivery_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Items — always visible */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 18px' }}>
          {loadingItems && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading items…</div>
          )}

          {!loadingItems && items !== null && items.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>No items on this order.</div>
          )}

          {!loadingItems && items !== null && items.map((item) => {
            const catType = item.main_category_type || item.category_type || 'OTHER';
            const isMfg   = catType === 'MANUFACTURING';
            const isReady = item.board_status === 'READY' || item.board_status === 'DONE';

            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #f1f5f9',
                  borderRadius: 8,
                  padding: '11px 14px',
                  marginBottom: 10,
                  background: '#fafbfc',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                {/* Item info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                    <TypeBadge type={catType} />
                    {item.board_status && <StatusPill status={item.board_status} />}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {item.item_name || item.name || item.sku}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    SKU: {item.sku} &nbsp;·&nbsp; Qty: {item.qty} {item.unit || ''}
                  </div>
                </div>

                {/* Actions */}
                {mode === 'MANUAL' && !isReady && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isMfg ? (
                      <>
                        <select
                          value={deptPick[item.id] || ''}
                          onChange={e => setDeptPick(p => ({ ...p, [item.id]: e.target.value }))}
                          style={{
                            padding: '6px 10px', fontSize: 12, border: '1px solid #e2e8f0',
                            borderRadius: 6, background: '#fff', color: '#0f172a', cursor: 'pointer',
                          }}
                        >
                          <option value="">Assign department…</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignDept(item)}
                          disabled={assigning[item.id] || !deptPick[item.id]}
                          style={{
                            padding: '6px 14px', fontSize: 12, fontWeight: 700,
                            background: '#1d4ed8', color: '#fff', border: 'none',
                            borderRadius: 6, cursor: 'pointer',
                            opacity: (assigning[item.id] || !deptPick[item.id]) ? 0.5 : 1,
                          }}
                        >
                          {assigning[item.id] ? '…' : 'Assign'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => markReady(item)}
                        disabled={assigning[item.id]}
                        style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 700,
                          background: '#15803d', color: '#fff', border: 'none',
                          borderRadius: 6, cursor: 'pointer',
                          opacity: assigning[item.id] ? 0.5 : 1,
                        }}
                      >
                        {assigning[item.id] ? '…' : '✓ Mark Ready'}
                      </button>
                    )}
                  </div>
                )}

                {isReady && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#15803d',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    padding: '5px 12px', borderRadius: 6,
                  }}>
                    ✓ Ready
                  </span>
                )}
              </div>
            );
          })}

          {/* Move to Ready button if all items done */}
          {!loadingItems && items !== null && items.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={async () => {
                  const res = await apiFetch(`/orders/${order.id}/send-to-production`, { method: 'PATCH' });
                  if (res.ok) { toast.success('Order moved to Ready'); onRefresh(); }
                  else toast.error('Could not update order status');
                }}
                style={{
                  padding: '7px 18px', fontSize: 12, fontWeight: 700,
                  background: '#7c3aed', color: '#fff', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                Mark Order as Ready →
              </button>
            </div>
          )}
        </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductionBoardPage() {
  const [orders,      setOrders]      = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [mode,        setMode]        = useState('MANUAL'); // 'MANUAL' | 'AUTO' (future)
  const [search,      setSearch]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, deptRes] = await Promise.all([
        apiFetch('/orders?status=IN_PRODUCTION&limit=200'),
        apiFetch('/departments'),
      ]);
      const ordJson  = await ordRes.json();
      const deptJson = await deptRes.json();
      setOrders(Array.isArray(ordJson) ? ordJson : (ordJson?.data ?? []));
      setDepartments(Array.isArray(deptJson) ? deptJson : []);
    } catch {
      toast.error('Failed to load production board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.order_no || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  });

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            Production Board
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Central hub — assign departments, track jobs, move orders through the production pipeline.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
          height: 36,
        }}>
          {['MANUAL', 'AUTO'].map(m => (
            <button
              key={m}
              onClick={() => {
                if (m === 'AUTO') { toast.warn('Auto mode coming soon'); return; }
                setMode(m);
              }}
              title={m === 'AUTO' ? 'Coming soon' : undefined}
              style={{
                padding: '0 16px', height: '100%', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: mode === m ? '#7c3aed' : '#f8fafc',
                color: mode === m ? '#fff' : '#64748b',
                opacity: m === 'AUTO' ? 0.5 : 1,
              }}
            >
              {m === 'AUTO' ? '⚡ Auto' : '✋ Manual'}
            </button>
          ))}
        </div>

        <button
          onClick={load}
          style={{
            height: 36, padding: '0 14px', border: '1px solid #e2e8f0',
            borderRadius: 8, background: '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#374151',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'In Production', value: orders.length, color: '#7c3aed', bg: '#ede9fe' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 10, padding: '12px 20px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
        <div style={{
          background: '#fff7ed', borderRadius: 10, padding: '12px 20px',
          border: '1px dashed #fed7aa',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
            ✋ Manual Mode — You decide which department handles each item.
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search by order no / customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 14px', fontSize: 13,
            border: '1px solid #e2e8f0', borderRadius: 8,
            boxSizing: 'border-box', color: '#0f172a',
          }}
        />
      </div>

      {/* Orders */}
      {loading && (
        <div style={{ color: '#94a3b8', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
          Loading production orders…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: '#94a3b8', fontSize: 14,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏭</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#64748b', marginBottom: 6 }}>
            No orders in production
          </div>
          <div style={{ fontSize: 13 }}>
            Approve an order and click "Send to Production" to see it here.
          </div>
        </div>
      )}

      {!loading && filtered.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          departments={departments}
          mode={mode}
          onRefresh={load}
        />
      ))}
    </div>
  );
}

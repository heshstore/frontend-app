import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS } from "./constants/orderStatus";
import DocActions from "./components/DocActions";
import StatusBadge, { PricingBadge } from "./components/ui/StatusBadge";
import EmptyState from "./components/ui/EmptyState";
import { SkeletonList } from "./components/ui/SkeletonCard";
import { apiFetch } from "./utils/api";
import { useNotifications } from "./context/NotificationContext";
import { useRightPanel } from "./components/layout/RightPanel";
import OrderDetail from "./OrderDetail";
import { toast } from "./utils/toast";
import { useConfirm } from "./components/ui/ConfirmModal";

const STATUS_BORDER = {
  PENDING_APPROVAL: '#f59e0b',
  APPROVED:         '#16a34a',
  IN_PRODUCTION:    '#6366f1',
  READY:            '#0891b2',
  DISPATCHED:       '#0066B3',
  DRAFT:            '#6c757d',
};

const STATUS_CHIPS = [
  { value: '',                 label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED',         label: 'Approved' },
  { value: 'IN_PRODUCTION',    label: 'In production' },
  { value: 'READY',            label: 'Ready' },
  { value: 'DISPATCHED',       label: 'Dispatched' },
];

const FILTER_KEY = 'saachu_order_filter';

const btn = (extra = {}) => ({
  padding: '6px 13px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 5,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  border: 'none',
  ...extra,
});

export default function OrderList() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState(() => {
    try { return localStorage.getItem(FILTER_KEY) || ''; } catch { return ''; }
  });
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();
  const { dismissByEntity } = useNotifications();
  const { openPanel } = useRightPanel();
  const [confirm, confirmModal] = useConfirm();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/orders`);
      const data = await res.json();
      setOrders(
        (Array.isArray(data) ? data : []).filter(o =>
          o.status !== ORDER_STATUS.CANCELLED &&
          o.status !== ORDER_STATUS.DRAFT
        )
      );
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const setFilter = (val) => {
    setStatus(val);
    try { localStorage.setItem(FILTER_KEY, val); } catch {}
  };

  const filtered = orders.filter((o) => {
    const text = search.toLowerCase();
    const matchText =
      (o.customer_name || "").toLowerCase().includes(text) ||
      (o.mobile || "").includes(text) ||
      String(o.id).includes(text) ||
      (o.order_number || "").toLowerCase().includes(text);
    const matchStatus = !status || o.status === status;
    return matchText && matchStatus;
  });

  const handleSendForApproval = async (row) => {
    try {
      const res = await apiFetch(`/orders/${row.id}/send-for-approval`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success('Sent for approval');
      navigate('/pending-approval');
    } catch {
      toast.error('Failed to send for approval');
    }
  };

  const handleCancel = async (row) => {
    if (!await confirm('Cancel this order?', 'This cannot be undone.', { danger: true, confirmLabel: 'Cancel order' })) return;
    try {
      const res = await apiFetch(`/orders/${row.id}/cancel`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      dismissByEntity('order', row.id);
      toast.success('Order cancelled');
      loadOrders();
    } catch {
      toast.error('Cancel failed');
    }
  };

  return (
    <>
    {confirmModal}
    <div>
      {/* Page title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', flex: 1 }}>Orders</h1>
        <button
          onClick={() => navigate('/order')}
          style={btn({ background: '#2563eb', color: '#fff', padding: '8px 16px', height: 36, fontSize: 13 })}
        >
          + New order
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Search by ID / customer / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setFilter(chip.value)}
            style={{
              padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.12s',
              background: status === chip.value ? '#2563eb' : '#f3f4f6',
              color: status === chip.value ? '#fff' : '#6b7280',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonList count={5} />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📋"
          title="No orders found"
          subtitle={status ? `No ${status.toLowerCase().replace('_', ' ')} orders. Try a different filter.` : 'Create your first order to get started.'}
          actionLabel="+ New order"
          onAction={() => navigate('/order')}
        />
      )}

      {!loading && filtered.map((row) => (
        <div
          key={row.id}
          style={{
            border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${STATUS_BORDER[row.status] || '#6c757d'}`,
            borderRadius: 8,
            marginBottom: 12,
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <div
            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {row.order_number || `ORD-${String(row.id).padStart(5, '0')}`}
                <StatusBadge status={row.status} />
                {row.is_wholesaler !== undefined && <PricingBadge isWholesaler={row.is_wholesaler} />}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                {row.customer_name || '—'} · ₹{Number(row.total_amount || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : ''}
                {row.mobile ? ` · ${row.mobile}` : ''}
              </div>
            </div>
            <span style={{ fontSize: 18, color: '#9ca3af' }}>{expanded === row.id ? '▲' : '▼'}</span>
          </div>

          {/* Expanded */}
          {expanded === row.id && (
            <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                {/* Left */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openPanel(`Order #${row.order_number || row.id}`, <OrderDetail orderId={row.id} />)}
                    style={btn({ background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' })}
                  >
                    👁 View
                  </button>
                  <button
                    onClick={() => navigate(`/edit-order/${row.id}`)}
                    style={btn({ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' })}
                  >
                    ✏ Edit
                  </button>
                  {row.status === ORDER_STATUS.DRAFT && (
                    <button
                      onClick={() => handleSendForApproval(row)}
                      style={btn({ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' })}
                    >
                      ↑ Send for approval
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(row)}
                    style={btn({ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' })}
                  >
                    ✕ Cancel
                  </button>
                </div>

                {/* Right */}
                <DocActions
                  type="order"
                  id={row.id}
                  docNo={row.order_number}
                  docDate={row.created_at}
                  amount={row.total_amount}
                  customerMobile={row.mobile}
                  customerName={row.customer_name}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
    </>
  );
}

import React, { useEffect, useState } from "react";
import { apiFetch } from "./utils/api";
import { usePermission } from "./utils/usePermission";
import { toast } from "./utils/toast";
import { useConfirm, usePromptModal } from "./components/ui/ConfirmModal";
import StatusBadge from "./components/ui/StatusBadge";
import { SkeletonList } from "./components/ui/SkeletonCard";
import EmptyState from "./components/ui/EmptyState";
import { useRightPanel } from "./components/layout/RightPanel";
import OrderDetail from "./OrderDetail";

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

export default function PendingApproval() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null);

  const [pendingIds,  setPendingIds]  = useState(new Set());
  const [approvedIds, setApprovedIds] = useState(new Set());
  const [prodIds,     setProdIds]     = useState(new Set());

  const canApprove = usePermission('order.approve');
  const canReject  = usePermission('order.reject');
  const { openPanel } = useRightPanel();
  const [confirm, confirmModal]   = useConfirm();
  const [prompt,  promptModal]    = usePromptModal();

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Filter server-side for speed; the paginated wrapper is unwrapped below.
      const res  = await apiFetch('/orders?status=PENDING_APPROVAL&limit=200');
      const json = await res.json();
      setOrders(Array.isArray(json) ? json : (json?.data ?? []));
    } catch (err) {
      console.error("Error loading pending orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const approveOrder = async (row) => {
    if (pendingIds.has(row.id)) return;

    // Guard: stale data — order may have been actioned in another tab/session
    if (row.status !== 'PENDING_APPROVAL') {
      toast.warn('Order status has changed. Refreshing…');
      await loadOrders();
      return;
    }

    const label = row.order_no || row.order_number || `#${row.id}`;
    if (!await confirm(
      'Approve this order?',
      `${label} will be sent to production.`,
      { confirmLabel: 'Approve' },
    )) return;

    setPendingIds(s => new Set(s).add(row.id));
    try {
      const res = await apiFetch(`/orders/${row.id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 400 && body?.message?.includes('Invalid transition')) {
          toast.warn('Order was already processed. Refreshing list…');
          setOrders(prev => prev.filter(o => o.id !== row.id));
        } else {
          toast.error(body.message || 'Approval failed');
        }
        return;
      }
      toast.success('Order approved — click "Send to Production" to continue');
      // Keep row visible, update status locally so Send to Production button appears
      setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: 'APPROVED' } : o));
      setApprovedIds(s => new Set(s).add(row.id));
      setExpanded(row.id);
    } catch {
      toast.error('Approval failed');
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(row.id); return n; });
    }
  };

  const sendToProduction = async (row) => {
    if (prodIds.has(row.id)) return;
    setProdIds(s => new Set(s).add(row.id));
    try {
      const res = await apiFetch(`/orders/${row.id}/send-to-production`, { method: 'PATCH' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to send to production');
        return;
      }
      toast.success('Order sent to production');
      setOrders(prev => prev.filter(o => o.id !== row.id));
      setApprovedIds(s => { const n = new Set(s); n.delete(row.id); return n; });
      setExpanded(null);
    } catch {
      toast.error('Failed to send to production');
    } finally {
      setProdIds(s => { const n = new Set(s); n.delete(row.id); return n; });
    }
  };

  const rejectOrder = async (row) => {
    if (pendingIds.has(row.id)) return;
    const label = row.order_no || row.order_number || `#${row.id}`;
    const remarks = await prompt(
      'Rejection Reason',
      `Provide a reason for rejecting ${label}. The salesperson will see this.`,
      'Enter rejection reason…',
    );
    if (!remarks) return;

    setPendingIds(s => new Set(s).add(row.id));
    try {
      const res = await apiFetch(`/orders/${row.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ remarks }),
      });
      if (!res.ok) throw new Error();
      toast.success('Order rejected');
      setExpanded(null);
      await loadOrders();
    } catch {
      toast.error('Reject failed');
    } finally {
      setPendingIds(s => { const n = new Set(s); n.delete(row.id); return n; });
    }
  };

  const filtered = orders.filter((o) => {
    const text = search.toLowerCase();
    return (
      (o.order_no    || o.order_number || '').toLowerCase().includes(text) ||
      String(o.id).includes(text) ||
      (o.customer_name || '').toLowerCase().includes(text) ||
      (o.mobile || o.customer_phone || '').includes(text)
    );
  });

  return (
    <>
      {confirmModal}
      {promptModal}
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', flex: 1 }}>
            Order Approval
          </h1>
          {orders.length > 0 && (
            <span style={{
              background: '#f59e0b', color: '#fff',
              fontSize: 12, fontWeight: 700,
              padding: '3px 10px', borderRadius: 99,
            }}>
              {orders.length} waiting
            </span>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder="Search by order / customer / mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {loading && <SkeletonList count={5} />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon="⏳"
            title="No pending approvals"
            subtitle="All orders are up to date. Nothing waiting for approval."
          />
        )}

        {!loading && filtered.map((row) => (
          <div
            key={row.id}
            style={{
              border: '1px solid #e5e7eb',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 8,
              marginBottom: 12,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            {/* Card header — click to expand */}
            <div
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {row.order_no || row.order_number || `ORD${String(row.id).padStart(4, '0')}`}
                  <StatusBadge status={row.status} />
                </div>

                {/* Advance / payment details from salesperson */}
                {(Number(row.advance_amount) > 0 || row.process_without_advance || row.approval_remarks) && (
                  <div style={{
                    fontSize: 11, color: '#92400e',
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 4, padding: '4px 8px',
                    marginTop: 4, display: 'inline-flex', flexDirection: 'column', gap: 2,
                  }}>
                    {Number(row.advance_amount) > 0 && (
                      <span>Advance: ₹{Number(row.advance_amount).toLocaleString('en-IN')}</span>
                    )}
                    {row.process_without_advance && (
                      <span>Process without advance</span>
                    )}
                    {row.approval_remarks && (
                      <span>Notes: {row.approval_remarks}</span>
                    )}
                  </div>
                )}
                {/* Previous rejection reason — visible if order was rejected and re-submitted */}
                {row.rejection_reason && (
                  <div style={{
                    fontSize: 11, color: '#9f1239',
                    background: '#fff1f2', border: '1px solid #fecdd3',
                    borderRadius: 4, padding: '3px 8px',
                    marginTop: 4, display: 'inline-block',
                  }}>
                    Prev. rejection: {row.rejection_reason}
                  </div>
                )}

                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                  {row.customer_name || '—'} · ₹{Number(row.total_amount || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : ''}
                  {(row.mobile || row.customer_phone) ? ` · ${row.mobile || row.customer_phone}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 18, color: '#9ca3af' }}>{expanded === row.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded actions */}
            {expanded === row.id && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => window.open(`/orders/${row.id}/print`, '_blank')}
                      style={btn({ background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' })}
                    >
                      👁 View
                    </button>
                    {canApprove && row.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => approveOrder(row)}
                        disabled={pendingIds.has(row.id)}
                        style={btn({
                          background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                          opacity: pendingIds.has(row.id) ? 0.5 : 1,
                          cursor: pendingIds.has(row.id) ? 'not-allowed' : 'pointer',
                        })}
                      >
                        {pendingIds.has(row.id) ? '…' : '✓ Approve'}
                      </button>
                    )}
                    {row.status === 'APPROVED' && (
                      <button
                        onClick={() => sendToProduction(row)}
                        disabled={prodIds.has(row.id)}
                        style={btn({
                          background: '#7c3aed', color: '#fff',
                          opacity: prodIds.has(row.id) ? 0.6 : 1,
                          cursor: prodIds.has(row.id) ? 'not-allowed' : 'pointer',
                        })}
                      >
                        {prodIds.has(row.id) ? '…' : '🏭 Send to Production'}
                      </button>
                    )}
                    {canReject && row.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => rejectOrder(row)}
                        disabled={pendingIds.has(row.id)}
                        style={btn({
                          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                          opacity: pendingIds.has(row.id) ? 0.5 : 1,
                          cursor: pendingIds.has(row.id) ? 'not-allowed' : 'pointer',
                        })}
                      >
                        {pendingIds.has(row.id) ? '…' : '✕ Reject'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

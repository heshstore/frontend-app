import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS } from "./constants/orderStatus";
import DocActions from "./components/DocActions";
import CountBadge from "./components/CountBadge";
import { trackDocAction } from "./utils/trackDocAction";
import StatusBadge, { PricingBadge } from "./components/ui/StatusBadge";
import EmptyState from "./components/ui/EmptyState";
import { SkeletonList } from "./components/ui/SkeletonCard";
import { apiFetch } from "./utils/api";
import { useNotifications } from "./context/NotificationContext";
import { useRightPanel } from "./components/layout/RightPanel";
import OrderDetail from "./OrderDetail";
import ApprovalModal from "./components/ui/ApprovalModal";
import { toast } from "./utils/toast";
import { useConfirm } from "./components/ui/ConfirmModal";
import DocumentOwnershipPanel from "./components/ownership/DocumentOwnershipPanel";

const STATUS_BORDER = {
  DRAFT:            '#6c757d',
  GENERATED:        '#1d4ed8',
  CANCELLED:        '#dc2626',
  PENDING_APPROVAL: '#f59e0b',
  REJECTED:         '#be123c',
  APPROVED:         '#16a34a',
  IN_PRODUCTION:    '#6366f1',
  READY:            '#0891b2',
  DISPATCHED:       '#0066B3',
};

const STATUS_CHIPS = [
  { value: '',                 label: 'All' },
  { value: 'DRAFT',            label: 'Draft' },
  { value: 'GENERATED',        label: 'Generated' },
  { value: 'CANCELLED',        label: 'Cancelled' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'REJECTED',         label: 'Rejected' },
  { value: 'APPROVED',         label: 'Approved' },
  { value: 'IN_PRODUCTION',    label: 'In Production' },
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
  const [expanded,              setExpanded]              = useState(null);
  const [sendForApprovalOrder, setSendForApprovalOrder]  = useState(null); // order awaiting send-for-approval modal
  const navigate = useNavigate();
  const { dismissByEntity } = useNotifications();
  const { openPanel } = useRightPanel();
  const [confirm, confirmModal] = useConfirm();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/orders`);
      const json = await res.json();
      // API returns paginated { data: [], total, page, limit } — unwrap if needed.
      setOrders(Array.isArray(json) ? json : (json?.data ?? []));
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
      (o.order_no || "").toLowerCase().includes(text);
    const matchStatus = !status || o.status === status;
    return matchText && matchStatus;
  });

  // STEP 2: "Send For Approval" (GENERATED) — opens advance modal, submits to PENDING_APPROVAL
  const handleSendForApprovalConfirm = async ({ advance_amount, process_without_advance, advance_payment_date, advance_payment_mode, remarks }) => {
    if (!sendForApprovalOrder) return;
    try {
      const res = await apiFetch(`/orders/${sendForApprovalOrder.id}/send-for-approval`, {
        method: 'PATCH',
        body: JSON.stringify({ advance_amount, process_without_advance, advance_payment_date, advance_payment_mode, remarks: remarks || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to send for approval');
        return;
      }
      toast.success('Sent for approval');
      setSendForApprovalOrder(null);
      loadOrders();
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
    {sendForApprovalOrder && (
      <ApprovalModal
        order={sendForApprovalOrder}
        onConfirm={handleSendForApprovalConfirm}
        onClose={() => setSendForApprovalOrder(null)}
        initialValues={{
          advance_amount:         sendForApprovalOrder.advance_amount,
          process_without_advance: sendForApprovalOrder.process_without_advance,
          advance_payment_date:   sendForApprovalOrder.advance_payment_date,
          advance_payment_mode:   sendForApprovalOrder.advance_payment_mode,
          remarks:                sendForApprovalOrder.approval_remarks,
        }}
      />
    )}
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
                {row.order_no || `Ord-${String(row.id).padStart(5, '0')}`}
                <StatusBadge status={row.status} />
                {row.is_wholesaler !== undefined && <PricingBadge isWholesaler={row.is_wholesaler} />}
              </div>
              {row.quotation_no && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  From Quotation: {row.quotation_no}
                </div>
              )}
              {row.status === ORDER_STATUS.REJECTED && row.rejection_reason && (
                <div style={{ fontSize: 11, color: '#9f1239', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 4, padding: '3px 8px', marginTop: 4, display: 'inline-block' }}>
                  Rejected: {row.rejection_reason}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
                {row.customer_name || '—'} · ₹{Number(row.total_amount || 0).toLocaleString('en-IN')}
              </div>
              <DocumentOwnershipPanel data={row} docType="order" variant="list" />
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
                    onClick={() => openPanel(`Order #${row.order_no || row.id}`, <OrderDetail orderId={row.id} />)}
                    style={btn({ background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' })}
                  >
                    👁 View<CountBadge n={row.view_count} color="#374151" />
                  </button>
                  <button
                    onClick={() => { trackDocAction('order', row.id, 'edit'); navigate(`/edit-order/${row.id}`); }}
                    style={btn({ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' })}
                  >
                    ✏ Edit<CountBadge n={row.edit_count} color="#15803d" />
                  </button>
                  <button
                    onClick={() => handleCancel(row)}
                    style={btn({ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' })}
                  >
                    ✕ Cancel
                  </button>
                </div>

                {/* Right */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <DocActions
                    type="order"
                    id={row.id}
                    docNo={row.order_no}
                    docDate={row.created_at}
                    amount={row.total_amount}
                    customerMobile={row.customer_phone}
                    customerName={row.customer_name}
                    customerEmail={row.customer_email}
                    emailCount={row.email_sent_count}
                    printCount={row.print_count}
                    pdfCount={row.pdf_count}
                    whatsappCount={row.whatsapp_count}
                  />
                  {(row.status === ORDER_STATUS.GENERATED || row.status === ORDER_STATUS.REJECTED) && (
                    <button
                      onClick={() => setSendForApprovalOrder(row)}
                      style={btn({ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' })}
                    >
                      ↑ Send for Approval
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

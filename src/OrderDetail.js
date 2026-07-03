import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { normalizePhoneForWhatsApp } from './utils/phone';
import { ORDER_STATUS_LABELS } from './constants/orderStatus';
import DocActions from './components/DocActions';
import DocumentOwnershipPanel from './components/ownership/DocumentOwnershipPanel';
import { trackDocAction } from './utils/trackDocAction';

// ── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  });

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const STATUS_STYLE = {
  Draft:               { bg: '#f1f5f9', color: '#475569' },
  PENDING_APPROVAL:    { bg: '#fff7ed', color: '#c2410c' },
  APPROVED:            { bg: '#d1fae5', color: '#065f46' },
  REJECTED:            { bg: '#fee2e2', color: '#dc2626' },
  Production:          { bg: '#dbeafe', color: '#1d4ed8' },
  PRODUCTION_DONE:     { bg: '#d1fae5', color: '#065f46' },
  AWAITING_PAYMENT:    { bg: '#fef3c7', color: '#b45309' },
  PENDING_BILLING:     { bg: '#fef3c7', color: '#b45309' },
  BILLED:              { bg: '#f0fdf4', color: '#16a34a' },
  READY_FOR_DISPATCH:  { bg: '#fef9c3', color: '#a16207' },
  DISPATCHED:          { bg: '#ede9fe', color: '#6d28d9' },
  Completed:           { bg: '#dcfce7', color: '#15803d' },
  Cancelled:           { bg: '#fee2e2', color: '#dc2626' },
};

const PROD_STAGES = [
  { key: 'DESIGNING', label: 'Designing' },
  { key: 'PRINTING',  label: 'Printing'  },
  { key: 'LASER',     label: 'Laser'     },
  { key: 'ASSEMBLY',  label: 'Assembly'  },
];

const POST_PROD = [
  'PRODUCTION_DONE', 'AWAITING_PAYMENT', 'PENDING_BILLING',
  'BILLED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'Completed',
];

function stagesCompleted(status) {
  if (POST_PROD.includes(status)) return 4;
  if (status === 'Production')   return 1;
  return 0;
}

// ── Loading / Error helpers ───────────────────────────────────────────────────

function Skeleton({ h = 14, w = '100%', mb = 10 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 8, marginBottom: mb,
      background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'od-shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '4px 0' }}>
      <style>{`@keyframes od-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Skeleton h={24} w="55%" mb={6} />
      <Skeleton h={12} w="35%" mb={20} />
      <Skeleton h={90} mb={14} />
      <Skeleton h={110} mb={14} />
      <Skeleton h={90} mb={14} />
      <Skeleton h={70} />
    </div>
  );
}

function ErrorState({ message, onRetry, onBack }) {
  const btnBase = {
    border: 'none', borderRadius: 8, padding: '9px 18px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40,
  };
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 14, color: '#dc2626', marginBottom: 20 }}>{message}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {onBack && (
          <button onClick={onBack} style={{ ...btnBase, background: '#f1f5f9', color: '#374151' }}>
            ← Back
          </button>
        )}
        <button onClick={onRetry} style={{ ...btnBase, background: '#2563eb', color: '#fff' }}>
          ↻ Retry
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      padding: '18px 20px', marginBottom: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#9ca3af',
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueStyle }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderTop: '1px solid #f8fafc',
    }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', ...valueStyle }}>{value}</span>
    </div>
  );
}

function AmountRow({ label, value, color, large }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: large ? '12px 0' : '8px 0',
      borderBottom: '1px solid #f8fafc',
    }}>
      <span style={{ fontSize: large ? 14 : 13, color: '#6b7280', fontWeight: large ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: large ? 18 : 14, fontWeight: 700, color: color || '#111827' }}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, bg, color = '#fff', onClick, href, target }) {
  const style = {
    flex: 1, padding: '11px 0', border: 'none', borderRadius: 10,
    background: bg, color, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
    display: 'block', minHeight: 44,
  };
  if (href) {
    return <a href={href} target={target} rel="noreferrer" style={style}>{label}</a>;
  }
  return <button onClick={onClick} style={style}>{label}</button>;
}

// ── Main component ────────────────────────────────────────────────────────────

// orderId prop → panel mode (no sticky header)
// no orderId  → route mode (reads useParams, shows sticky header)
export default function OrderDetail({ orderId: propId }) {
  const params      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const backTo      = () => navigate(location.state?.from || '/orders');

  const id          = propId ?? params.id;
  const isPanelMode = Boolean(propId);

  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [planning, setPlanning]     = useState({ requirements: [], workloads: [] });

  const retry = () => { setOrder(null); setRetryCount(c => c + 1); };

  useEffect(() => { trackDocAction('order', id, 'view'); }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      apiFetch(`/orders/${id}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      apiFetch(`/orders/${id}/material-requirements`).then(r => r.ok ? r.json() : []).catch(() => []),
      apiFetch(`/orders/${id}/workloads`).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([orderData, requirements, workloads]) => {
        if (!cancelled) {
          setOrder(orderData);
          setPlanning({ requirements: requirements ?? [], workloads: workloads ?? [] });
        }
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, retryCount]);

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
        background: isPanelMode ? 'transparent' : '#f8fafc',
        minHeight: isPanelMode ? 'unset' : '100vh',
        padding: isPanelMode ? '4px 0' : '16px',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
        background: isPanelMode ? 'transparent' : '#f8fafc',
        minHeight: isPanelMode ? 'unset' : '100vh',
      }}>
        <ErrorState
          message="Could not load order."
          onRetry={retry}
          onBack={!isPanelMode ? backTo : null}
        />
      </div>
    );
  }

  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status || '—';
  const statusSt    = STATUS_STYLE[order.status] ?? { bg: '#f1f5f9', color: '#374151' };
  const completedN  = stagesCompleted(order.status);
  const pending     = order.pending_amount ?? (order.total_amount - (order.paid_amount || 0));
  const waPhone     = normalizePhoneForWhatsApp(order.customer_phone);

  return (
    <div style={{
      fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      background: isPanelMode ? 'transparent' : '#f8fafc',
      minHeight: isPanelMode ? 'unset' : '100vh',
    }}>

      {/* Sticky header — route mode only */}
      {!isPanelMode && (
        <div style={{
          background: '#fff', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={backTo}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              padding: '8px 12px', fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 600,
            }}
          >
            ← Back
          </button>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => navigate(`/edit-order/${id}`)}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              padding: '8px 14px', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Edit
          </button>
        </div>
      )}

      <div style={{ padding: '16px', maxWidth: 520, margin: '0 auto' }}>

        {/* Panel mode — inline edit button */}
        {isPanelMode && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={() => navigate(`/edit-order/${id}`)}
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Edit
            </button>
          </div>
        )}

        {/* Section 1 — Header */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
                Order #{order.order_number || order.id}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {fmtDate(order.order_date || order.created_at)}
              </div>
            </div>
            <span style={{
              background: statusSt.bg, color: statusSt.color,
              fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99,
            }}>
              {statusLabel}
            </span>
          </div>
        </Card>

        {/* Section 2 — Customer + Order info */}
        <Card>
          <CardLabel>Customer &amp; Order Info</CardLabel>
          <InfoRow label="Customer" value={order.customer_name || '—'} />
          <InfoRow
            label="Phone"
            value={
              order.customer_phone
                ? <a
                    href={`tel:${order.customer_phone}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {order.customer_phone}
                  </a>
                : '—'
            }
          />
          {order.delivery_type && (
            <InfoRow label="Delivery" value={order.delivery_type} />
          )}
          {order.payment_type && (
            <InfoRow label="Payment Type" value={order.payment_type} />
          )}
          <DocumentOwnershipPanel data={order} docType="order" variant="screen" />
        </Card>

        {/* Section 3 — Payment summary */}
        <Card>
          <CardLabel>Payment Summary</CardLabel>
          <AmountRow label="Total Amount" value={inr(order.total_amount)} large />
          <AmountRow
            label="Paid"
            value={inr(order.paid_amount || 0)}
            color="#16a34a"
          />
          <AmountRow
            label="Pending"
            value={inr(pending)}
            color={pending > 0 ? '#dc2626' : '#16a34a'}
          />
          {pending > 0 && (
            <button
              onClick={() => navigate(`/payment/${id}`)}
              style={{
                marginTop: 12, width: '100%', padding: '10px',
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 10, color: '#16a34a', fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Record Payment →
            </button>
          )}
        </Card>

        {/* Section 4 — Production progress */}
        <Card>
          <CardLabel>Production Progress</CardLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {PROD_STAGES.map((stage, idx) => {
              const done   = idx < completedN;
              const active = idx === completedN && order.status === 'Production';
              return (
                <React.Fragment key={stage.key}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: done ? '#16a34a' : active ? '#2563eb' : '#f1f5f9',
                      border: `2px solid ${done ? '#16a34a' : active ? '#2563eb' : '#e2e8f0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: done || active ? '#fff' : '#9ca3af',
                      fontWeight: 700, transition: 'all 0.2s',
                    }}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, marginTop: 6,
                      color: done ? '#16a34a' : active ? '#2563eb' : '#9ca3af',
                      textAlign: 'center',
                    }}>
                      {stage.label}
                    </div>
                  </div>
                  {idx < PROD_STAGES.length - 1 && (
                    <div style={{
                      height: 2, flex: '0 0 24px',
                      background: idx < completedN - 1 ? '#16a34a' : '#e2e8f0',
                      marginBottom: 20,
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {completedN === 4 && (
            <div style={{
              marginTop: 12, textAlign: 'center', fontSize: 12,
              color: '#16a34a', fontWeight: 600,
            }}>
              Production complete
            </div>
          )}
          {order.status === 'Production' && (
            <div style={{
              marginTop: 12, textAlign: 'center', fontSize: 12,
              color: '#2563eb', fontWeight: 600,
            }}>
              In production
            </div>
          )}
        </Card>

        {/* Section 5 — Actions */}
        <Card>
          <CardLabel>Actions</CardLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionBtn
              label="View Invoice"
              bg="#2563eb"
              onClick={() => navigate(`/invoice/${id}`)}
            />
            {waPhone && (
              <ActionBtn
                label="WhatsApp"
                bg="#25D366"
                href={`https://wa.me/${waPhone}`}
                target="_blank"
              />
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <DocActions
              type="order"
              id={id}
              docNo={order.order_number}
              amount={order.total_amount}
              customerMobile={order.customer_phone}
              customerName={order.customer_name}
              customerEmail={order.customer_email}
              emailCount={order.email_sent_count}
              printCount={order.print_count}
              pdfCount={order.pdf_count}
              whatsappCount={order.whatsapp_count}
            />
          </div>
        </Card>

        {/* Section — Manufacturing Planning (visible only when explosion data exists) */}
        {(planning.requirements.length > 0 || planning.workloads.length > 0) && (
          <Card>
            <CardLabel>Manufacturing Planning</CardLabel>

            {planning.requirements.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, marginTop: 4 }}>
                  Raw Material Requirements
                </div>
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Item', 'Raw Material', 'Order Qty', 'Required', 'Wastage', 'Calc. Qty', 'Unit', 'Status'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {planning.requirements.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', color: '#374151' }}>{r.order_item_name || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: 11 }}>{r.raw_material_sku || '—'}</span>
                            <div style={{ color: '#6b7280', fontSize: 11 }}>{r.raw_material_name}</div>
                          </td>
                          <td style={{ padding: '6px 8px', color: '#374151' }}>{r.order_item_qty}</td>
                          <td style={{ padding: '6px 8px', color: '#374151' }}>{Number(r.required_qty).toFixed(3)}</td>
                          <td style={{ padding: '6px 8px', color: '#9ca3af' }}>{r.wastage_percent}%</td>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#111827' }}>{Number(r.calculated_qty).toFixed(3)}</td>
                          <td style={{ padding: '6px 8px', color: '#6b7280' }}>{r.consumption_type}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                              background: r.status === 'READY' ? '#d1fae5' : r.status === 'SHORTAGE' ? '#fee2e2' : '#fef3c7',
                              color:      r.status === 'READY' ? '#065f46' : r.status === 'SHORTAGE' ? '#dc2626' : '#92400e',
                            }}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {planning.workloads.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Department Workloads
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Item', 'Department', 'Workload Qty', 'Unit', 'Status'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {planning.workloads.map((w, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', color: '#374151' }}>{w.order_item_name || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ fontWeight: 600 }}>{w.department_name || '—'}</span>
                            {w.department_code && <span style={{ color: '#9ca3af', marginLeft: 5, fontSize: 11 }}>{w.department_code}</span>}
                          </td>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#111827' }}>{Number(w.workload_qty).toFixed(3)}</td>
                          <td style={{ padding: '6px 8px', color: '#6b7280' }}>{w.workload_unit}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                              background: w.status === 'DONE' ? '#d1fae5' : w.status === 'IN_PROGRESS' ? '#dbeafe' : '#f3f4f6',
                              color:      w.status === 'DONE' ? '#065f46' : w.status === 'IN_PROGRESS' ? '#1d4ed8' : '#6b7280',
                            }}>{w.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

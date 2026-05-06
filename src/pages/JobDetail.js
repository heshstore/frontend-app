import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const STATUS_STYLE = {
  PENDING:     { bg: '#f1f5f9', color: '#475569' },
  IN_PROGRESS: { bg: '#fef9c3', color: '#a16207' },
  DONE:        { bg: '#dcfce7', color: '#15803d' },
  CANCELLED:   { bg: '#fee2e2', color: '#dc2626' },
};

const PRIORITY_COLOR = {
  URGENT: '#dc2626',
  HIGH:   '#ea580c',
  NORMAL: '#16a34a',
  LOW:    '#64748b',
};

const STAGE_LABEL = {
  DESIGNING: 'Designing',
  PRINTING:  'Printing',
  LASER:     'Laser',
  ASSEMBLY:  'Assembly',
  COMPLETED: 'Completed',
};

function Skeleton({ h = 14, w = '100%', mb = 10 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 6, marginBottom: mb,
      background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'jd-shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '4px 0' }}>
      <style>{`@keyframes jd-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Skeleton h={20} w="60%" mb={6} />
      <Skeleton h={12} w="40%" mb={20} />
      <Skeleton h={80} mb={14} />
      <Skeleton h={120} mb={14} />
      <Skeleton h={100} />
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

function Badge({ bg, color, children }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{
        width: 120, flexShrink: 0, fontSize: 12, color: '#9ca3af',
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '16px 18px', marginBottom: 14,
    }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#9ca3af',
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// jobId prop → panel mode (no back button, no nav shortcuts)
// no jobId  → route mode (reads useParams, shows back button)
export default function JobDetail({ jobId: propId }) {
  const params     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();

  const id         = propId ?? params.id;
  const isPanelMode = Boolean(propId);

  const [job, setJob]         = useState(!isPanelMode ? (location.state?.job ?? null) : null);
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = () => { setJob(null); setOrder(null); setRetryCount(c => c + 1); };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let targetJob = job;
        if (!targetJob) {
          const qRes = await apiFetch(`/production/queue`);
          if (!qRes.ok) throw new Error();
          const all = await qRes.json();
          targetJob = Array.isArray(all) ? all.find(j => String(j.id) === String(id)) : null;
          if (targetJob && !cancelled) setJob(targetJob);
        }

        if (targetJob?.order_id) {
          const oRes = await apiFetch(`/orders/${targetJob.order_id}`);
          if (oRes.ok && !cancelled) setOrder(await oRes.json());
        }
      } catch {
        if (!cancelled) setError('Could not load job details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, retryCount]);

  const btn = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8,
    padding: '10px 16px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', minHeight: 44, touchAction: 'manipulation',
  });

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPanelMode ? '4px 0' : '16px 12px' }}>
        <LoadingState />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: isPanelMode ? 0 : '16px 12px' }}>
        <ErrorState
          message={error || 'Job not found.'}
          onRetry={retry}
          onBack={!isPanelMode ? () => navigate(-1) : null}
        />
      </div>
    );
  }

  const sStyle    = STATUS_STYLE[job.status] ?? STATUS_STYLE.PENDING;
  const isOverdue = job.due_date && new Date(job.due_date) < new Date() && job.status !== 'DONE';
  const orderItem = order?.items?.find(i => String(i.id) === String(job.order_item_id));

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: isPanelMode ? 0 : '16px 12px' }}>

      {/* Header — route mode only */}
      {!isPanelMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={btn('#f1f5f9', '#374151')}>← Back</button>
          <h3 style={{ margin: 0, flex: 1, fontSize: 16 }}>Job Details</h3>
        </div>
      )}

      {/* Status hero */}
      <div style={{
        background: sStyle.bg,
        border: `1px solid ${isOverdue ? '#dc2626' : '#e2e8f0'}`,
        borderRadius: 12, padding: '18px 20px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {job.item_name || job.sku || `Job #${job.id}`}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Order ORD-{job.order_id}
          </div>
        </div>
        <Badge bg={sStyle.bg} color={sStyle.color}>{job.status.replace('_', ' ')}</Badge>
      </div>

      {/* Job Info */}
      <Card title="Job Info">
        <InfoRow label="Job ID"   value={`#${job.id}`} />
        <InfoRow label="Stage"    value={STAGE_LABEL[job.current_stage] ?? job.current_stage} />
        <InfoRow label="Priority" value={
          <span style={{ color: PRIORITY_COLOR[job.priority] ?? '#374151', fontWeight: 700 }}>
            {job.priority}
          </span>
        } />
        <InfoRow label="Quantity"  value={job.qty} />
        <InfoRow label="SKU"       value={job.sku} />
        <InfoRow label="Due Date"  value={
          job.due_date
            ? <span style={{ color: isOverdue ? '#dc2626' : '#111827', fontWeight: isOverdue ? 700 : 500 }}>
                {new Date(job.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {isOverdue && ' — OVERDUE'}
              </span>
            : null
        } />
        <InfoRow label="Started"   value={job.started_at   ? new Date(job.started_at).toLocaleString('en-IN')   : null} />
        <InfoRow label="Completed" value={job.completed_at ? new Date(job.completed_at).toLocaleString('en-IN') : null} />
      </Card>

      {/* Order / Customer Info */}
      {order && (
        <Card title="Order & Customer">
          <InfoRow label="Order ID" value={`ORD-${order.id}${order.order_number ? ` (${order.order_number})` : ''}`} />
          <InfoRow label="Customer" value={order.customer_name} />
          <InfoRow label="Phone"    value={order.customer_phone} />
          <InfoRow label="Due Date" value={order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          <InfoRow label="Status"   value={order.status?.replace(/_/g, ' ')} />
        </Card>
      )}

      {/* Item Instructions */}
      {orderItem?.instruction && (
        <Card title="Instructions">
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {orderItem.instruction}
          </p>
        </Card>
      )}

      {/* All items in order */}
      {order?.items && order.items.length > 0 && (
        <Card title={`Order Items (${order.items.length})`}>
          {order.items.map((item, i) => (
            <div
              key={item.id}
              style={{
                padding: '10px 0',
                borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {item.item_name || item.sku || '—'}
                  {String(item.id) === String(job.order_item_id) && (
                    <span style={{
                      marginLeft: 8, fontSize: 10,
                      background: '#dbeafe', color: '#1d4ed8',
                      padding: '1px 7px', borderRadius: 99, fontWeight: 700,
                    }}>
                      THIS JOB
                    </span>
                  )}
                </div>
                {item.sku && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>SKU: {item.sku}</div>
                )}
                {item.instruction && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                    {item.instruction}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Qty: {item.qty}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Action shortcuts — route mode only */}
      {!isPanelMode && (
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={() => navigate('/production/my-jobs')} style={{ ...btn('#007bff'), flex: 1 }}>
            My Jobs
          </button>
          <button onClick={() => navigate('/production/queue')} style={{ ...btn('#6b7280'), flex: 1 }}>
            Queue
          </button>
        </div>
      )}

    </div>
  );
}

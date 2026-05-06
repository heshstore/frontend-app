import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PRIORITY_STYLE = {
  URGENT: { bg: '#fffbeb', color: '#d97706', label: 'URGENT' }, // amber — distinct from delayed red
  HIGH:   { bg: '#fff7ed', color: '#ea580c', label: 'HIGH'   },
  NORMAL: { bg: '#f0fdf4', color: '#16a34a', label: 'NORMAL' }, // green for on-track
  LOW:    { bg: '#f8fafc', color: '#64748b', label: 'LOW'    },
};

const STATUS_STYLE = {
  PENDING:     { bg: '#f1f5f9', color: '#475569' },
  IN_PROGRESS: { bg: '#fef9c3', color: '#a16207' },
  DONE:        { bg: '#dcfce7', color: '#15803d' },
  CANCELLED:   { bg: '#fee2e2', color: '#dc2626' },
};

const STAGE_LABEL = {
  DESIGNING: 'Designing',
  PRINTING:  'Printing',
  LASER:     'Laser',
  ASSEMBLY:  'Assembly',
  COMPLETED: 'Completed',
};

function Badge({ bg, color, children }) {
  return (
    <span style={{
      background: bg, color, fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function fmtElapsed(ms) {
  const secs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ElapsedTimer({ startedAt }) {
  // Parse once into a ref so the interval closure always reads a stable base value
  const baseMs = useRef(new Date(startedAt).getTime());
  const [display, setDisplay] = useState(() => fmtElapsed(Date.now() - baseMs.current));

  useEffect(() => {
    const t = setInterval(() => {
      setDisplay(fmtElapsed(Date.now() - baseMs.current));
    }, 1000);
    return () => clearInterval(t);
  }, []); // baseMs.current is stable — no deps needed

  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      background: '#fef9c3', color: '#a16207',
      fontSize: 12, fontWeight: 700,
      padding: '2px 8px', borderRadius: 6,
    }}>
      ⏱ {display}
    </span>
  );
}

/**
 * JobCard — renders a single production job row.
 *
 * Props:
 *   job          object  — production job record
 *   actions      node    — action buttons to render at bottom
 *   highlight    bool    — red border override (delayed / manager-flagged)
 */
export default function JobCard({ job, actions, highlight }) {
  const navigate = useNavigate();
  const pStyle = PRIORITY_STYLE[job.priority] ?? PRIORITY_STYLE.NORMAL;
  const sStyle = STATUS_STYLE[job.status]   ?? STATUS_STYLE.PENDING;

  const isOverdue  = job.due_date && new Date(job.due_date) < new Date()
    && job.status !== 'DONE' && job.status !== 'CANCELLED';
  const isDelayed  = highlight || isOverdue || job._delayed;
  const isUrgent   = !isDelayed && job.priority === 'URGENT';
  const isActive   = job.status === 'IN_PROGRESS';

  // Border logic: delayed=red, urgent=amber, otherwise use priority color
  const borderColor = isDelayed ? '#dc3545'
    : isUrgent ? '#d97706'
    : pStyle.color;

  return (
    <div style={{
      border:       `1px solid ${isDelayed ? '#dc3545' : '#e2e8f0'}`,
      borderLeft:   `4px solid ${borderColor}`,
      borderRadius: 10,
      padding:      '14px 16px',
      background:   '#fff',
      marginBottom: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
          #{job.order_id ? `ORD-${job.order_id}` : job.id}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#111827' }}>
          {job.item_name || job.sku || '—'}
        </span>
        <Badge bg={pStyle.bg} color={pStyle.color}>{pStyle.label}</Badge>
        <Badge bg={sStyle.bg} color={sStyle.color}>{job.status}</Badge>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        <span>Stage: <b style={{ color: '#374151' }}>{STAGE_LABEL[job.current_stage] ?? job.current_stage}</b></span>
        <span>Qty: <b style={{ color: '#374151' }}>{job.qty}</b></span>
        {job.sku && <span>SKU: <b style={{ color: '#374151' }}>{job.sku}</b></span>}
        {(job.assigned_to_name || job.assigned_name) && (
          <span>Assigned: <b style={{ color: '#374151' }}>{job.assigned_to_name || job.assigned_name}</b></span>
        )}
      </div>

      {/* Due date + timer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        {job.due_date && (
          <span style={{ fontSize: 12, color: isOverdue ? '#dc3545' : '#6b7280' }}>
            Due: <b>{new Date(job.due_date).toLocaleDateString()}</b>
            {isOverdue && <b style={{ marginLeft: 6 }}>OVERDUE</b>}
          </span>
        )}
        {isActive && job.started_at && (
          <>
            <ElapsedTimer startedAt={job.started_at} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              since {new Date(job.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>

      {/* Actions + Details link */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        {actions}
        <button
          onClick={() => navigate(`/production/jobs/${job.id}`, { state: { job } })}
          style={{
            background: 'transparent', color: '#6b7280',
            border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', minHeight: 40, touchAction: 'manipulation',
            marginLeft: 'auto',
          }}
        >
          Details →
        </button>
      </div>
    </div>
  );
}

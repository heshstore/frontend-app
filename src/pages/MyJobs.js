import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiFetch } from '../utils/api';
import NextActionBanner from '../components/NextActionBanner';
import InlineAlert from '../components/InlineAlert';
import IssueModal from '../components/production/IssueModal';
import { useRightPanel } from '../components/layout/RightPanel';
import JobDetail from './JobDetail';

const POLL_MS = 30_000;

const PRIORITY = {
  URGENT: { label: 'URGENT', bg: '#fee2e2', color: '#dc2626' },
  HIGH:   { label: 'HIGH',   bg: '#fff7ed', color: '#ea580c' },
  NORMAL: { label: 'NORMAL', bg: '#f0fdf4', color: '#16a34a' },
  LOW:    { label: 'LOW',    bg: '#f8fafc', color: '#64748b' },
};

const STAGE_LABEL = {
  DESIGNING: 'Designing',
  PRINTING:  'Printing',
  LASER:     'Laser',
  ASSEMBLY:  'Assembly',
  COMPLETED: 'Completed',
};

const STAGE_STYLE = {
  DESIGNING: { bg: '#dbeafe', color: '#1d4ed8' },
  PRINTING:  { bg: '#fef3c7', color: '#b45309' },
  LASER:     { bg: '#fee2e2', color: '#dc2626' },
  ASSEMBLY:  { bg: '#ede9fe', color: '#7c3aed' },
  COMPLETED: { bg: '#dcfce7', color: '#15803d' },
};

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  return {
    label: isToday
      ? `Today ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    isToday,
    isOverdue: d < today && !isToday,
  };
}

function ActionBtn({ label, bg, color = '#fff', onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
        background: disabled ? '#f3f4f6' : bg,
        color: disabled ? '#9ca3af' : color,
        fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        touchAction: 'manipulation', minHeight: 44,
        transition: 'opacity 0.15s',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function JobCard({ job, onStart, onStop, onComplete, onIssue, onHold, onDetails, busy }) {
  const p       = PRIORITY[job.priority] ?? PRIORITY.NORMAL;
  const due     = fmtDate(job.due_date);
  const isPending   = job.status === 'PENDING';
  const isActive    = job.status === 'IN_PROGRESS';
  const isDone      = job.status === 'DONE';
  const isOverdue   = due?.isOverdue && !isDone;
  const stageSt     = STAGE_STYLE[job.current_stage] ?? { bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: 14,
      overflow: 'hidden',
      border: isOverdue ? '1px solid #fca5a5' : '1px solid #f1f5f9',
    }}>
      {/* Top row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 0',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>
          #{job.order_id ? `ORD-${job.order_id}` : job.id}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isActive && (
            <span style={{
              fontSize: 11, fontWeight: 700, background: '#dbeafe',
              color: '#1d4ed8', padding: '3px 9px', borderRadius: 99,
            }}>
              IN PROGRESS
            </span>
          )}
          {isDone && (
            <span style={{
              fontSize: 11, fontWeight: 700, background: '#dcfce7',
              color: '#15803d', padding: '3px 9px', borderRadius: 99,
            }}>
              DONE
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: p.bg, color: p.color,
            padding: '3px 9px', borderRadius: 99,
          }}>
            {p.label}
          </span>
        </div>
      </div>

      {/* Middle — item info */}
      <div style={{ padding: '10px 16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          {job.item_name || job.sku || `Job #${job.id}`}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            background: stageSt.bg, color: stageSt.color,
            padding: '3px 9px', borderRadius: 99,
          }}>
            {STAGE_LABEL[job.current_stage] ?? job.current_stage ?? '—'}
          </span>
          {job.qty && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Qty: <strong style={{ color: '#374151' }}>{job.qty}</strong>
            </span>
          )}
          {due && (
            <span style={{
              fontSize: 12,
              color: due.isOverdue ? '#dc2626' : due.isToday ? '#d97706' : '#6b7280',
              fontWeight: due.isToday || due.isOverdue ? 700 : 400,
            }}>
              {due.isOverdue ? '⚠ ' : due.isToday ? '⏰ ' : ''}Due: {due.label}
            </span>
          )}
        </div>
      </div>

      {/* Bottom — actions */}
      {!isDone && (
        <div style={{
          display: 'flex', gap: 8, padding: '0 12px 12px',
        }}>
          {isPending && (
            <ActionBtn
              label={busy ? '…' : '▶ Start'}
              bg="#2563eb"
              onClick={onStart}
              disabled={busy}
            />
          )}
          {isActive && (
            <>
              <ActionBtn
                label={busy ? '…' : '✓ Done'}
                bg="#16a34a"
                onClick={onComplete}
                disabled={busy}
              />
              <ActionBtn
                label="⚑ Issue"
                bg="#f59e0b"
                onClick={onIssue}
                disabled={busy}
              />
              <ActionBtn
                label="⏳ Hold"
                bg="#e0e7ff"
                color="#3730a3"
                onClick={onHold}
                disabled={busy}
              />
            </>
          )}
          {isPending && (
            <ActionBtn
              label="⚑ Issue"
              bg="#f59e0b"
              onClick={onIssue}
              disabled={busy}
            />
          )}
        </div>
      )}

      {/* Details link */}
      <button
        onClick={onDetails}
        style={{
          display: 'block', width: '100%', padding: '9px',
          background: '#f8fafc', border: 'none', borderTop: '1px solid #f1f5f9',
          fontSize: 12, color: '#9ca3af', cursor: 'pointer', fontWeight: 600,
        }}
      >
        Details →
      </button>
    </div>
  );
}

export default function MyJobs() {
  const navigate                                        = useNavigate();
  const { currentUser }                                 = useAuth();
  const { notifications, dismissByEntity, fetchNextAction } = useNotifications();
  const { openPanel }                                   = useRightPanel();

  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [issueJob, setIssueJob] = useState(null);
  const [busyJob, setBusyJob]   = useState(null);
  const pollRef                 = useRef(null);

  const loadJobs = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res  = await apiFetch(`/production/assigned/${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setError('Could not load your jobs. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [loadJobs]);

  const notifCount = notifications.length;
  useEffect(() => {
    if (!loading) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifCount]);

  const delayedAlerts = notifications.filter(
    n => (n.entity_type === 'job_group' || n.entity_type?.startsWith('job_group_')) && !n.is_read
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = async (job) => {
    if (busyJob === job.id) return;
    setBusyJob(job.id);
    try {
      const res = await apiFetch(`/production/${job.id}/start`, { method: 'PATCH' });
      if (res.ok) { loadJobs(); fetchNextAction(); }
      else alert('Could not start job.');
    } finally { setBusyJob(null); }
  };

  const handleStop = async (job) => {
    if (busyJob === job.id) return;
    setBusyJob(job.id);
    try {
      const res = await apiFetch(`/production/${job.id}/stop`, { method: 'PATCH' });
      if (res.ok) { loadJobs(); fetchNextAction(); }
      else alert('Could not stop job.');
    } finally { setBusyJob(null); }
  };

  const handleComplete = async (job) => {
    if (busyJob === job.id) return;
    if (!window.confirm(
      `Complete "${job.item_name || job.sku || `Job #${job.id}`}" — ${job.current_stage} stage for ORD-${job.order_id}?\n\nThis cannot be undone.`
    )) return;
    setBusyJob(job.id);
    try {
      const res = await apiFetch(`/production/${job.id}/next-stage`, { method: 'PATCH' });
      if (res.ok) { dismissByEntity('job', job.id); loadJobs(); fetchNextAction(); }
      else alert('Could not complete job.');
    } finally { setBusyJob(null); }
  };

  const handleHold = async (job) => {
    if (busyJob === job.id) return;
    if (!window.confirm(`Put job #${job.id} on hold?`)) return;
    setBusyJob(job.id);
    try {
      const res = await apiFetch(`/production/${job.id}/hold`, { method: 'PATCH' });
      if (res.ok) { loadJobs(); fetchNextAction(); }
      else alert('Could not put job on hold.');
    } finally { setBusyJob(null); }
  };

  const submitIssue = async (note) => {
    const jobId = issueJob.id;
    setBusyJob(jobId);
    setIssueJob(null);
    try {
      const res = await apiFetch(`/production/${jobId}/issue`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      if (res.ok) { loadJobs(); fetchNextAction(); }
      else alert('Could not report issue.');
    } finally { setBusyJob(null); }
  };

  const activeJobs = jobs.filter(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS');
  const doneJobs   = jobs.filter(j => j.status === 'DONE');

  return (
    <div style={{
      fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      background: '#f8fafc', minHeight: '100vh',
    }}>
      <div style={{ padding: '16px', maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>My Jobs</h2>
          <div style={{ display: 'flex', gap: '8px' }} /></div>

        <NextActionBanner />

        {delayedAlerts.map(n => (
          <InlineAlert
            key={n.id}
            variant="error"
            message={n.message}
            actionLabel="View"
            onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
          />
        ))}

        {error && <InlineAlert variant="warning" message={error} />}

        {loading && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48, fontSize: 14 }}>
            Loading your jobs…
          </div>
        )}

        {/* Empty state */}
        {!loading && activeJobs.length === 0 && (
          <div style={{
            textAlign: 'center', background: '#f0fdf4',
            border: '1px solid #86efac', borderRadius: 16,
            padding: 36, color: '#15803d',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>All caught up!</div>
            <div style={{ fontSize: 13, marginTop: 4, color: '#16a34a' }}>No active jobs assigned to you.</div>
          </div>
        )}

        {/* Active jobs */}
        {activeJobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            busy={busyJob === job.id}
            onStart={() => handleStart(job)}
            onStop={() => handleStop(job)}
            onComplete={() => handleComplete(job)}
            onIssue={() => setIssueJob(job)}
            onHold={() => handleHold(job)}
            onDetails={() => openPanel(`Job #${job.id}`, <JobDetail jobId={job.id} />)}
          />
        ))}

        {/* Completed today */}
        {doneJobs.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 1,
              margin: '20px 0 10px',
            }}>
              Completed today ({doneJobs.length})
            </div>
            {doneJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                busy={false}
                onDetails={() => openPanel(`Job #${job.id}`, <JobDetail jobId={job.id} />)}
              />
            ))}
          </>
        )}

        <div style={{ height: 32 }} />
      </div>

      {issueJob && (
        <IssueModal
          job={issueJob}
          onSubmit={submitIssue}
          onClose={() => setIssueJob(null)}
        />
      )}
    </div>
  );
}

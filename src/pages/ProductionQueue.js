import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
import { apiFetch } from '../utils/api';
import { API_URL } from '../config';
import { getSocket } from '../lib/socket';
import InlineAlert from '../components/InlineAlert';
import { useRightPanel } from '../components/layout/RightPanel';
import JobDetail from './JobDetail';

const POLL_MS = 30_000;

const STAGES     = ['DESIGNING', 'PRINTING', 'LASER', 'ASSEMBLY', 'COMPLETED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const STAGE_STYLE = {
  DESIGNING: { bg: '#dbeafe', color: '#1d4ed8' },
  PRINTING:  { bg: '#fef3c7', color: '#b45309' },
  LASER:     { bg: '#fee2e2', color: '#dc2626' },
  ASSEMBLY:  { bg: '#ede9fe', color: '#7c3aed' },
  COMPLETED: { bg: '#dcfce7', color: '#15803d' },
};

const STAGE_LABEL = {
  DESIGNING: 'Designing', PRINTING: 'Printing',
  LASER: 'Laser', ASSEMBLY: 'Assembly', COMPLETED: 'Completed',
};

const PRIORITY_STYLE = {
  URGENT: { bg: '#fee2e2', color: '#dc2626' },
  HIGH:   { bg: '#fff7ed', color: '#ea580c' },
  NORMAL: { bg: '#f0fdf4', color: '#16a34a' },
  LOW:    { bg: '#f8fafc', color: '#64748b' },
};

const STATUS_STYLE = {
  PENDING:     { bg: '#f1f5f9', color: '#475569' },
  IN_PROGRESS: { bg: '#dbeafe', color: '#1d4ed8' },
  DONE:        { bg: '#dcfce7', color: '#15803d' },
  CANCELLED:   { bg: '#fee2e2', color: '#dc2626' },
  ON_HOLD:     { bg: '#fef3c7', color: '#b45309' },
};

function Badge({ bg, color, children }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`, flex: '1 1 120px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function fmtDue(iso) {
  if (!iso) return { label: '—', overdue: false };
  const d     = new Date(iso);
  const now   = new Date();
  const overdue = d < now && d.toDateString() !== now.toDateString();
  const today   = d.toDateString() === now.toDateString();
  return {
    label: today
      ? `Today ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    overdue,
    today,
  };
}

export default function ProductionQueue() {
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const { notifications }  = useNotifications();
  const { openPanel }      = useRightPanel();

  const [jobs, setJobs]                             = useState([]);
  const [staff, setStaff]                           = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState(null);
  const [search, setSearch]                         = useState('');
  const [filterStage, setFilterStage]               = useState(searchParams.get('stage') || '');
  const [filterPriority, setFilterPriority]         = useState('');
  const [filterAssigned, setFilterAssigned]         = useState('');
  const [filterUnassigned, setFilterUnassigned]     = useState(false);
  const [showFilters, setShowFilters]               = useState(false);
  const [hoveredRow, setHoveredRow]                 = useState(null);
  const pollRef = useRef(null);

  const loadJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStage)      params.set('stage',       filterStage);
      if (filterPriority)   params.set('priority',    filterPriority);
      if (filterAssigned)   params.set('assigned_to', filterAssigned);
      if (filterUnassigned) params.set('unassigned',  'true');
      const res = await axios.get(`${API_URL}/production/queue?${params.toString()}`);
      setJobs(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch {
      setError('Could not load production queue.');
    } finally {
      setLoading(false);
    }
  }, [filterStage, filterPriority, filterAssigned, filterUnassigned]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/staff`);
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  useEffect(() => {
    setLoading(true);
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    pollRef.current = setInterval(loadJobs, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [loadJobs]);

  const notifCount = notifications.length;
  useEffect(() => {
    if (!loading) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifCount]);

  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    const onNotif = (n) => { if (n.entity_type === 'job') loadJobs(); };
    sock.on('notification.new', onNotif);
    return () => sock.off('notification.new', onNotif);
  }, [loadJobs]);

  // ── Action handlers (unchanged) ──────────────────────────────────────────

  const handleAssign = async (jobId, userId) => {
    const res = await apiFetch(`/production/${jobId}/assign/${userId}`, { method: 'PATCH' });
    if (res.ok) loadJobs();
    else alert('Assign failed.');
  };

  const handleNextStage = async (job) => {
    if (!window.confirm(`Move job #${job.id} to next stage?`)) return;
    const res = await apiFetch(`/production/${job.id}/next-stage`, { method: 'PATCH' });
    if (res.ok) loadJobs();
    else alert('Could not advance job.');
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const delayedByStage = notifications
    .filter(n => n.entity_type?.startsWith('job_group_') && !n.is_read)
    .reduce((acc, n) => {
      const stage = n.entity_type.replace('job_group_', '').toUpperCase();
      acc[stage] = n;
      return acc;
    }, {});

  const q = search.toLowerCase();
  const filtered = jobs.filter(j =>
    !q ||
    String(j.id).includes(q) ||
    (j.item_name || '').toLowerCase().includes(q) ||
    (j.sku || '').toLowerCase().includes(q) ||
    (j.order_id && String(j.order_id).includes(q))
  );

  const total     = jobs.length;
  const pending   = jobs.filter(j => j.status === 'PENDING').length;
  const inProgress = jobs.filter(j => j.status === 'IN_PROGRESS').length;
  const delayed   = jobs.filter(j =>
    j.due_date && new Date(j.due_date) < new Date() &&
    j.status !== 'DONE' && j.status !== 'CANCELLED'
  ).length;

  const hasFilters = filterStage || filterPriority || filterAssigned || filterUnassigned;

  // ── Styles ───────────────────────────────────────────────────────────────

  const thStyle = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6,
    borderBottom: '2px solid #f1f5f9', background: '#fff',
    whiteSpace: 'nowrap',
  };

  const tdStyle = (row) => ({
    padding: '11px 14px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #f8fafc',
    background: hoveredRow === row ? '#f8fafc' : '#fff',
    transition: 'background 0.1s',
  });

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, background: '#fff', outline: 'none',
  };

  const selStyle = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, background: '#fff', cursor: 'pointer',
  };

  return (
    <div style={{
      fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      background: '#f8fafc', minHeight: '100vh',
    }}>

      <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Production Queue
            {loading && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 10 }}>
                Loading…
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setLoading(true); loadJobs(); }}
              style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#374151', cursor: 'pointer', fontSize: '13px' }}
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => navigate('/order')}
              style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
            >
              + New Order
            </button>
          </div>
        </div>

        {/* Delay banners */}
        {Object.entries(delayedByStage).map(([stage, notif]) => (
          <InlineAlert
            key={stage}
            variant="error"
            message={notif.message}
            actionLabel={`Filter ${STAGE_LABEL[stage] ?? stage}`}
            onClick={() => setFilterStage(stage)}
          />
        ))}
        {error && <InlineAlert variant="warning" message={error} />}

        {/* Section 1 — Metrics */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <MetricCard label="Total Jobs"   value={total}      color="#6b7280" />
          <MetricCard label="Pending"      value={pending}    color="#f59e0b" />
          <MetricCard label="In Progress"  value={inProgress} color="#2563eb" />
          <MetricCard
            label="Delayed"
            value={delayed}
            color={delayed > 0 ? '#dc2626' : '#16a34a'}
            sub={delayed > 0 ? 'Needs attention' : 'All on time'}
          />
        </div>

        {/* Section 2 — Search + filters */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16,
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            style={{ ...inputStyle, flex: '1 1 200px' }}
            placeholder="Search job ID, item, order…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              padding: '9px 14px', borderRadius: 8,
              border: `1px solid ${hasFilters ? '#2563eb' : '#e2e8f0'}`,
              background: hasFilters ? '#eff6ff' : '#fff',
              color: hasFilters ? '#2563eb' : '#374151',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⚙ Filters{hasFilters ? ' ●' : ''}
          </button>

          <button
            onClick={() => { setLoading(true); loadJobs(); }}
            style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', color: '#374151',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>

          <button
            onClick={() => navigate('/order')}
            style={{
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
            title="Create an order to generate production jobs"
          >
            + New Order
          </button>
        </div>

        {/* Filter dropdowns (collapsed by default) */}
        {showFilters && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: '12px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16,
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={selStyle}>
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>

            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selStyle}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={filterAssigned} onChange={e => { setFilterAssigned(e.target.value); setFilterUnassigned(false); }} style={selStyle}>
              <option value="">All Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterUnassigned}
                onChange={e => { setFilterUnassigned(e.target.checked); setFilterAssigned(''); }}
              />
              Unassigned only
            </label>

            {hasFilters && (
              <button
                onClick={() => {
                  setFilterStage(''); setFilterPriority('');
                  setFilterAssigned(''); setFilterUnassigned(false);
                }}
                style={{
                  padding: '7px 12px', borderRadius: 8,
                  border: 'none', background: '#fee2e2',
                  color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Section 3 — Table */}
        <div style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        }}>
          {!loading && filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 48, fontSize: 14 }}>
              {jobs.length === 0 ? 'No jobs in queue.' : 'No jobs match your search.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Job ID</th>
                    <th style={thStyle}>Item / Order</th>
                    <th style={thStyle}>Stage</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Assigned To</th>
                    <th style={thStyle}>Due Date</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(job => {
                    const stage    = STAGE_STYLE[job.current_stage]  ?? { bg: '#f1f5f9', color: '#374151' };
                    const priority = PRIORITY_STYLE[job.priority]    ?? PRIORITY_STYLE.NORMAL;
                    const status   = STATUS_STYLE[job.status]        ?? STATUS_STYLE.PENDING;
                    const due      = fmtDue(job.due_date);
                    const staffMember = staff.find(s => s.id === job.assigned_to);

                    return (
                      <tr
                        key={job.id}
                        onMouseEnter={() => setHoveredRow(job.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={tdStyle(job.id)}>
                          <span style={{ fontWeight: 700, color: '#111827' }}>
                            #{job.id}
                          </span>
                        </td>

                        <td style={tdStyle(job.id)}>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                            {job.item_name || job.sku || '—'}
                          </div>
                          {job.order_id && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              ORD-{job.order_id}
                            </div>
                          )}
                        </td>

                        <td style={tdStyle(job.id)}>
                          <Badge bg={stage.bg} color={stage.color}>
                            {STAGE_LABEL[job.current_stage] ?? job.current_stage ?? '—'}
                          </Badge>
                        </td>

                        <td style={tdStyle(job.id)}>
                          <Badge bg={priority.bg} color={priority.color}>
                            {job.priority ?? '—'}
                          </Badge>
                        </td>

                        <td style={tdStyle(job.id)}>
                          <select
                            value={job.assigned_to || ''}
                            onChange={e => handleAssign(job.id, e.target.value)}
                            style={{
                              padding: '5px 8px', borderRadius: 6,
                              border: '1px solid #e2e8f0', fontSize: 12,
                              background: '#fff', cursor: 'pointer',
                              color: staffMember ? '#111827' : '#9ca3af',
                              maxWidth: 140,
                            }}
                          >
                            <option value="">Unassigned</option>
                            {staff.map(s => (
                              <option key={s.id} value={s.id}>{s.name || s.email}</option>
                            ))}
                          </select>
                        </td>

                        <td style={tdStyle(job.id)}>
                          <span style={{
                            fontSize: 12,
                            color: due.overdue ? '#dc2626' : due.today ? '#d97706' : '#6b7280',
                            fontWeight: due.overdue || due.today ? 700 : 400,
                          }}>
                            {due.overdue ? '⚠ ' : due.today ? '⏰ ' : ''}{due.label}
                          </span>
                        </td>

                        <td style={tdStyle(job.id)}>
                          <Badge bg={status.bg} color={status.color}>
                            {job.status ?? '—'}
                          </Badge>
                        </td>

                        <td style={{ ...tdStyle(job.id), textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {job.current_stage !== 'COMPLETED' && job.status !== 'DONE' && (
                              <button
                                onClick={() => handleNextStage(job)}
                                style={{
                                  padding: '5px 10px', borderRadius: 6,
                                  border: '1px solid #d1d5db', background: '#f8fafc',
                                  color: '#374151', fontSize: 12, fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Move →
                              </button>
                            )}
                            <button
                              onClick={() => openPanel(
                                `Job #${job.id}`,
                                <JobDetail jobId={job.id} />
                              )}
                              style={{
                                padding: '5px 12px', borderRadius: 6,
                                border: 'none', background: '#2563eb',
                                color: '#fff', fontSize: 12, fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          {filtered.length > 0 && (
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #f1f5f9',
              fontSize: 12, color: '#9ca3af', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>
                {filtered.length} job{filtered.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </span>
              {hasFilters && (
                <span style={{ color: '#2563eb', fontWeight: 600 }}>
                  Filters active
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

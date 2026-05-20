import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { theme } from '../theme';
import { toast } from '../utils/toast';
import { trackWhatsAppClick } from '../lib/analytics';

const STATUS_COLORS = {
  NEW: '#6c757d', CONTACTED: '#0d6efd', INTERESTED: '#0f5132',
  QUOTATION: '#6f42c1', CONVERTED: '#198754', LOST: '#dc3545',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function isToday(iso) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function groupLeads(leads) {
  const now = new Date();
  const overdue = [], today = [], upcoming = [];
  for (const l of leads) {
    if (!l.follow_up_date) continue;
    const d = new Date(l.follow_up_date);
    if (d < now && !isToday(l.follow_up_date)) overdue.push(l);
    else if (isToday(l.follow_up_date)) today.push(l);
    else upcoming.push(l);
  }
  const byDate = (a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date);
  return { overdue: overdue.sort(byDate), today: today.sort(byDate), upcoming: upcoming.sort(byDate) };
}

// ── Lead card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, groupKey, groups, onRemove, cardRef }) {
  const navigate = useNavigate();
  const [panel, setPanel]               = useState(null); // null | 'note' | 'reschedule'
  const [note, setNote]                 = useState('');
  const [noteType, setNoteType]         = useState('CALL');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const togglePanel = (p) => setPanel(prev => (prev === p ? null : p));

  const waPhone = normalizePhoneForWhatsApp(lead.phone);
  const isOverdue = !isToday(lead.follow_up_date) && new Date(lead.follow_up_date) < new Date();

  // Find next lead in same group for auto-scroll
  const getNextRef = () => {
    const list = groups[groupKey] || [];
    const idx = list.findIndex(l => l.id === lead.id);
    return list[idx + 1]?.id ?? null;
  };

  const markDone = async (andNext = false) => {
    if (submitting) return;
    const nextId = andNext ? getNextRef() : null;
    setSubmitting(true);
    // Optimistic remove
    onRemove(lead.id, groupKey, nextId, () => {
      // Revert: just refresh
    });
    try {
      await apiFetch(`/crm/leads/${lead.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Follow-up completed.', type: 'CALL' }),
      });
      await apiFetch(`/crm/leads/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ follow_up_date: null }),
      });
    } catch {
      // Silent — optimistic already applied
    } finally {
      setSubmitting(false);
    }
  };

  const submitNote = async () => {
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim(), type: noteType }),
      });
      setNote('');
      setPanel(null);
    } catch {
      toast.error('Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleDate || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ follow_up_date: rescheduleDate }),
      });
      // Remove from current view, will appear in upcoming after refresh
      onRemove(lead.id, groupKey, null, () => {});
    } catch {
      toast.error('Failed to reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: `1px solid ${theme.border}`, fontSize: 13,
    boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: '#fff',
        border: `1px solid ${isOverdue ? '#fca5a5' : theme.border}`,
        borderLeft: `4px solid ${isOverdue ? '#ef4444' : isToday(lead.follow_up_date) ? '#ffc107' : '#16a34a'}`,
        borderRadius: 8, marginBottom: 8, overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px 10px' }}>
        {/* Name + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: theme.text }}>{lead.name}</div>
          <span style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0,
            background: (STATUS_COLORS[lead.status] || '#6c757d') + '22',
            color: STATUS_COLORS[lead.status] || '#6c757d',
          }}>{lead.status}</span>
        </div>

        {/* Phone */}
        <a href={`tel:+91${waPhone}`} style={{ fontSize: 16, fontWeight: 700, color: '#0066B3', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
          {lead.phone}
        </a>

        {lead.product_interest && (
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>📦 {lead.product_interest}</div>
        )}

        {/* Follow-up date */}
        <div style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : '#6c757d', marginBottom: 10 }}>
          {isOverdue ? '⚠ Overdue: ' : isToday(lead.follow_up_date) ? '📅 Today: ' : '🗓 '}
          {formatDate(lead.follow_up_date)}
        </div>

        {/* Primary: big call button */}
        <a
          href={`tel:+91${waPhone}`}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            padding: '13px', background: '#0066B3', color: '#fff', textDecoration: 'none',
            borderRadius: 8, fontSize: 15, fontWeight: 800, textAlign: 'center',
            marginBottom: 8,
          }}
        >
          📞 Call Now
        </a>

        {/* Secondary actions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" onClick={() => trackWhatsAppClick({ context: 'crm_followup' })} style={{
            padding: '7px 11px', background: '#25D366', color: '#fff', textDecoration: 'none',
            borderRadius: 6, fontSize: 12, fontWeight: 700,
          }}>💬 WA</a>
          <button onClick={() => markDone(false)} disabled={submitting} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: '#d1e7dd', color: '#0f5132', opacity: submitting ? 0.7 : 1,
          }}>✓ Done</button>
          <button onClick={() => markDone(true)} disabled={submitting} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: '#16a34a', color: '#fff', opacity: submitting ? 0.7 : 1,
          }}>✓ Done + Next</button>
          <button onClick={() => togglePanel('note')} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: panel === 'note' ? '#0066B3' : '#f3f4f6',
            color: panel === 'note' ? '#fff' : theme.text,
          }}>📝 Note</button>
          <button onClick={() => togglePanel('reschedule')} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: panel === 'reschedule' ? '#0066B3' : '#f3f4f6',
            color: panel === 'reschedule' ? '#fff' : theme.text,
          }}>📅 Reschedule</button>
          <button onClick={() => navigate(`/crm/leads/${lead.id}`)} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: '#f3f4f6', color: '#0066B3', marginLeft: 'auto',
          }}>→ Open</button>
        </div>
      </div>

      {/* Note panel */}
      {panel === 'note' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px', background: '#f9fafb' }}>
          <select value={noteType} onChange={e => setNoteType(e.target.value)}
            style={{ ...inp, marginBottom: 8, width: 'auto' }}>
            {['CALL', 'WHATSAPP', 'EMAIL', 'VISIT', 'GENERAL'].map(t => <option key={t}>{t}</option>)}
          </select>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="What happened on this follow-up?" rows={3} autoFocus
            style={{ ...inp, resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitNote} disabled={submitting || !note.trim()} style={{
              border: 'none', borderRadius: 6, padding: '8px 16px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: '#0066B3', color: '#fff', opacity: submitting ? 0.7 : 1,
            }}>{submitting ? 'Saving…' : 'Save Note'}</button>
            <button onClick={() => setPanel(null)} style={{
              border: 'none', borderRadius: 6, padding: '8px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f3f4f6', color: theme.text,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Reschedule panel */}
      {panel === 'reschedule' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px', background: '#f9fafb' }}>
          <input type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
            autoFocus style={{ ...inp, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitReschedule} disabled={!rescheduleDate || submitting} style={{
              border: 'none', borderRadius: 6, padding: '8px 16px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: '#f97316', color: '#fff', opacity: submitting ? 0.7 : 1,
            }}>{submitting ? 'Saving…' : 'Reschedule'}</button>
            <button onClick={() => setPanel(null)} style={{
              border: 'none', borderRadius: 6, padding: '8px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f3f4f6', color: theme.text,
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ label, color, leads, groupKey, groups, onRemove, cardRefs }) {
  if (leads.length === 0) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '16px 0 8px', padding: '6px 10px',
        background: color + '18', borderLeft: `3px solid ${color}`,
        borderRadius: '0 6px 6px 0',
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color }}>{label}</span>
        <span style={{ background: color, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
          {leads.length}
        </span>
      </div>
      {leads.map(l => (
        <LeadCard
          key={l.id}
          lead={l}
          groupKey={groupKey}
          groups={groups}
          onRemove={onRemove}
          cardRef={el => { cardRefs.current[l.id] = el; }}
        />
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function FollowUpView() {
  const [groups, setGroups]         = useState({ overdue: [], today: [], upcoming: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const cardRefs                    = useRef({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await apiFetch('/crm/leads/queue');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const all = [...(data.overdue || []), ...(data.highPriority || []), ...(data.active || [])];
      const seen = new Set();
      const unique = all.filter(l => {
        const lead = l.lead ?? l;
        if (seen.has(lead.id)) return false;
        seen.add(lead.id);
        return true;
      }).map(l => l.lead ?? l);
      setGroups(groupLeads(unique));
    } catch {
      setError('Failed to load follow-ups. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistic remove: instantly pulls lead from groups + optionally scrolls to next
  const onRemove = useCallback((leadId, groupKey, scrollToId, onError) => {
    setGroups(prev => {
      const updated = { ...prev, [groupKey]: prev[groupKey].filter(l => l.id !== leadId) };
      if (scrollToId) {
        setTimeout(() => {
          const el = cardRefs.current[scrollToId];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
      return updated;
    });
  }, []);

  const total = groups.overdue.length + groups.today.length + groups.upcoming.length;

  if (loading) {
    return (
      <PageLayout title="Follow-ups">
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 8, background: '#f0f4f8', marginBottom: 8, animation: 'pulse 1.4s infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Follow-ups">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: theme.textMuted }}>
          {total === 0 ? 'No follow-ups due' : `${total} follow-up${total !== 1 ? 's' : ''}`}
        </span>
        <button onClick={() => load(true)} disabled={refreshing} style={{
          padding: '6px 12px', borderRadius: 6, border: `1px solid ${theme.border}`,
          background: '#fff', fontSize: 12, cursor: 'pointer', color: theme.text,
          opacity: refreshing ? 0.6 : 1,
        }}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', color: '#842029', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
          <button onClick={() => load()} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#842029', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      <Section label="⚠ Overdue"   color="#ef4444" groupKey="overdue"   leads={groups.overdue}   groups={groups} onRemove={onRemove} cardRefs={cardRefs} />
      <Section label="📅 Today"    color="#f59e0b" groupKey="today"     leads={groups.today}     groups={groups} onRemove={onRemove} cardRefs={cardRefs} />
      <Section label="🗓 Upcoming" color="#16a34a" groupKey="upcoming"  leads={groups.upcoming}  groups={groups} onRemove={onRemove} cardRefs={cardRefs} />

      {/* Empty state */}
      {total === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '56px 20px' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12, color: theme.text }}>You're all caught up!</div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>No follow-ups scheduled right now.</div>
        </div>
      )}

      {/* Sticky bottom summary bar */}
      {total > 0 && (
        <div style={{
          position: 'sticky', bottom: 0,
          background: '#fff', borderTop: `1px solid ${theme.border}`,
          padding: '10px 16px',
          display: 'flex', gap: 16, justifyContent: 'center',
          fontSize: 12, color: theme.textMuted,
          margin: '8px -16px -16px',
        }}>
          {groups.overdue.length > 0 && (
            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ {groups.overdue.length} overdue</span>
          )}
          {groups.today.length > 0 && (
            <span style={{ color: '#b45309', fontWeight: 600 }}>📅 {groups.today.length} today</span>
          )}
          {groups.upcoming.length > 0 && (
            <span>🗓 {groups.upcoming.length} upcoming</span>
          )}
        </div>
      )}
    </PageLayout>
  );
}

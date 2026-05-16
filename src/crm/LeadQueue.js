import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { theme } from '../theme';
import WorkMode from './WorkMode';
import { HOT_LEAD_WINDOWS, WAITING_L2_MINS, WAITING_L3_MINS, OVERDUE_MINS } from './crmConstants';

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOTE_TYPES = ['CALL', 'GENERAL', 'WHATSAPP', 'EMAIL'];

const STATUS_COLOR = {
  NEW:       { bg: '#fff3cd', text: '#856404' },
  CONTACTED: { bg: '#cfe2ff', text: '#0a3372' },
  INTERESTED:{ bg: '#d1e7dd', text: '#0f5132' },
  QUOTATION: { bg: '#e2d9f3', text: '#432874' },
  CONVERTED: { bg: '#d1e7dd', text: '#0f5132' },
  LOST:      { bg: '#f8d7da', text: '#842029' },
};

const SCORE_COLOR = (s) => s >= 60 ? '#16a34a' : s >= 30 ? '#d97706' : '#dc2626';
const SCORE_BG    = (s) => s >= 60 ? '#dcfce7' : s >= 30 ? '#fef3c7' : '#fee2e2';

function phoneDigits(phone) {
  return normalizePhoneForWhatsApp(phone);
}

function ageLabel(hours) {
  if (!hours && hours !== 0) return '';
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getPrimaryActionType(nextAction) {
  const label = (nextAction?.label || '').toLowerCase();
  if (label.includes('whatsapp') || label.includes('message')) return 'WHATSAPP';
  if (label.includes('follow'))                                 return 'FOLLOW_UP';
  return 'CALL';
}

const PRIMARY_BTN = {
  CALL:      { label: '📞 Call Now',          bg: '#0066B3' },
  WHATSAPP:  { label: '💬 WhatsApp Now',      bg: '#25D366' },
  FOLLOW_UP: { label: '📅 Schedule Follow-up', bg: '#f97316' },
};

// Returns a WAITING badge descriptor if the customer is waiting for a salesman reply,
// or null if no badge should be shown. Escalates by wait time using crmConstants thresholds.
function waitingBadge(lead) {
  const replyAt  = lead.last_customer_reply_at ? +new Date(lead.last_customer_reply_at) : null;
  const salesAt  = lead.last_salesman_reply_at ? +new Date(lead.last_salesman_reply_at) : null;
  if (!replyAt || ['CONVERTED', 'LOST'].includes(lead.status)) return null;
  if (salesAt && salesAt >= replyAt) return null;
  const waitMs   = Date.now() - replyAt;
  if (waitMs <= 0) return null;
  const waitMins = Math.floor(waitMs / 60000);
  if (waitMins < WAITING_L2_MINS) return null;
  const age = waitMins >= 60
    ? `${Math.floor(waitMins / 60)}h ${waitMins % 60}m`
    : `${waitMins}m`;
  if (waitMins >= OVERDUE_MINS) return { text: `WAITING · ${age}`, bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
  if (waitMins >= WAITING_L3_MINS) return { text: `WAITING · ${age}`, bg: '#ffedd5', color: '#9a3412', border: '#fb923c' };
  return { text: `WAITING · ${age}`, bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '18px 0 8px', padding: '6px 10px',
      background: color + '18', borderLeft: `3px solid ${color}`,
      borderRadius: '0 6px 6px 0',
    }}>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{label}</span>
      <span style={{ background: color, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
        {count}
      </span>
    </div>
  );
}

// ── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({ item, onRefresh }) {
  const navigate = useNavigate();
  const { lead, score, nextAction, isOverdue, ageHours } = item;

  const [panel, setPanel]           = useState(null); // null | 'note' | 'followup' | 'script'
  const [callState, setCallState]   = useState(null); // null | 'confirming'
  const [noteText, setNoteText]     = useState('');
  const [noteType, setNoteType]     = useState('CALL');
  const [alsoAdvance, setAlsoAdvance] = useState(true);
  const [fuDate, setFuDate]         = useState('');
  const [fuNote, setFuNote]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localStatus, setLocalStatus] = useState(lead.status);
  const [removed] = useState(false);

  const sc      = STATUS_COLOR[localStatus] || { bg: '#f3f4f6', text: '#374151' };
  const d       = phoneDigits(lead.phone);
  const pType   = getPrimaryActionType(nextAction);
  const pBtn    = PRIMARY_BTN[pType];
  const wBadge  = waitingBadge(lead);

  const togglePanel = (name) => {
    setCallState(null);
    setPanel(p => p === name ? null : name);
  };

  // ── Primary action ────────────────────────────────────────────────────────
  const handlePrimary = () => {
    if (pType === 'CALL') {
      window.location.href = `tel:+91${d}`;
      setTimeout(() => setCallState('confirming'), 500);
    } else if (pType === 'WHATSAPP') {
      window.open(`https://wa.me/${d}`, '_blank');
    } else {
      togglePanel('followup');
    }
  };

  // ── Call: yes connected ───────────────────────────────────────────────────
  const handleConnected = useCallback(async () => {
    setSubmitting(true);
    try {
      if (noteText.trim()) {
        await apiFetch(`/crm/leads/${lead.id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ note: noteText.trim(), type: 'CALL' }),
        });
      }
      if (alsoAdvance && nextAction?.nextStatusOnComplete) {
        await apiFetch(`/crm/leads/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextAction.nextStatusOnComplete }),
        });
        setLocalStatus(nextAction.nextStatusOnComplete);
      }
      setCallState(null);
      setNoteText('');
      setPanel(null);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }, [lead.id, noteText, alsoAdvance, nextAction, onRefresh]);

  // ── Quick advance ─────────────────────────────────────────────────────────
  const advanceStatus = useCallback(async () => {
    const next = nextAction?.nextStatusOnComplete;
    if (!next) return;
    setLocalStatus(next); // optimistic
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      });
      onRefresh();
    } catch {
      setLocalStatus(lead.status); // revert
    } finally {
      setSubmitting(false);
    }
  }, [lead.id, lead.status, nextAction, onRefresh]);

  // ── Submit note ───────────────────────────────────────────────────────────
  const submitNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: noteText.trim(), type: noteType }),
      });
      if (alsoAdvance && nextAction?.nextStatusOnComplete) {
        await apiFetch(`/crm/leads/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextAction.nextStatusOnComplete }),
        });
        setLocalStatus(nextAction.nextStatusOnComplete);
      }
      setNoteText('');
      setNoteType('CALL');
      setPanel(null);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }, [lead.id, noteText, noteType, alsoAdvance, nextAction, onRefresh]);

  // ── Submit follow-up ──────────────────────────────────────────────────────
  const submitFollowUp = useCallback(async () => {
    if (!fuDate) return;
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}/followups`, {
        method: 'POST',
        body: JSON.stringify({ due_date: fuDate, note: fuNote || undefined }),
      });
      setFuDate('');
      setFuNote('');
      setPanel(null);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }, [lead.id, fuDate, fuNote, onRefresh]);

  if (removed) return null;

  const inp = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: `1px solid ${theme.border}`, fontSize: 13,
    boxSizing: 'border-box', background: '#fff', outline: 'none',
  };

  const borderColor = isOverdue ? '#ef4444' : lead.lead_priority === 'HIGH' ? '#f97316' : (score >= 60 ? '#16a34a' : '#e5e7eb');

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${isOverdue ? '#fca5a5' : theme.border}`,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }}>
      {/* ── Card body ── */}
      <div style={{ padding: '12px 14px 10px' }}>

        {/* Row 1: name + age + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: theme.text }}>{lead.name || '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
            {score != null && (
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: SCORE_COLOR(score),
                background: SCORE_BG(score),
                padding: '2px 8px', borderRadius: 10,
              }}>
                {score}
              </span>
            )}
            <span style={{ fontSize: 11, color: theme.textMuted }}>{ageLabel(ageHours)}</span>
          </div>
        </div>

        {/* Row 2: phone (big, clickable) */}
        {lead.phone && (
          <a
            href={`tel:+91${d}`}
            style={{ fontSize: 17, color: '#0066B3', fontWeight: 700, textDecoration: 'none', display: 'block', marginBottom: 4 }}
          >
            {lead.phone}
          </a>
        )}

        {/* Row 3: product interest (highlighted) */}
        {lead.product_interest && (
          <div style={{
            fontSize: 13, color: '#1f2937', fontWeight: 600,
            background: '#f0f9ff', borderRadius: 4, padding: '3px 8px',
            display: 'inline-block', marginBottom: 4,
          }}>
            📦 {lead.product_interest}
          </div>
        )}

        {/* Row 4: context + city */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {lead.context && <span style={{ fontSize: 11, color: theme.textMuted }}>🌐 {lead.context}</span>}
          {lead.city    && <span style={{ fontSize: 11, color: theme.textMuted }}>📍 {lead.city}</span>}
        </div>

        {/* Row 5: badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.text }}>
            {localStatus}
          </span>
          {lead.lead_priority === 'HIGH' && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
              HIGH
            </span>
          )}
          {isOverdue && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              ⚠ Overdue
            </span>
          )}
          {wBadge && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: wBadge.bg, color: wBadge.color, border: `1px solid ${wBadge.border}` }}>
              💬 {wBadge.text}
            </span>
          )}
          {/* Existing customer badge — no extra API call, uses customer_id already in lead */}
          {lead.customer_id && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
              🏢 Existing
            </span>
          )}
        </div>

        {/* ── PRIMARY ACTION BUTTON ── */}
        <button
          onClick={handlePrimary}
          style={{
            width: '100%', padding: '14px', marginBottom: 8,
            background: pBtn.bg, color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          {pBtn.label}
        </button>

        {/* ── Secondary action row ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {nextAction?.nextStatusOnComplete && localStatus !== 'CONVERTED' && localStatus !== 'LOST' && (
            <button onClick={advanceStatus} disabled={submitting} style={{
              border: 'none', borderRadius: 6, padding: '7px 11px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: '#16a34a', color: '#fff', opacity: submitting ? 0.7 : 1,
            }}>
              ✓ {nextAction.nextStatusOnComplete}
            </button>
          )}
          <button onClick={() => togglePanel('note')} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: panel === 'note' ? '#0066B3' : '#f3f4f6',
            color: panel === 'note' ? '#fff' : theme.text,
          }}>📝 Note</button>
          <button onClick={() => togglePanel('followup')} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: panel === 'followup' ? '#0066B3' : '#f3f4f6',
            color: panel === 'followup' ? '#fff' : theme.text,
          }}>📅 Follow-up</button>
          {nextAction?.script && (
            <button onClick={() => togglePanel('script')} style={{
              border: 'none', borderRadius: 6, padding: '7px 11px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: panel === 'script' ? '#92400e' : '#f3f4f6',
              color: panel === 'script' ? '#fff' : theme.text,
            }}>📋 Script</button>
          )}
          <button onClick={() => navigate(`/crm/leads/${lead.id}`)} style={{
            border: 'none', borderRadius: 6, padding: '7px 11px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: '#f3f4f6', color: '#0066B3', marginLeft: 'auto',
          }}>→ Open</button>
        </div>
      </div>

      {/* ── Call tracking: did you connect? ── */}
      {callState === 'confirming' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '14px', background: '#eff6ff' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>
            Did you reach <strong>{lead.name}</strong>?
          </div>
          {/* Quick note for connected flow */}
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder='Outcome e.g. "Interested, follow up Friday" (optional)'
            rows={2}
            style={{ ...inp, marginBottom: 8, resize: 'none', fontSize: 13 }}
          />
          {nextAction?.nextStatusOnComplete && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.text, marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={alsoAdvance} onChange={e => setAlsoAdvance(e.target.checked)} />
              Advance to <strong>{nextAction.nextStatusOnComplete}</strong>
            </label>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleConnected} disabled={submitting} style={{
              flex: 1, padding: '11px', background: '#16a34a', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Saving…' : '✅ Yes, Connected'}
            </button>
            <button onClick={() => { setCallState(null); togglePanel('followup'); }} style={{
              flex: 1, padding: '11px', background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              ❌ No Answer
            </button>
          </div>
        </div>
      )}

      {/* ── Note form ── */}
      {panel === 'note' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px', background: '#f9fafb' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select style={{ ...inp, width: 110 }} value={noteType} onChange={e => setNoteType(e.target.value)}>
              {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <textarea
              style={{ ...inp, flex: 1, resize: 'vertical', minHeight: 60 }}
              placeholder="What happened?"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
            />
          </div>
          {nextAction?.nextStatusOnComplete && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.text, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={alsoAdvance} onChange={e => setAlsoAdvance(e.target.checked)} />
              Also mark as <strong>{nextAction.nextStatusOnComplete}</strong>
            </label>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitNote} disabled={submitting || !noteText.trim()} style={{
              border: 'none', borderRadius: 6, padding: '8px 16px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: '#0066B3', color: '#fff', opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Saving…' : 'Save Note'}
            </button>
            <button onClick={() => setPanel(null)} style={{
              border: 'none', borderRadius: 6, padding: '8px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: '#f3f4f6', color: theme.text,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Follow-up form ── */}
      {panel === 'followup' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px', background: '#f9fafb' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              type="datetime-local" style={{ ...inp, flex: '1 1 180px' }}
              value={fuDate} onChange={e => setFuDate(e.target.value)} autoFocus
            />
            <input
              style={{ ...inp, flex: '1 1 160px' }} placeholder="Note (optional)"
              value={fuNote} onChange={e => setFuNote(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitFollowUp} disabled={!fuDate || submitting} style={{
              border: 'none', borderRadius: 6, padding: '8px 16px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: '#0066B3', color: '#fff', opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>
            <button onClick={() => setPanel(null)} style={{
              border: 'none', borderRadius: 6, padding: '8px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: '#f3f4f6', color: theme.text,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Script ── */}
      {panel === 'script' && nextAction?.script && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 14px', background: '#fffbeb' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            📋 Call Script
          </div>
          <pre style={{ margin: 0, fontSize: 12, color: '#1f2937', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>
            {nextAction.script}
          </pre>
          <button onClick={() => setPanel(null)} style={{
            marginTop: 10, border: 'none', borderRadius: 6, padding: '7px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f3f4f6', color: theme.text,
          }}>Close</button>
        </div>
      )}
    </div>
  );
}

// ── Main queue page ──────────────────────────────────────────────────────────

export default function LeadQueue() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workMode, setWorkMode]     = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const res = await apiFetch('/crm/leads/queue');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  if (loading) {
    return (
      <PageLayout title="Priority Queue">
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 100, background: '#f3f4f6', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Priority Queue">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: '#dc2626', marginBottom: 12 }}>Failed to load queue.</div>
          <button onClick={() => load()} style={{ padding: '8px 18px', background: '#0066B3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  // Defense-in-depth: backend already excludes these, but filter client-side too
  // in case cached data or older backend versions include non-operational leads.
  const NON_OPERATIONAL = new Set(['TRACKING_ONLY', 'JUNK', 'DUPLICATE']);
  const displayItems = items.filter(i => !NON_OPERATIONAL.has(i.lead?.lead_quality));

  const now = Date.now();

  // HOT: NEW status + high-intent source (META/GOOGLE/INDIAMART/LINKEDIN) within urgency window
  const hot = displayItems.filter(i => {
    const w = HOT_LEAD_WINDOWS[i.lead.source];
    if (!w || i.lead.status !== 'NEW') return false;
    const ageMins = i.ageHours * 60;
    return ageMins >= w.minMins && ageMins < w.maxMins;
  });
  const hotIds = new Set(hot.map(i => i.lead.id));

  // OVERDUE: follow-up date is past (excludes HOT leads — HOT takes precedence)
  const overdue = displayItems.filter(i => i.isOverdue && !hotIds.has(i.lead.id));

  // WAITING: customer replied 30+ min ago, salesman hasn't responded (excludes HOT + OVERDUE)
  const waiting = displayItems.filter(i => {
    if (hotIds.has(i.lead.id) || i.isOverdue) return false;
    const replyAt = i.lead.last_customer_reply_at ? +new Date(i.lead.last_customer_reply_at) : null;
    const salesAt = i.lead.last_salesman_reply_at ? +new Date(i.lead.last_salesman_reply_at) : null;
    if (!replyAt) return false;
    if (salesAt && salesAt >= replyAt) return false;
    return (now - replyAt) / 60000 >= WAITING_L2_MINS;
  });
  const waitingIds = new Set(waiting.map(i => i.lead.id));

  const high   = displayItems.filter(i => !hotIds.has(i.lead.id) && !waitingIds.has(i.lead.id) && !i.isOverdue && i.lead.lead_priority === 'HIGH');
  const normal = displayItems.filter(i => !hotIds.has(i.lead.id) && !waitingIds.has(i.lead.id) && !i.isOverdue && i.lead.lead_priority !== 'HIGH');

  return (
    <>
      {/* Work Mode overlay */}
      {workMode && (
        <WorkMode
          items={displayItems}
          onExit={() => setWorkMode(false)}
          onRefresh={refresh}
        />
      )}

      <PageLayout title="Priority Queue">
        {/* ── Top bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: theme.textMuted }}>
            {refreshing ? 'Refreshing…' : `${displayItems.length} lead${displayItems.length !== 1 ? 's' : ''} in queue`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {displayItems.length > 0 && (
              <button onClick={() => setWorkMode(true)} style={{
                padding: '8px 14px', background: '#f97316', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                ⚡ Start Calling Mode
              </button>
            )}
            <button onClick={() => navigate('/crm/leads/new')} style={{
              padding: '8px 12px', background: '#0066B3', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              + New Lead
            </button>
            <button onClick={refresh} style={{
              padding: '8px 12px', background: '#f3f4f6', color: theme.text,
              border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer',
            }}>
              ↻
            </button>
          </div>
        </div>

        {/* ── Empty state ── */}
        {displayItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>You're all caught up!</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>No active leads in the queue right now.</div>
            <button onClick={() => navigate('/crm/leads/new')} style={{
              marginTop: 16, padding: '10px 20px', background: '#0066B3', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              + Create Lead
            </button>
          </div>
        )}

        {/* ── Sections (priority order: HOT → OVERDUE → WAITING → HIGH → ACTIVE) ── */}
        {hot.length > 0 && (
          <>
            <SectionHeader label="🔥 Hot — Respond Now" count={hot.length} color="#dc2626" />
            {hot.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} />)}
          </>
        )}

        {overdue.length > 0 && (
          <>
            <SectionHeader label="⚠ Overdue Follow-ups" count={overdue.length} color="#ef4444" />
            {overdue.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} />)}
          </>
        )}

        {waiting.length > 0 && (
          <>
            <SectionHeader label="💬 Customer Waiting" count={waiting.length} color="#d97706" />
            {waiting.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} />)}
          </>
        )}

        {high.length > 0 && (
          <>
            <SectionHeader label="🟠 High Priority" count={high.length} color="#f97316" />
            {high.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} />)}
          </>
        )}

        {normal.length > 0 && (
          <>
            <SectionHeader label="🟢 Active" count={normal.length} color="#16a34a" />
            {normal.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} />)}
          </>
        )}
      </PageLayout>
    </>
  );
}

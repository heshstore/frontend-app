import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { theme } from '../theme';
import { getWaitingBadge } from './crmUtils';
import PriorityBadges from './components/PriorityBadges';
import TelecallerScorecard from './components/TelecallerScorecard';
import { useCurrentUser } from '../utils/useCurrentUser';
import {
  getCrmVisibilityMode,
  isTelecallerMode,
  isManagerMode,
  isAdminMode,
  queueTierSections,
  wfStateLabel,
  humanizeNextAction,
} from './crmVisibility';

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOTE_TYPES = ['CALL', 'GENERAL', 'WHATSAPP', 'EMAIL'];

const SCORE_COLOR = (s) => s >= 60 ? '#16a34a' : s >= 30 ? '#d97706' : '#dc2626';
const SCORE_BG    = (s) => s >= 60 ? '#dcfce7' : s >= 30 ? '#fef3c7' : '#fee2e2';

// ── SLA helpers — derive from backend-authoritative next_action_due_at ─────────

function slaCountdown(nextActionDueAt) {
  if (!nextActionDueAt) return null;
  const diffMs = new Date(nextActionDueAt) - Date.now();
  const absMins = Math.abs(Math.round(diffMs / 60_000));
  const absHours = Math.floor(absMins / 60);
  const absDays  = Math.floor(absHours / 24);
  if (diffMs > 0) {
    if (absMins < 60)   return `Due in ${absMins}m`;
    if (absMins < 1440) return `Due in ${absHours}h`;
    return `Due in ${absDays}d`;
  }
  if (absMins < 60)   return `Overdue ${absMins}m`;
  if (absMins < 1440) return `Overdue ${absHours}h`;
  return `Overdue ${absDays}d`;
}

// Card styling by tier — tiers 1/2 get elevated treatment, 3/4 get accent strips
function tierCardBorder(tier) {
  switch (tier) {
    case 1: return { borderLeft: '5px solid #dc2626', background: '#fff9f9', boxShadow: '0 2px 8px rgba(220,38,38,0.12)' };
    case 2: return { borderLeft: '5px solid #ea580c', background: '#fff9f5', boxShadow: '0 2px 8px rgba(234,88,12,0.12)' };
    case 3: return { borderLeft: '4px solid #d97706', background: '#fff'   };
    case 4: return { borderLeft: '4px solid #7c3aed', background: '#fff'   };
    case 5: return { borderLeft: '3px solid #0369a1', background: '#fff'   };
    case 6: return { borderLeft: '3px solid #d1d5db', background: '#fafaf9' };
    default:return { borderLeft: '3px solid #e5e7eb', background: '#fff'   };
  }
}

function TierAccentStrip({ tier }) {
  if (tier === 3) return <div style={{ height: 3, background: '#ef4444' }} />;
  if (tier === 4) return <div style={{ height: 3, background: '#7c3aed' }} />;
  return null;
}

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

function LeadCard({ item, onRefresh, mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { lead, score, nextAction, ageHours, queueTier = 5, slaStatus = 'NONE' } = item;
  const countdown = slaCountdown(lead.next_action_due_at);
  const cs = tierCardBorder(queueTier);

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

  const d       = phoneDigits(lead.phone);
  const pType   = getPrimaryActionType(nextAction);
  const pBtn    = PRIMARY_BTN[pType];
  const wBadge  = getWaitingBadge(lead);

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

  return (
    <div style={{
      border: `1px solid ${queueTier <= 2 ? (queueTier === 1 ? '#fca5a5' : '#fed7aa') : theme.border}`,
      borderLeft: cs.borderLeft,
      background: cs.background,
      boxShadow: cs.boxShadow,
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }}>
      {isManagerMode(mode) && <TierAccentStrip tier={queueTier} />}
      {/* ── Card body ── */}
      <div style={{ padding: '12px 14px 10px' }}>

        {/* Row 1: name + age + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: theme.text }}>{lead.name || '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
            {score != null && isManagerMode(mode) && (
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: SCORE_COLOR(score),
                background: SCORE_BG(score),
                padding: '2px 8px', borderRadius: 10,
              }}>
                {score}
              </span>
            )}
            {!isTelecallerMode(mode) && (
              <span style={{ fontSize: 11, color: theme.textMuted }}>{ageLabel(ageHours)}</span>
            )}
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

        {!isTelecallerMode(mode) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {lead.context && <span style={{ fontSize: 11, color: theme.textMuted }}>🌐 {lead.context}</span>}
            {lead.city && <span style={{ fontSize: 11, color: theme.textMuted }}>📍 {lead.city}</span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <PriorityBadges
            lead={lead}
            mode={mode}
            slaStatus={slaStatus}
            lockInfo={lead.lockInfo}
            currentUserId={user?.id}
            queueTier={queueTier}
            showCountdown={isManagerMode(mode)}
          />
          {isManagerMode(mode) && lead.workflow_state && isAdminMode(mode) && (
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>{lead.workflow_state}</span>
          )}
          {isManagerMode(mode) && !isAdminMode(mode) && lead.workflow_state && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>
              {wfStateLabel(lead.workflow_state, mode)}
            </span>
          )}
          {isTelecallerMode(mode) && countdown && (
            <span style={{ fontSize: 11, fontWeight: 600, color: ['OVERDUE', 'CRITICAL'].includes(slaStatus) ? '#b91c1c' : '#6b7280' }}>
              {countdown.replace(/^Overdue /, '').replace(/^Due in /, '')}
            </span>
          )}
          {isTelecallerMode(mode) && lead.status && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{lead.status}</span>
          )}
          {isManagerMode(mode) && wBadge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: wBadge.bg, color: wBadge.color, border: `1px solid ${wBadge.border}` }}>
              💬 {wBadge.text}
            </span>
          )}
          {lead.customer_id && !isTelecallerMode(mode) && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
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
          {isTelecallerMode(mode) && nextAction?.label
            ? humanizeNextAction(nextAction.label, mode) || pBtn.label
            : pBtn.label}
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
          <button onClick={() => navigate(`/crm/leads/${lead.id}`, { state: { from: location.pathname + location.search } })} style={{
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
  const { user, hasPermission } = useCurrentUser();
  const crmMode = getCrmVisibilityMode(user, hasPermission);
  const tierSections = queueTierSections(crmMode);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      <PageLayout title="Today Tasks">
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 100, background: '#f3f4f6', borderRadius: 8, marginBottom: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Today Tasks">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: '#dc2626', marginBottom: 12 }}>Failed to load queue.</div>
          <button onClick={() => load()} style={{ padding: '8px 18px', background: '#0066B3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  // Backend already returns only operational leads (tier > 0, no CONVERTED/LOST).
  // Client-side guard for stale cached data with non-operational quality flags.
  const NON_OPERATIONAL = new Set(['TRACKING_ONLY', 'JUNK', 'DUPLICATE']);
  const displayItems = items.filter(i => !NON_OPERATIONAL.has(i.lead?.lead_quality));

  return (
    <PageLayout title="Today Tasks">
        {/* ── Top bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: theme.textMuted }}>
            {refreshing ? 'Refreshing…' : `${displayItems.length} lead${displayItems.length !== 1 ? 's' : ''} in queue`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
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

        {displayItems.length > 0 && isManagerMode(crmMode) && (
          <TelecallerScorecard items={displayItems} userId={user?.id} />
        )}

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

        {/* ── Tier-based sections — backend queueTier is authoritative, no heuristics ── */}
        {tierSections.map(({ tier, label, color }) => {
          const tierItems = displayItems.filter(i => (i.queueTier || 0) === tier);
          if (tierItems.length === 0) return null;
          return (
            <React.Fragment key={tier}>
              <SectionHeader label={label} count={tierItems.length} color={color} />
              {tierItems.map(item => <LeadCard key={item.lead.id} item={item} onRefresh={refresh} mode={crmMode} />)}
            </React.Fragment>
          );
        })}
      </PageLayout>
  );
}

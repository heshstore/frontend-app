import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { WorkModeCustomerContext } from './CustomerIntelPanel';

const SCORE_BG   = (s) => s >= 60 ? '#dcfce7' : s >= 30 ? '#fef3c7' : '#fee2e2';
const SCORE_TEXT = (s) => s >= 60 ? '#15803d' : s >= 30 ? '#92400e' : '#b91c1c';

function digits(phone) {
  return normalizePhoneForWhatsApp(phone);
}

function presetFollowUpTimes() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(now.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  const in2days = new Date(now);
  in2days.setDate(now.getDate() + 2);
  in2days.setHours(10, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  return [
    { label: 'Tomorrow 9am', value: fmt(tomorrow9am) },
    { label: 'In 2 days',    value: fmt(in2days) },
    { label: 'Next week',    value: fmt(nextWeek) },
  ];
}

// ── All-done screen ───────────────────────────────────────────────────────────

function AllDone({ total, onExit }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#f0fdf4', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 64 }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#111', marginTop: 16 }}>All done!</div>
      <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
        You've gone through all {total} lead{total !== 1 ? 's' : ''}.
      </div>
      <button
        onClick={onExit}
        style={{ marginTop: 28, padding: '14px 36px', background: '#0066B3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
      >
        Back to Queue
      </button>
    </div>
  );
}

// ── Main WorkMode component ───────────────────────────────────────────────────

export default function WorkMode({ items, onExit, onRefresh }) {
  const navigate = useNavigate();
  const [idx, setIdx]                 = useState(0);
  const [stage, setStage]             = useState('idle'); // idle | calling | connected | not_reached
  const [noteText, setNoteText]       = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [customerMatch, setCustomerMatch] = useState(null);

  const goNext = useCallback(() => {
    setIdx(i => i + 1);
    setStage('idle');
    setNoteText('');
    setRescheduleDate('');
    setCustomerMatch(null);
  }, []);

  // Fetch customer intelligence for the current lead (AbortController prevents stale match
  // from a previous lead appearing on the next lead card)
  useEffect(() => {
    if (idx >= items.length) return;
    const leadId = items[idx]?.lead?.id;
    if (!leadId) return;
    const ctrl = new AbortController();
    setCustomerMatch(null);
    apiFetch(`/crm/leads/${leadId}/customer-match`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!ctrl.signal.aborted) setCustomerMatch(data?.matched ? data : null); })
      .catch(() => { if (!ctrl.signal.aborted) setCustomerMatch(null); });
    return () => ctrl.abort();
  }, [idx, items]);

  if (idx >= items.length) return <AllDone total={items.length} onExit={onExit} />;

  const { lead, score, nextAction } = items[idx];
  const d = digits(lead.phone);

  const handleCall = () => {
    window.location.href = `tel:+91${d}`;
    setTimeout(() => setStage('calling'), 500);
  };

  const saveConnected = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (noteText.trim()) {
        await apiFetch(`/crm/leads/${lead.id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ note: noteText.trim(), type: 'CALL' }),
        });
      }
      if (nextAction?.nextStatusOnComplete) {
        await apiFetch(`/crm/leads/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextAction.nextStatusOnComplete }),
        });
      }
      onRefresh();
      goNext();
    } finally {
      setSubmitting(false);
    }
  };

  const saveReschedule = async () => {
    if (!rescheduleDate || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch(`/crm/leads/${lead.id}/followups`, {
        method: 'POST',
        body: JSON.stringify({
          due_date: rescheduleDate,
          note: 'No answer — rescheduled from calling mode',
        }),
      });
      onRefresh();
      goNext();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (nextAction?.nextStatusOnComplete) {
        await apiFetch(`/crm/leads/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextAction.nextStatusOnComplete }),
        });
      }
      onRefresh();
      goNext();
    } finally {
      setSubmitting(false);
    }
  };

  const presets = presetFollowUpTimes();

  const S = {
    btn: (bg, color = '#fff') => ({
      border: 'none', borderRadius: 8, cursor: 'pointer',
      fontWeight: 700, color, background: bg,
    }),
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 9999,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{ background: '#0066B3', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>⚡ Calling Mode</span>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{idx + 1} of {items.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { onExit(); navigate(`/crm/leads/${lead.id}`); }}
            style={{ ...S.btn('rgba(255,255,255,0.15)'), padding: '5px 11px', fontSize: 12 }}
          >
            Open Lead
          </button>
          <button onClick={onExit} style={{ ...S.btn('rgba(255,255,255,0.2)'), padding: '6px 14px', fontSize: 13 }}>
            ✕ Exit
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 4, background: '#bfdbfe', flexShrink: 0 }}>
        <div style={{ height: '100%', background: '#fff', width: `${(idx / items.length) * 100}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* ── Lead info ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>
            {lead.name || '—'}
          </div>
          <a href={`tel:+91${d}`} style={{ fontSize: 22, fontWeight: 700, color: '#0066B3', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
            {lead.phone}
          </a>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {score != null && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: SCORE_BG(score), color: SCORE_TEXT(score), fontWeight: 700, fontSize: 13 }}>
                {score} pts
              </span>
            )}
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#374151', fontWeight: 600, fontSize: 12 }}>
              {lead.status}
            </span>
            {lead.lead_priority === 'HIGH' && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: 12 }}>
                HIGH
              </span>
            )}
            {lead.city && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontSize: 12 }}>
                {lead.city}
              </span>
            )}
          </div>
        </div>

        {/* Customer intelligence context — shown when lead matches an existing customer */}
        <WorkModeCustomerContext match={customerMatch} />

        {/* Call context panel — product interest + requirement + notes */}
        {(lead.product_interest || lead.requirement_note || lead.notes) && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              📋 Lead Context
            </div>
            {lead.product_interest && (
              <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 4 }}>
                <strong>Interest:</strong> {lead.product_interest}
              </div>
            )}
            {lead.requirement_note && (
              <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 4 }}>
                <strong>Requirement:</strong> {lead.requirement_note}
              </div>
            )}
            {lead.notes && (
              <div style={{ fontSize: 12, color: '#374151', borderTop: '1px solid #86efac', paddingTop: 6, marginTop: 4 }}>
                <strong>Notes:</strong> {lead.notes}
              </div>
            )}
          </div>
        )}

        {/* Script */}
        {nextAction?.script && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              📞 Call Script
            </div>
            <pre style={{ margin: 0, fontSize: 13, color: '#1f2937', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>
              {nextAction.script}
            </pre>
          </div>
        )}

        {/* Stage: calling — did they connect? */}
        {stage === 'calling' && (
          <div style={{ background: '#eff6ff', border: '2px solid #93c5fd', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 16 }}>
              Did you reach <strong>{lead.name}</strong>?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStage('connected')} style={{ ...S.btn('#16a34a'), flex: 1, padding: 14, fontSize: 15 }}>
                ✅ Yes, Connected
              </button>
              <button onClick={() => setStage('not_reached')} style={{ ...S.btn('#dc2626'), flex: 1, padding: 14, fontSize: 15 }}>
                ❌ No Answer
              </button>
            </div>
          </div>
        )}

        {/* Stage: connected — take note + optional convert shortcut */}
        {stage === 'connected' && (
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>
              ✅ Connected — What happened?
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder='e.g. "Interested, sending quote next week" or "Wants samples first"'
              autoFocus
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #86efac', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10, outline: 'none' }}
            />
            {nextAction?.nextStatusOnComplete && (
              <div style={{ fontSize: 12, color: '#15803d', marginBottom: 10 }}>
                Will advance status to <strong>{nextAction.nextStatusOnComplete}</strong>
              </div>
            )}
            <button onClick={saveConnected} disabled={submitting} style={{ ...S.btn('#16a34a'), width: '100%', padding: 14, fontSize: 15, opacity: submitting ? 0.7 : 1, marginBottom: 8 }}>
              {submitting ? 'Saving…' : 'Save + Next Lead →'}
            </button>
            {/* Convert / quotation shortcut — runs the proper check-then-route flow */}
            {['INTERESTED', 'QUOTATION', 'CONTACTED'].includes(lead.status) && (
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/crm/leads/${lead.id}/convert`, { method: 'POST' });
                    const data = await res.json();
                    onExit();
                    if (data.customerExists) {
                      navigate(`/quotation?customerId=${data.customerId}&leadId=${lead.id}`);
                    } else {
                      // No customer yet — go to LeadDetail where Convert modal fires
                      navigate(`/crm/leads/${lead.id}`);
                    }
                  } catch {
                    onExit();
                    navigate(`/crm/leads/${lead.id}`);
                  }
                }}
                style={{ ...S.btn('#6f42c1'), width: '100%', padding: 12, fontSize: 13 }}
              >
                Create Customer & Quotation →
              </button>
            )}
          </div>
        )}

        {/* Stage: not reached — reschedule with presets */}
        {stage === 'not_reached' && (
          <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#b91c1c', marginBottom: 10 }}>
              ❌ No Answer — Schedule a follow-up
            </div>
            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRescheduleDate(p.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: rescheduleDate === p.value ? '#dc2626' : '#fff',
                    color: rescheduleDate === p.value ? '#fff' : '#374151',
                    border: `1px solid ${rescheduleDate === p.value ? '#dc2626' : '#fca5a5'}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveReschedule} disabled={!rescheduleDate || submitting} style={{ ...S.btn('#f97316'), flex: 1, padding: 12, fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving…' : 'Schedule + Next →'}
              </button>
              <button onClick={goNext} style={{ ...S.btn('#f3f4f6', '#374151'), padding: '12px 16px', fontSize: 14, border: '1px solid #e5e7eb' }}>
                Skip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom action bar (only when idle) ── */}
      {stage === 'idle' && (
        <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 16px', flexShrink: 0 }}>
          <button
            onClick={handleCall}
            style={{ ...S.btn('#0066B3'), width: '100%', padding: 18, fontSize: 20, letterSpacing: '0.02em', marginBottom: 10, borderRadius: 10 }}
          >
            📞 Call Now
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`https://wa.me/${d}`}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, padding: 12, background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: 'center', display: 'block' }}
            >
              💬 WhatsApp
            </a>
            <button onClick={handleDone} disabled={submitting} style={{ ...S.btn('#16a34a'), flex: 1, padding: 12, fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
              ✓ Done + Next
            </button>
            <button onClick={goNext} style={{ ...S.btn('#f3f4f6', '#374151'), padding: '12px 16px', fontSize: 14, border: '1px solid #e5e7eb' }}>
              Skip →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

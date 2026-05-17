import React, { useState } from 'react';
import { computeSlaStatus, slaCountdown } from '../crmCockpit';
import {
  isTelecallerMode,
  isManagerMode,
  humanizeNextAction,
  wfStateLabel,
} from '../crmVisibility';

const DO_NOW_LIMIT = 5;

export default function LeadFollowupsPanel({
  lead,
  followups,
  decision,
  theme,
  inp,
  newFu,
  setNewFu,
  saving,
  onAddFollowUp,
  onCompleteManual,
  mode = 'telecaller',
}) {
  const [showAllDoNow, setShowAllDoNow] = useState(false);
  const [comingOpen, setComingOpen] = useState(!isTelecallerMode(mode));

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60_000);
  const fmtDue = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtRelative = (d) => {
    const diff = new Date(d) - now;
    const mins = Math.round(diff / 60000);
    if (mins < 0) {
      const ago = Math.abs(mins);
      if (ago < 60) return `${ago}m overdue`;
      if (ago < 1440) return `${Math.floor(ago / 60)}h overdue`;
      return `${Math.floor(ago / 1440)}d overdue`;
    }
    if (mins < 60) return `in ${mins}m`;
    if (mins < 1440) return `in ${Math.floor(mins / 60)}h`;
    return `in ${Math.floor(mins / 1440)}d`;
  };

  const open = followups.filter((f) => !f.is_completed);
  const doNow = open.filter((f) => {
    const due = new Date(f.due_date);
    return due < now || due <= in30;
  });
  const comingUp = open.filter((f) => {
    const due = new Date(f.due_date);
    return due > in30;
  });
  const completed = followups.filter((f) => f.is_completed);

  const slaStatus = computeSlaStatus(lead?.next_action_due_at);
  const countdown = slaCountdown(lead?.next_action_due_at);
  const isTerminal = ['CONVERTED', 'LOST'].includes(lead?.status);
  const na = decision?.nextAction;
  const visibleDoNow = showAllDoNow ? doNow : doNow.slice(0, DO_NOW_LIMIT);
  const hiddenDoNow = doNow.length - visibleDoNow.length;

  const CallbackItem = ({ f }) => {
    const isOverdue = new Date(f.due_date) < now;
    const isManual = !!f.created_by;
    return (
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 6,
          marginBottom: 6,
          background: isOverdue ? '#fff1f2' : theme?.surface || '#f8fafc',
          borderLeft: `3px solid ${isOverdue ? '#dc2626' : '#d1d5db'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#dc2626' : '#111' }}>
              {fmtDue(f.due_date)}
            </span>
            <span style={{ fontSize: 11, color: isOverdue ? '#dc2626' : '#6b7280' }}>({fmtRelative(f.due_date)})</span>
            {!isManual && isManagerMode(mode) && (
              <span style={{ fontSize: 9, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3 }}>AUTO</span>
            )}
          </div>
          {f.note && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{f.note}</p>}
          {!isManual && isTelecallerMode(mode) && (
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
              Log your call outcome above when done
            </p>
          )}
          {!isManual && isManagerMode(mode) && (
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
              Complete by logging a call outcome above
            </p>
          )}
        </div>
        {isManual && (
          <button
            type="button"
            onClick={() => onCompleteManual(f.id)}
            title="Manual callback only"
            style={{ padding: '3px 10px', background: 'none', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: 11, color: '#6b7280' }}
          >
            Mark done
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {!isTerminal && (slaStatus === 'OVERDUE' || slaStatus === 'CRITICAL') && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, fontWeight: 600, color: '#92400e' }}>
          {isTelecallerMode(mode) ? (
            <>⏰ Urgent follow-up{countdown ? ` · ${countdown.replace(/^Overdue by /, '').replace(/^Due in /, '')}` : ''}</>
          ) : (
            <>
              ⚠ {isManagerMode(mode) && !isTelecallerMode(mode) ? 'Overdue' : 'SLA breach'} — {countdown}
              {na?.label && ` · ${humanizeNextAction(na.label, mode)}`}
              {isManagerMode(mode) && lead?.workflow_state && (
                <span style={{ display: 'block', marginTop: 4, fontWeight: 500 }}>
                  {wfStateLabel(lead.workflow_state, mode)}
                </span>
              )}
            </>
          )}
        </div>
      )}

      <Section title="DO NOW" count={doNow.length + (slaStatus === 'OVERDUE' || slaStatus === 'CRITICAL' ? 1 : 0)} urgent>
        {visibleDoNow.length === 0 && slaStatus !== 'OVERDUE' && slaStatus !== 'CRITICAL' && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Nothing due in the next 30 minutes.</p>
        )}
        {visibleDoNow.map((f) => (
          <CallbackItem key={f.id} f={f} />
        ))}
        {hiddenDoNow > 0 && (
          <button
            type="button"
            onClick={() => setShowAllDoNow(true)}
            style={{ width: '100%', padding: '8px', marginTop: 4, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
          >
            +{hiddenDoNow} more callback{hiddenDoNow > 1 ? 's' : ''}
          </button>
        )}
      </Section>

      {comingUp.length > 0 && (
        <details open={comingOpen} onToggle={(e) => setComingOpen(e.target.open)} style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', marginBottom: 8 }}>
            COMING UP ({comingUp.length})
          </summary>
          {comingUp.map((f) => (
            <CallbackItem key={f.id} f={f} />
          ))}
        </details>
      )}

      {completed.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer' }}>
            History ({completed.length})
          </summary>
          <div style={{ marginTop: 8 }}>
            {completed.map((f) => (
              <div key={f.id} style={{ padding: '7px 10px', borderRadius: 5, marginBottom: 4, background: '#f9fafb', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                <span>{fmtDue(f.due_date)}{f.note ? ` — ${f.note}` : ''}</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>✓</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {!isTerminal && (
        <form onSubmit={onAddFollowUp} style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <input type="datetime-local" style={{ ...inp, width: 195 }} value={newFu.due_date} onChange={(e) => setNewFu((f) => ({ ...f, due_date: e.target.value }))} required />
          <input style={{ ...inp, flex: 1 }} placeholder="Callback reason (optional)" value={newFu.note} onChange={(e) => setNewFu((f) => ({ ...f, note: e.target.value }))} />
          <button type="submit" disabled={saving} style={{ padding: '9px 14px', background: theme?.primary || '#0066B3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            + Schedule
          </button>
        </form>
      )}
    </div>
  );
}

function Section({ title, count, urgent, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: urgent ? '#b91c1c' : '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {title} {count > 0 && `(${count})`}
      </div>
      {children}
    </div>
  );
}

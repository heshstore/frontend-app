import React from 'react';
import { computeSlaStatus, slaCountdown } from '../crmCockpit';
import {
  getMissionConfigHuman,
  urgencyLabel,
  isTelecallerMode,
  isManagerMode,
  isAdminMode,
  wfStateLabel,
} from '../crmVisibility';

const URGENCY_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };

export default function LeadMissionBlock({
  lead,
  decision,
  phoneDigits,
  theme,
  callStage,
  setCallStage,
  setCallSecs,
  setOutcomeMode,
  callSecs = 0,
  mode = 'telecaller',
  onManagerFocus,
  onCreateQuotation,
  fmtSecs,
}) {
  const na = decision?.nextAction;
  if (!na || na.action === 'NONE' || ['CONVERTED', 'LOST'].includes(lead?.status)) return null;

  const mission = getMissionConfigHuman(lead, decision, mode);
  const slaStatus = computeSlaStatus(lead?.next_action_due_at);
  const countdown = slaCountdown(lead?.next_action_due_at);
  const urgColor = URGENCY_COLOR[mission.urgency] || '#374151';
  const urgText = urgencyLabel(mission.urgency, mode);

  const handlePrimary = () => {
    if (mission.kind === 'manager') {
      onManagerFocus?.();
      return;
    }
    if (mission.kind === 'quotation') {
      onCreateQuotation?.();
      return;
    }
    if (!lead?.phone) return;
    window.location.href = `tel:+91${phoneDigits}`;
    setTimeout(() => {
      setCallStage?.('calling');
      setCallSecs?.(0);
    }, 600);
  };

  return (
    <div
      style={{
        padding: '14px 16px 16px',
        borderBottom: `3px solid ${urgColor}`,
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 2,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 0.6, marginBottom: 8 }}>
        WHAT SHOULD I DO NOW?
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginBottom: 6, lineHeight: 1.3 }}>
        {lead?.name || 'Customer'}
      </div>
      {lead?.product_interest && (
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8', marginBottom: 10 }}>
          📦 {lead.product_interest}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {urgText && (
          <span style={{ fontSize: 11, fontWeight: 700, color: urgColor }}>{urgText}</span>
        )}
        {countdown && (
          <span style={{ fontSize: 12, fontWeight: 700, color: urgColor, marginLeft: 'auto' }}>
            {isTelecallerMode(mode) && (slaStatus === 'OVERDUE' || slaStatus === 'CRITICAL')
              ? 'Urgent'
              : countdown.replace(/^Overdue by /, '').replace(/^Due in /, 'Due ')}
          </span>
        )}
      </div>

      {!isTelecallerMode(mode) && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
          Next: {mission.nextLabel}
        </div>
      )}

      {mission.script && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: urgColor, marginBottom: 4 }}>Script</div>
          <pre style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.65, color: '#1f2937' }}>
            {mission.script}
          </pre>
        </div>
      )}

      {callStage === 'idle' ? (
        <button
          type="button"
          onClick={handlePrimary}
          disabled={mission.kind === 'call' && !lead?.phone}
          style={{
            width: '100%',
            padding: '14px 16px',
            minHeight: 48,
            background: mission.kind === 'manager' ? '#7f1d1d' : mission.kind === 'quotation' ? '#6f42c1' : theme?.primary || '#0066B3',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            opacity: mission.kind === 'call' && !lead?.phone ? 0.5 : 1,
          }}
        >
          {mission.cta}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', fontFamily: 'monospace', background: '#e0f2fe', padding: '6px 12px', borderRadius: 6 }}>
            {callStage === 'calling' ? '📞' : callStage === 'connected' ? '✅' : '❌'} {fmtSecs ? fmtSecs(callSecs) : `${callSecs}s`}
          </span>
          {callStage === 'calling' && (
            <>
              <button type="button" onClick={() => setCallStage?.('connected')} style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Connected
              </button>
              <button type="button" onClick={() => { setCallStage?.('not_reached'); setOutcomeMode?.('NO_ANSWER'); }} style={{ padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                No Answer
              </button>
            </>
          )}
          <button type="button" onClick={() => { setCallStage?.('idle'); setCallSecs?.(0); }} style={{ marginLeft: 'auto', padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
            Reset
          </button>
        </div>
      )}

      {isManagerMode(mode) && lead?.workflow_state && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
          {isAdminMode(mode) ? (
            <span style={{ fontFamily: 'monospace' }}>Stage: {lead.workflow_state} · SLA: {slaStatus}</span>
          ) : (
            <span>Stage: {wfStateLabel(lead.workflow_state, mode)}</span>
          )}
        </div>
      )}
    </div>
  );
}

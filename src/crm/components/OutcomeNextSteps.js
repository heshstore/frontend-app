import React from 'react';

const GUIDES = {
  INTERESTED: {
    title: 'Customer is interested — do this next',
    steps: [
      { label: '💬 Send WhatsApp', kind: 'wa' },
      { label: '📄 Create Quotation', kind: 'quotation' },
      { label: '📅 Schedule callback', kind: 'later' },
    ],
  },
  NO_ANSWER: {
    title: 'No answer — follow this retry plan',
    steps: [
      { label: '⏰ Retry scheduled automatically', kind: 'info' },
      { label: '💬 Send WhatsApp fallback', kind: 'wa' },
      { label: '📞 Try alternate time slot', kind: 'call' },
    ],
    script: 'We tried reaching you regarding your enquiry. Please call back or reply on WhatsApp.',
  },
  LATER: {
    title: 'Callback locked — automation paused until then',
    steps: [
      { label: '⏸ No reminders until callback time', kind: 'info' },
      { label: '💬 Confirm timing on WhatsApp', kind: 'wa' },
    ],
  },
  NOT_INTERESTED: {
    title: 'Objection logged — recovery options',
    steps: [
      { label: '🛡 Review objection scripts below', kind: 'objection' },
      { label: '💬 Send soft follow-up WA', kind: 'wa' },
      { label: 'Mark lost if confirmed', kind: 'lost' },
    ],
  },
};

export default function OutcomeNextSteps({
  mode,
  waMessage,
  phoneDigits,
  onWaOpen,
  onCreateQuotation,
  onScheduleCallback,
  onMarkLost,
  onDismiss,
}) {
  const guide = mode ? GUIDES[mode] : null;
  const steps = guide?.steps || (waMessage ? [{ label: '💬 Send WhatsApp', kind: 'wa' }] : []);
  if (!steps.length) return null;

  return (
    <div style={{ padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #86efac' }}>
      {guide?.title && (
        <div style={{ fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 8 }}>{guide.title}</div>
      )}
      {guide?.script && (
        <pre style={{ margin: '0 0 10px', fontSize: 12, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 6, padding: 8, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          {guide.script}
        </pre>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s) => {
          if (s.kind === 'wa' && waMessage && phoneDigits) {
            return (
              <a
                key={s.label}
                href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noreferrer"
                onClick={onWaOpen}
                style={stepBtn('#25D366')}
              >
                {s.label}
              </a>
            );
          }
          if (s.kind === 'quotation') {
            return (
              <button key={s.label} type="button" onClick={onCreateQuotation} style={stepBtn('#6f42c1')}>
                {s.label}
              </button>
            );
          }
          if (s.kind === 'later') {
            return (
              <button key={s.label} type="button" onClick={onScheduleCallback} style={stepBtn('#92400e')}>
                {s.label}
              </button>
            );
          }
          if (s.kind === 'lost') {
            return (
              <button key={s.label} type="button" onClick={onMarkLost} style={stepBtn('#dc2626')}>
                {s.label}
              </button>
            );
          }
          if (s.kind === 'objection') {
            return <div key={s.label} style={{ fontSize: 12, color: '#374151' }}>{s.label}</div>;
          }
          return <div key={s.label} style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>;
        })}
      </div>
      <button type="button" onClick={onDismiss} style={{ marginTop: 10, fontSize: 11, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>
        Dismiss
      </button>
    </div>
  );
}

function stepBtn(bg) {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '9px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  };
}

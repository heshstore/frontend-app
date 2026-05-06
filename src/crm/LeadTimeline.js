import React, { useMemo } from 'react';
import { theme } from '../theme';

const SOURCE_LABELS = {
  DIRECT: 'Direct / Manual', INDIAMART: 'IndiaMart', META: 'Meta Ads',
  GOOGLE: 'Google', SHOPIFY: 'Shopify', WHATSAPP: 'WhatsApp',
  META_ADS: 'Meta Ads', GOOGLE_ADS: 'Google Ads', MANUAL: 'Direct / Manual',
};

const NOTE_ICONS = { CALL: '📞', EMAIL: '📧', WHATSAPP: '💬', GENERAL: '📝' };

const STATUS_COLORS = {
  NEW: '#ffc107', CONTACTED: '#0d6efd', INTERESTED: '#198754',
  QUOTATION: '#6f42c1', CONVERTED: '#198754', LOST: '#dc3545',
};

// Detect the intent of an outbound WhatsApp message from its content.
function waMessageType(body) {
  const b = (body || '').toLowerCase();
  if (b.includes('thank you for your enquiry') || (b.includes('namaste') && b.includes('received your request')))
    return { label: 'Greeting', color: '#dcfce7', textColor: '#15803d' };
  if (b.includes('follow-up overdue') || b.includes('follow up') || b.includes('overdue'))
    return { label: 'Follow-up reminder', color: '#fef9c3', textColor: '#854d0e' };
  if (b.includes('payment reminder') || b.includes('pending') || b.includes('outstanding'))
    return { label: 'Payment reminder', color: '#fef2f2', textColor: '#b91c1c' };
  if (b.includes('new lead assigned') || b.includes('lead assigned'))
    return { label: 'Lead assignment', color: '#e0f2fe', textColor: '#0369a1' };
  if (b.includes('interested') && b.includes('quotation'))
    return { label: 'Quotation prompt', color: '#f0e6ff', textColor: '#7e22ce' };
  if (b.includes('uncontacted') || b.includes('24 hours') || b.includes('not been contacted'))
    return { label: 'Missed lead alert', color: '#fff1f0', textColor: '#b91c1c' };
  return { label: 'Message', color: '#f3f4f6', textColor: '#6b7280' };
}

function fmtTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function Badge({ label, bg, color }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
      background: bg, color,
      padding: '1px 5px', borderRadius: 3,
    }}>
      {label}
    </span>
  );
}

function TypeChip({ label, color, textColor }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      background: color, color: textColor,
      padding: '1px 6px', borderRadius: 3,
    }}>
      {label}
    </span>
  );
}

function TimelineItem({ icon, title, sub, time, color, isAuto, msgType, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* Spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: color || '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 18, background: '#e5e7eb', marginTop: 2 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{title}</span>
          {isAuto && <Badge label="AUTO" bg="#e0f2fe" color="#0369a1" />}
          {msgType && <TypeChip label={msgType.label} color={msgType.color} textColor={msgType.textColor} />}
        </div>
        {sub && (
          <p style={{
            margin: '0 0 2px', fontSize: 12, color: theme.textMuted,
            lineHeight: 1.4, whiteSpace: 'pre-wrap',
            // Truncate long WA bodies
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>
            {sub}
          </p>
        )}
        <div style={{ fontSize: 11, color: theme.textMuted }}>{time}</div>
      </div>
    </div>
  );
}

export default function LeadTimeline({ lead, notes, followups, chatMessages }) {
  const events = useMemo(() => {
    const all = [];

    // ── Lead created ───────────────────────────────────────────────────────────
    all.push({
      ts:     lead.created_at,
      icon:   '🆕',
      title:  `Lead created — ${SOURCE_LABELS[lead.source] || lead.source}`,
      sub:    lead.product_interest || null,
      color:  '#dbeafe',
      isAuto: !lead.created_by,
    });

    // ── Activity notes ─────────────────────────────────────────────────────────
    for (const n of notes) {
      // Status-change note (contains "→")
      if (n.type === 'GENERAL' && typeof n.note === 'string' && n.note.includes('→')) {
        const match = n.note.match(/(\w+)\s*→\s*(\w+)/);
        if (match) {
          all.push({
            ts:     n.created_at,
            icon:   '🔄',
            title:  `Status: ${match[1]} → ${match[2]}`,
            sub:    null,
            color:  STATUS_COLORS[match[2]] ? `${STATUS_COLORS[match[2]]}33` : '#f3f4f6',
            isAuto: !n.created_by,
          });
          continue;
        }
      }
      all.push({
        ts:     n.created_at,
        icon:   NOTE_ICONS[n.type] || '📝',
        title:  `${n.type.charAt(0)}${n.type.slice(1).toLowerCase()} note`,
        sub:    n.note,
        color:  n.type === 'WHATSAPP' ? '#dcfce7' : n.type === 'CALL' ? '#fef9c3' : '#f3f4f6',
        isAuto: !n.created_by,
      });
    }

    // ── Follow-ups ─────────────────────────────────────────────────────────────
    for (const f of followups) {
      all.push({
        ts:     f.created_at,
        icon:   '📅',
        title:  'Follow-up scheduled',
        sub:    `Due: ${new Date(f.due_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}${f.note ? ` — ${f.note}` : ''}`,
        color:  '#f0fdf4',
        isAuto: !f.created_by,
      });
      if (f.is_completed && f.completed_at) {
        all.push({
          ts:     f.completed_at,
          icon:   '✅',
          title:  'Follow-up completed',
          color:  '#dcfce7',
          isAuto: false,
        });
      }
    }

    // ── WhatsApp messages ──────────────────────────────────────────────────────
    for (const m of (chatMessages || [])) {
      const isOutbound = m.direction === 'OUTBOUND';
      const isAutoMsg  = isOutbound && !m.sent_by;
      const msgType    = isOutbound ? waMessageType(m.body) : null;

      all.push({
        ts:      m.timestamp,
        icon:    isOutbound ? '📤' : '📥',
        title:   isOutbound ? 'WhatsApp sent' : 'WhatsApp received',
        sub:     m.body ? m.body.slice(0, 200) : null,
        color:   isOutbound ? '#dcfce7' : '#f0f9ff',
        isAuto:  isAutoMsg,
        msgType: msgType,
      });
    }

    // Sort oldest → newest
    all.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    return all;
  }, [lead, notes, followups, chatMessages]);

  if (!events.length) {
    return <p style={{ color: theme.textMuted, fontSize: 13 }}>No activity yet.</p>;
  }

  return (
    <div style={{ paddingTop: 4 }}>
      {events.map((ev, i) => (
        <TimelineItem
          key={i}
          icon={ev.icon}
          title={ev.title}
          sub={ev.sub || null}
          time={fmtTime(ev.ts)}
          color={ev.color}
          isAuto={ev.isAuto}
          msgType={ev.msgType || null}
          isLast={i === events.length - 1}
        />
      ))}
    </div>
  );
}

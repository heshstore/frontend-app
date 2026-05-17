import React, { useMemo } from 'react';
import { theme } from '../theme';
import { SOURCE_LABELS } from './crmSourceLabels';

// ── Note type display config ──────────────────────────────────────────────────
// SYSTEM notes are intentionally absent — they are filtered before rendering.

const NOTE_CFG = {
  CALL:     { icon: '📞', title: 'Call outcome',       color: '#fef9c3' },
  EMAIL:    { icon: '📧', title: 'Email',               color: '#e0f2fe' },
  WHATSAPP: { icon: '💬', title: 'WhatsApp',            color: '#dcfce7' },
  GENERAL:  { icon: '📝', title: 'Note',                color: '#f3f4f6' },
};

// Human-readable milestone labels for the journey (replaces raw status names)
const MILESTONE_LABELS = {
  NEW:        { label: 'Lead created',             icon: '🆕', color: '#dbeafe' },
  CONTACTED:  { label: 'Customer first contacted', icon: '📞', color: '#fef9c3' },
  INTERESTED: { label: 'Customer showed interest', icon: '💡', color: '#d1fae5' },
  QUOTATION:  { label: 'Quotation stage',          icon: '📄', color: '#ede9fe' },
  CONVERTED:  { label: 'Lead converted',           icon: '🎉', color: '#d1fae5' },
  LOST:       { label: 'Lead marked lost',         icon: '❌', color: '#fee2e2' },
};

// Classify outbound auto-WA messages by content for the journey reader
function waMessageType(body) {
  const b = (body || '').toLowerCase();
  if (b.includes('thank you for your enquiry') || (b.includes('namaste') && b.includes('received your request')))
    return { label: 'Greeting sent', color: '#dcfce7', textColor: '#15803d' };
  if (b.includes('follow-up overdue') || b.includes('follow up') || b.includes('overdue'))
    return { label: 'Follow-up reminder', color: '#fef9c3', textColor: '#854d0e' };
  if (b.includes('payment reminder') || b.includes('pending') || b.includes('outstanding'))
    return { label: 'Payment reminder', color: '#fef2f2', textColor: '#b91c1c' };
  if (b.includes('interested') && b.includes('quotation'))
    return { label: 'Quotation prompt', color: '#f0e6ff', textColor: '#7e22ce' };
  return null;
}

function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
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

// variant: 'default' | 'call' | 'inbound' | 'outbound' | 'operational'
function TimelineItem({ icon, title, sub, time, color, isAuto, msgType, author, isLast, noClamp, variant }) {
  const isInbound     = variant === 'inbound';
  const isOutbound    = variant === 'outbound';
  const isCall        = variant === 'call';
  const isOperational = variant === 'operational';

  // Card style varies by variant
  const cardStyle = isInbound
    ? { background: '#eff6ff', border: '1px solid #93c5fd', borderLeft: '3px solid #2563eb', borderRadius: 8, padding: '10px 12px' }
    : isCall
    ? { background: '#fefce8', border: '1px solid #fde68a', borderLeft: '3px solid #d97706', borderRadius: 8, padding: '10px 12px' }
    : isOutbound
    ? { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px' }
    : isOperational
    ? { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }
    : { background: '#fff', border: '1px solid #e9ecef', borderRadius: 8, padding: '10px 12px' };

  const titleColor  = isOperational ? '#9ca3af' : theme.text;
  const titleWeight = (isInbound || isCall) ? 700 : 600;
  const clampLines  = isOutbound ? 4 : 3;

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* Spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: isOperational ? 26 : 30,
          height: isOperational ? 26 : 30,
          borderRadius: '50%',
          background: color || '#e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isOperational ? 12 : 14,
          border: '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 18, background: '#e5e7eb', marginTop: 2 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : isOperational ? 12 : 18 }}>
        <div style={cardStyle}>
          {isInbound && (
            <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Customer says
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: sub ? 4 : 2 }}>
            <span style={{ fontSize: isOperational ? 12 : 13, fontWeight: titleWeight, color: titleColor }}>{title}</span>
            {isAuto && <Badge label="AUTO" bg="#e0f2fe" color="#0369a1" />}
            {msgType && <TypeChip label={msgType.label} color={msgType.color} textColor={msgType.textColor} />}
          </div>
          {sub && (
            <p style={{
              margin: '0 0 4px',
              fontSize: isInbound ? 14 : 12,
              color: isInbound ? '#1e3a5f' : theme.text,
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
              fontWeight: isInbound ? 500 : 400,
              ...(noClamp ? {} : {
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: clampLines, WebkitBoxOrient: 'vertical',
              }),
            }}>
              {sub}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: theme.textMuted }}>
            <span>{time}</span>
            {author && <span style={{ color: '#6b7280' }}>· {isInbound ? 'customer' : `by ${author}`}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Milestone divider (status progression events) ─────────────────────────────
function MilestoneItem({ icon, label, fromStatus, toStatus, time, isAuto, isLast }) {
  const cfg = MILESTONE_LABELS[toStatus] || { label, icon: '🔄', color: '#f3f4f6' };
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: cfg.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, border: '2px solid #fff', boxShadow: '0 0 0 1px #d1d5db',
          flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 18, background: '#e5e7eb', marginTop: 2 }} />
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{cfg.label}</span>
          {isAuto && <Badge label="AUTO" bg="#e0f2fe" color="#0369a1" />}
          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
            {fromStatus} → {toStatus}
          </span>
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted }}>{time}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadTimeline({ lead, notes, followups, chatMessages, users = [] }) {
  // Build user ID → name lookup from users list
  const userMap = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { if (u.id) m[u.id] = u.name; });
    return m;
  }, [users]);

  const events = useMemo(() => {
    const all = [];

    // ── Lead created ───────────────────────────────────────────────────────────
    all.push({
      type:    'item',
      ts:      lead.created_at,
      icon:    '🆕',
      title:   `Lead created — ${SOURCE_LABELS[lead.source] || lead.source}`,
      sub:     lead.product_interest || null,
      color:   '#dbeafe',
      isAuto:  !lead.created_by,
      variant: 'operational',
    });

    // ── Activity notes (SYSTEM type excluded — belongs in System Audit) ────────
    for (const n of notes) {
      if (n.type === 'SYSTEM') continue;

      // Legacy: GENERAL notes written by automation before SYSTEM type was introduced
      if (n.type === 'GENERAL' && typeof n.note === 'string') {
        if (/^Automation (paused|resumed|snoozed)/i.test(n.note)) continue;
        if (/whatsapp.*opened/i.test(n.note)) continue;
        if (/^Phone not provided/i.test(n.note)) continue;
        if (/whatsapp (down|unavailable)/i.test(n.note)) continue;
      }

      // Status-change milestone: GENERAL note containing "X → Y" pattern
      if (n.type === 'GENERAL' && typeof n.note === 'string' && n.note.includes('→')) {
        const match = n.note.match(/([A-Z_]+)\s*→\s*([A-Z_]+)/);
        if (match && MILESTONE_LABELS[match[2]]) {
          all.push({
            type:       'milestone',
            ts:         n.created_at,
            fromStatus: match[1],
            toStatus:   match[2],
            isAuto:     !n.created_by,
          });
          continue;
        }
      }

      const cfg  = NOTE_CFG[n.type] || NOTE_CFG.GENERAL;
      const auth = n.created_by ? userMap[n.created_by] : null;

      all.push({
        type:    'item',
        ts:      n.created_at,
        icon:    cfg.icon,
        title:   cfg.title,
        sub:     n.note,
        color:   cfg.color,
        isAuto:  !n.created_by,
        author:  auth || null,
        noClamp: n.type === 'CALL',
        variant: n.type === 'CALL' ? 'call' : 'default',
      });
    }

    // ── Follow-ups ─────────────────────────────────────────────────────────────
    for (const f of followups) {
      const fuTime = new Date(f.due_date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      all.push({
        type:    'item',
        ts:      f.created_at,
        icon:    '📅',
        title:   'Follow-up scheduled',
        sub:     `Due ${fuTime}${f.note ? ` — ${f.note}` : ''}`,
        color:   '#f0fdf4',
        isAuto:  !f.created_by,
        author:  f.created_by ? userMap[f.created_by] : null,
        variant: 'operational',
      });
      if (f.is_completed && f.completed_at) {
        all.push({
          type:    'item',
          ts:      f.completed_at,
          icon:    '✅',
          title:   'Follow-up completed',
          color:   '#dcfce7',
          isAuto:  false,
          variant: 'operational',
        });
      }
    }

    // ── WhatsApp messages (actual customer communication) ──────────────────────
    for (const m of (chatMessages || [])) {
      const isOut     = m.direction === 'OUTBOUND';
      const isAutoMsg = isOut && !m.sent_by;
      const senderName = m.sent_by ? (userMap[m.sent_by] || `User #${m.sent_by}`) : null;
      const msgType   = isOut ? waMessageType(m.body) : null;

      all.push({
        type:    'item',
        ts:      m.timestamp,
        icon:    isOut ? '📤' : '📥',
        title:   isOut ? (isAutoMsg ? 'Automated message sent' : 'Message sent') : 'Customer replied',
        sub:     m.body || null,
        color:   isOut ? '#dcfce7' : '#dbeafe',
        isAuto:  isAutoMsg,
        author:  senderName,
        msgType: msgType,
        noClamp: !isOut,
        variant: isOut ? 'outbound' : 'inbound',
      });
    }

    for (const ev of all) {
      if (ev.type === 'milestone') {
        ev.group = 'STATUS';
      } else if (ev.variant === 'call') {
        ev.group = 'CALL';
      } else if (ev.variant === 'inbound' || ev.variant === 'outbound') {
        ev.group = 'WHATSAPP';
      } else if (ev.title?.toLowerCase().includes('follow-up') || ev.title?.toLowerCase().includes('follow up')) {
        ev.group = 'FOLLOW_UP';
      } else if (/quotation|quote|proforma/i.test(`${ev.title} ${ev.sub || ''}`)) {
        ev.group = 'QUOTATION';
      } else if (/objection|not interested|negotiat/i.test(`${ev.title} ${ev.sub || ''}`)) {
        ev.group = 'CALL';
        ev.title = ev.title?.includes('Objection') ? ev.title : `Objection · ${ev.title}`;
      } else if (ev.variant === 'operational') {
        ev.group = 'FOLLOW_UP';
      } else {
        ev.group = 'CALL';
      }
    }

    all.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    return all;
  }, [lead, notes, followups, chatMessages, userMap]);

  if (!events.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🛤️</div>
        <p style={{ color: theme.textMuted, fontSize: 13 }}>No journey events yet.</p>
      </div>
    );
  }

  const GROUP_LABELS = {
    CALL: '📞 Call events',
    WHATSAPP: '💬 WhatsApp events',
    QUOTATION: '📄 Quotation events',
    STATUS: '🔄 Status events',
    FOLLOW_UP: '📅 Follow-up events',
  };
  const GROUP_ORDER = ['CALL', 'WHATSAPP', 'QUOTATION', 'STATUS', 'FOLLOW_UP'];
  let globalIdx = 0;

  return (
    <div style={{ paddingTop: 4 }}>
      {GROUP_ORDER.map((groupKey) => {
        const groupEvents = events.filter((e) => e.group === groupKey);
        if (!groupEvents.length) return null;
        return (
          <div key={groupKey} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
              {GROUP_LABELS[groupKey]}
            </div>
            {groupEvents.map((ev) => {
              const isLast = globalIdx === events.length - 1;
              const key = globalIdx++;
              if (ev.type === 'milestone') {
                return (
                  <MilestoneItem
                    key={key}
                    fromStatus={ev.fromStatus}
                    toStatus={ev.toStatus}
                    time={fmtTime(ev.ts)}
                    isAuto={ev.isAuto}
                    isLast={isLast}
                  />
                );
              }
              return (
                <TimelineItem
                  key={key}
                  icon={ev.icon}
                  title={ev.title}
                  sub={ev.sub || null}
                  time={fmtTime(ev.ts)}
                  color={ev.color}
                  isAuto={ev.isAuto}
                  msgType={ev.msgType || null}
                  author={ev.author || null}
                  noClamp={ev.noClamp || false}
                  variant={ev.variant || 'default'}
                  isLast={isLast}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

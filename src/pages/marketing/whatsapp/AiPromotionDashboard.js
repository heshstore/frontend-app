import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';
import { resolveWarmup, waSessionChip } from '../utils/whatsappStatus';

// ── Animation keyframes (injected once at module load) ────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('qa-promo-styles')) {
  const s = document.createElement('style');
  s.id = 'qa-promo-styles';
  s.textContent = `
    @keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.45}}
    @keyframes qaSlideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(s);
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '16px 20px',
};
const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 12,
};
const th = {
  padding: '9px 12px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: 11,
  whiteSpace: 'nowrap',
};
const td = {
  padding: '8px 12px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 12,
  verticalAlign: 'middle',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN'); } catch { return ts; }
}
function fmtTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
}
function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return ts; }
}
function ago(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return fmtDate(ts);
}
function pill(label, bg, fg) {
  return (
    <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
      {label}
    </span>
  );
}

const STATUS_COLORS = {
  running:             { bg: '#dcfce7', fg: '#166534' },
  completed:           { bg: '#eff6ff', fg: '#1d4ed8' },
  partially_completed: { bg: '#fef9c3', fg: '#854d0e' },
  paused:              { bg: '#fff7ed', fg: '#c2410c' },
  failed:              { bg: '#fee2e2', fg: '#991b1b' },
  draft:               { bg: '#f3f4f6', fg: '#6b7280' },
  cancelled:           { bg: '#f3f4f6', fg: '#6b7280' },
  sent:                { bg: '#dcfce7', fg: '#166534' },
  pending:             { bg: '#dbeafe', fg: '#1d4ed8' },
  skipped:             { bg: '#f3f4f6', fg: '#6b7280' },
};
function StatusPill({ status, skipReason }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  const label = status === 'skipped' && skipReason
    ? skipReason
    : status.toUpperCase().replace(/_/g, ' ');
  return pill(label, c.bg, c.fg);
}

// ── Mobile detection ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile;
}

// ── Preview view button ────────────────────────────────────────────────────────
function PreviewButton({ isOpen, hasContent, onClick }) {
  if (!hasContent) return <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>;
  return (
    <button
      onClick={onClick}
      title={isOpen ? 'Close preview' : 'View message preview'}
      style={{
        background: isOpen ? '#ede9fe' : '#f1f5f9',
        border: 'none',
        borderRadius: 6,
        padding: '4px 10px',
        cursor: 'pointer',
        fontSize: 12,
        color: isOpen ? '#7c3aed' : '#64748b',
        fontWeight: 600,
        transition: 'background 0.15s, color 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {isOpen ? '✕ Close' : '👁 View'}
    </button>
  );
}

// ── Preview skeleton (shown briefly on expand) ────────────────────────────────
function PreviewSkeleton() {
  const pulse = { background: '#e2e8f0', borderRadius: 6, animation: 'skeletonPulse 1.4s ease infinite' };
  return (
    <div style={{ display: 'flex', gap: 16, padding: '16px 20px', alignItems: 'flex-start' }}>
      <div style={{ ...pulse, width: 220, height: 200, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <div style={{ ...pulse, height: 12, width: '55%' }} />
        <div style={{ ...pulse, height: 10, width: '35%' }} />
        <div style={{ ...pulse, height: 10, width: '70%' }} />
        <div style={{ ...pulse, height: 10, width: '45%' }} />
      </div>
    </div>
  );
}

// ── Metadata row inside expanded panel ────────────────────────────────────────
function ExpandMeta({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
      <span style={{ color: '#64748b', fontWeight: 600, minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1e293b', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  );
}

// ── Expandable preview row (desktop) ──────────────────────────────────────────
function ExpandedPreviewRow({ row, colSpan, isLoading }) {
  const [visible, setVisible] = useState(false);
  const rowRef = useRef(null);
  const hasPreview = !!(row.message_body || row.generated_message || row.product_image);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <tr ref={rowRef}>
      <td colSpan={colSpan} style={{ padding: 0, background: '#fafbff' }}>
        <div style={{
          maxHeight: visible ? '700px' : '0',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: 'max-height 0.26s ease, opacity 0.2s ease',
          borderLeft: '3px solid #25D366',
          borderBottom: '2px solid #e2e8f0',
        }}>
          {isLoading ? <PreviewSkeleton /> : (
            <div style={{ padding: '16px 20px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {hasPreview && (
                <div style={{ flexShrink: 0 }}>
                  <WhatsAppMessagePreview
                    imageUrl={row.product_image}
                    messageBody={row.message_body}
                    generatedMessage={row.generated_message}
                    sku={row.product_sku}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Message Detail
                </div>
                <ExpandMeta label="Customer"   value={`${row.customer_name} · ${row.customer_phone}`} />
                {row.product_title && (
                  <ExpandMeta
                    label="Product"
                    value={row.product_title !== row.product_sku ? `${row.product_title} (${row.product_sku ?? '—'})` : (row.product_sku ?? '—')}
                    mono
                  />
                )}
                {row.telecaller_phone && <ExpandMeta label="Telecaller" value={row.telecaller_phone} mono />}
                <ExpandMeta label="Status"    value={<StatusPill status={row.queue_status} skipReason={row.skip_reason} />} />
                {row.sent_at && <ExpandMeta label="Sent" value={fmt(row.sent_at)} />}
                {row.product_url && (
                  <a
                    href={row.product_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 4, color: '#0d6efd', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    🛍 View Product
                  </a>
                )}
                {row.replied && row.reply_message && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 11, color: '#166534', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Reply received:</div>
                    {row.reply_message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile bottom sheet preview ────────────────────────────────────────────────
function MobilePreviewSheet({ row, onClose }) {
  const hasPreview = !!(row.message_body || row.generated_message || row.product_image);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '14px 16px 36px',
        zIndex: 1001,
        maxHeight: '86vh',
        overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        animation: 'qaSlideIn 0.22s ease',
      }}>
        <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{row.customer_name}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
              {row.product_sku && row.product_sku !== '—' ? row.product_sku : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>
        {hasPreview && (
          <div style={{ marginBottom: 16 }}>
            <WhatsAppMessagePreview
              imageUrl={row.product_image}
              messageBody={row.message_body}
              generatedMessage={row.generated_message}
              sku={row.product_sku}
            />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ExpandMeta label="Status"     value={<StatusPill status={row.queue_status} skipReason={row.skip_reason} />} />
          <ExpandMeta label="Sent"       value={row.sent_at ? fmt(row.sent_at) : '—'} />
          {row.telecaller_phone && <ExpandMeta label="Telecaller" value={row.telecaller_phone} mono />}
          {row.product_url && (
            <a href={row.product_url} target="_blank" rel="noreferrer" style={{ color: '#0d6efd', fontSize: 12, marginTop: 4 }}>
              🛍 View Product
            </a>
          )}
          {row.replied && row.reply_message && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#166534', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Reply received:</div>
              {row.reply_message}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Section A: Engine Status ───────────────────────────────────────────────────
function SectionA({ data }) {
  if (!data) return null;
  const s = data;
  const runningColor = s.running ? '#16a34a' : '#dc3545';
  const runningBg    = s.running ? '#dcfce7'  : '#fee2e2';

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>A — AI Engine Status</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Kv label="Engine">
          <span style={{ background: runningBg, color: runningColor, padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
            {s.running ? '● RUNNING' : '○ STOPPED'}
          </span>
        </Kv>
        <Kv label="Last AI Run"      value={ago(s.last_ai_run)} />
        <Kv label="Next AI Run"      value={fmtTime(s.next_ai_run)} />
        <Kv label="Engine Ran Today">
          <span style={{ color: s.engine_ran_today ? '#16a34a' : '#dc3545', fontWeight: 700, fontSize: 12 }}>
            {s.engine_ran_today ? 'Yes' : 'No'}
          </span>
        </Kv>
        <Kv label="Autonomous Mode">
          <span style={{ color: s.autonomous_mode ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
            {s.autonomous_mode ? 'ON' : 'OFF'}
          </span>
        </Kv>
        <Kv label="Test-Only Mode"   value={s.test_only_mode ? 'Yes' : 'No'} />
        <Kv label="Validation Mode">
          <span style={{ color: s.validation_mode_on ? '#d97706' : '#9ca3af', fontWeight: 700, fontSize: 12 }}>
            {s.validation_mode_on ? 'ON' : 'OFF'}
          </span>
        </Kv>
        {s.validation_mode_on && (
          <Kv label="Validation Contacts">
            <span style={{ color: '#d97706', fontWeight: 700, fontSize: 12 }}>
              {s.validation_contacts_active} active
            </span>
          </Kv>
        )}
        <Kv label="Numbers">
          <span style={{ color: s.connected_numbers > 0 ? '#16a34a' : '#dc3545', fontWeight: 700 }}>
            {s.connected_numbers} / {s.total_numbers} connected
          </span>
        </Kv>
      </div>
      {s.numbers?.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {s.numbers.map(n => {
            const chip = waSessionChip(n.wa_state, n.connected);
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: n.connected ? '#16a34a' : '#9ca3af', fontWeight: 700, fontSize: 10 }}>
                  {n.connected ? '●' : '○'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151', minWidth: 110 }}>{n.phone}</span>
                <span style={{ background: chip.bg, color: chip.color, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                  {chip.label}
                </span>
                {n.partial_session && (
                  <span style={{ fontSize: 9, color: '#854d0e', background: '#fef9c3', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                    PARTIAL
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section B: Today's Activity (per telecaller) ──────────────────────────────
function SectionB({ byTelecaller, fleetSummary }) {
  if (!byTelecaller?.length) {
    return (
      <div style={{ ...card }}>
        <div style={sectionTitle}>B — Today's Activity</div>
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No active telecallers configured.</div>
      </div>
    );
  }

  const metricDefs = [
    { key: 'messages_sent',   label: 'Messages Sent Today', color: '#16a34a' },
    { key: 'replies',         label: 'Replies',             color: '#0891b2' },
    { key: 'leads_created',   label: 'Leads Created',       color: '#d97706' },
    { key: 'not_on_whatsapp', label: 'Not On WhatsApp',     color: '#9ca3af' },
    { key: 'failures',        label: 'Failures',            color: '#dc3545' },
    { key: 'pending_queue',   label: 'Pending Queue',       color: '#6d28d9' },
  ];

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>B — Today's Activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {byTelecaller.map((tc, idx) => (
          <div key={tc.number_id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', background: '#fafbfc' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Telecaller {idx + 1}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#111827' }}>{tc.phone}</span>
              {tc.name && <span style={{ fontSize: 11, color: '#64748b' }}>{tc.name}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {metricDefs.map(({ key, label, color }) => {
                const value = tc[key] ?? 0;
                const valColor = key === 'failures' && value === 0 ? '#9ca3af' : color;
                return (
                  <div key={key} style={{ textAlign: 'center', padding: '10px 6px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: valColor }}>{value}</div>
                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {fleetSummary?.queue_items > 0 && fleetSummary?.campaigns_created === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#854d0e', background: '#fef9c3', padding: '6px 10px', borderRadius: 6 }}>
          Queue rows exist but no autonomous campaigns created yet — campaigns will be created on next engine run.
        </div>
      )}
    </div>
  );
}

// ── WhatsApp Message Preview ───────────────────────────────────────────────────
function WhatsAppMessagePreview({ imageUrl, messageBody, generatedMessage, sku }) {
  const [imgErr, setImgErr] = useState(false);
  const body = messageBody || generatedMessage;
  if (!body && !imageUrl) {
    return <span style={{ color: '#9ca3af', fontSize: 10 }}>Awaiting generation…</span>;
  }
  return (
    <div style={{
      background: '#dcf8c6',
      borderRadius: '0 8px 8px 8px',
      padding: '0 10px 8px 10px',
      maxWidth: 260,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      border: '1px solid #b7ddb0',
      position: 'relative',
    }}>
      {/* WhatsApp green accent strip */}
      <div style={{ height: 3, background: '#25D366', borderRadius: '0 0 0 0', margin: '0 -10px 8px -10px' }} />

      {/* Product image thumbnail */}
      {imageUrl && !imgErr && (
        <img
          src={imageUrl}
          alt={sku || 'product'}
          onError={() => setImgErr(true)}
          style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}
        />
      )}
      {(!imageUrl || imgErr) && sku && sku !== '—' && (
        <div style={{ fontSize: 9, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
          SKU: {sku}
        </div>
      )}

      {/* Message body */}
      {body && (
        <div style={{ whiteSpace: 'pre-wrap', color: '#1a1a1a', lineHeight: 1.45, fontSize: 11, wordBreak: 'break-word' }}>
          {body}
        </div>
      )}

      {/* Read receipt ticks */}
      <div style={{ textAlign: 'right', marginTop: 4, fontSize: 9, color: '#53bdeb' }}>✓✓</div>
    </div>
  );
}

// ── Validation Result Card ─────────────────────────────────────────────────────
function ValidationResultCard({ runResult, dashData, onDismiss }) {
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const isMobile = useIsMobile();

  if (!runResult) return null;

  const { promo_id, audience_count, queued: initialQueued, cleanup } = runResult;

  const campaigns  = dashData?.campaigns?.filter(c => c.promo_id === promo_id) ?? [];
  const queueRows  = dashData?.campaign_queue_detail?.filter(r => r.promo_id === promo_id) ?? [];

  const totalQueued  = campaigns.reduce((s, c) => s + c.total_queue, 0) || initialQueued || 0;
  const totalSent    = campaigns.reduce((s, c) => s + c.sent,        0);
  const totalReplies = campaigns.reduce((s, c) => s + c.replies,     0);
  const totalFailed  = campaigns.reduce((s, c) => s + c.failed,      0);
  const totalPending = campaigns.reduce((s, c) => s + c.pending,     0);
  const totalSkipped = campaigns.reduce((s, c) => s + c.skipped,     0);

  const isComplete = totalPending === 0 && totalQueued > 0;
  const verdict    = !isComplete ? 'PENDING'
    : totalQueued > 0 && totalFailed === 0 ? 'PASS' : 'FAIL';
  const verdictColor = verdict === 'PASS' ? '#16a34a' : verdict === 'FAIL' ? '#dc3545' : '#d97706';
  const verdictBg    = verdict === 'PASS' ? '#dcfce7' : verdict === 'FAIL' ? '#fee2e2' : '#fef9c3';
  const cardBg       = verdict === 'PASS' ? '#f0fdf4' : verdict === 'FAIL' ? '#fff5f5' : '#fffbeb';
  const borderColor  = verdict === 'PASS' ? '#86efac' : verdict === 'FAIL' ? '#fca5a5' : '#fde68a';

  // Telecaller distribution: one row per campaign/number
  const byTelecaller = campaigns.map(c => ({
    phone:   c.telecaller_phone ?? '—',
    queue:   c.total_queue,
    sent:    c.sent,
    replies: c.replies,
    failed:  c.failed,
    pending: c.pending,
  }));

  const handleToggle = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingId(id);
    setTimeout(() => setLoadingId(null), 220);
  };

  const mobileRow = isMobile && expandedId
    ? queueRows.find(r => r.queue_id === expandedId) ?? null
    : null;

  return (
    <div style={{ ...card, background: cardBg, border: `2px solid ${borderColor}`, marginBottom: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
            Validation Result
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#111827' }}>{promo_id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: verdictBg, color: verdictColor, fontWeight: 800, fontSize: 15, padding: '5px 18px', borderRadius: 8 }}>
            {verdict === 'PASS' ? '✓ PASS' : verdict === 'FAIL' ? '✗ FAIL' : '⌛ PENDING'}
          </span>
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Flow status strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14, fontSize: 11 }}>
        {cleanup && (cleanup.campaigns_deleted > 0 || cleanup.queue_rows_deleted > 0 || cleanup.message_logs_deleted > 0) ? (
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
            ✓ Cleared {cleanup.campaigns_deleted} campaign{cleanup.campaigns_deleted !== 1 ? 's' : ''} · {cleanup.queue_rows_deleted} queue row{cleanup.queue_rows_deleted !== 1 ? 's' : ''} · {cleanup.message_logs_deleted} msg log{cleanup.message_logs_deleted !== 1 ? 's' : ''} · {cleanup.audit_logs_deleted} audit log{cleanup.audit_logs_deleted !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
            ✓ No previous artifacts
          </span>
        )}
        <span style={{ color: '#94a3b8' }}>→</span>
        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          ✓ Campaign created
        </span>
        <span style={{ color: '#94a3b8' }}>→</span>
        <span style={{ background: initialQueued > 0 ? '#dcfce7' : '#fee2e2', color: initialQueued > 0 ? '#166534' : '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          {initialQueued > 0 ? `✓ Queued ${initialQueued}` : '✗ Queue empty'}
        </span>
        <span style={{ color: '#94a3b8' }}>→</span>
        <span style={{ background: initialQueued > 0 ? '#dbeafe' : '#f3f4f6', color: initialQueued > 0 ? '#1d4ed8' : '#9ca3af', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          {initialQueued > 0 ? '▶ Launched — sending on next tick' : '— Not launched'}
        </span>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Queue Created', value: totalQueued,  color: '#6d28d9' },
          { label: 'Audience',      value: audience_count, color: '#0891b2' },
          { label: 'Sent',          value: totalSent,    color: '#16a34a' },
          { label: 'Replies',       value: totalReplies, color: '#0d6efd' },
          { label: 'Failures',      value: totalFailed,  color: totalFailed > 0 ? '#dc3545' : '#9ca3af' },
          { label: 'Skipped',       value: totalSkipped, color: '#9ca3af' },
          { label: 'Pending',       value: totalPending, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 6px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Telecaller Distribution */}
      {byTelecaller.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            Telecaller Distribution
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Telecaller', 'Queue', 'Sent', 'Replies', 'Failures', 'Pending'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byTelecaller.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{r.phone}</td>
                    <td style={td}>{r.queue}</td>
                    <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>{r.sent}</td>
                    <td style={{ ...td, color: '#0d6efd' }}>{r.replies}</td>
                    <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
                    <td style={{ ...td, color: '#d97706' }}>{r.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-contact detail — compact rows with expandable preview */}
      {queueRows.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            Per-Contact Detail
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Customer', 'Telecaller', 'Product', 'Status', 'Sent', 'Read', 'Replied', 'Preview'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueRows.map(r => (
                  <React.Fragment key={r.queue_id}>
                    <tr style={{ background: r.replied ? '#f0fdf4' : undefined }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{r.customer_name}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{r.customer_phone}</div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.telecaller_phone}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6d28d9' }}>
                        {r.product_sku !== '—' ? r.product_sku : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={td}><StatusPill status={r.queue_status} skipReason={r.skip_reason} /></td>
                      <td style={{ ...td, color: '#64748b', fontSize: 11 }}>{r.sent_at ? fmtTime(r.sent_at) : '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {r.read
                          ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {r.replied
                          ? <span title={r.reply_message ?? ''} style={{ color: '#0d6efd', fontWeight: 700, cursor: 'help' }}>✓</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <PreviewButton
                          isOpen={expandedId === r.queue_id}
                          hasContent={!!(r.message_body || r.generated_message || r.product_image)}
                          onClick={() => handleToggle(r.queue_id)}
                        />
                      </td>
                    </tr>
                    {!isMobile && expandedId === r.queue_id && (
                      <ExpandedPreviewRow row={r} colSpan={8} isLoading={loadingId === r.queue_id} />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {queueRows.length === 0 && totalQueued > 0 && (
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
          Queue created — refreshing contact detail… (auto-updates every 15s)
        </div>
      )}

      {mobileRow && <MobilePreviewSheet row={mobileRow} onClose={() => setExpandedId(null)} />}
    </div>
  );
}

// ── Audience Status bar ────────────────────────────────────────────────────────
function SectionAudienceStatus({ status, dbCounts, queueBuiltToday }) {
  // status = audience_status (new backend) or fall back to database_counts (current VPS)
  const resolved = status ?? dbCounts ?? null;
  if (!resolved) return null;
  const { promotional_db_count, customer_db_count, eligible_audience_today } = resolved;
  const chip = (label, value, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 22px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 120 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#1e293b', lineHeight: 1.1 }}>{value?.toLocaleString() ?? '—'}</div>
      <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 3, textAlign: 'center' }}>{label}</div>
    </div>
  );
  return (
    <div style={{ ...card, padding: '14px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Audience Overview</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {chip('Promotional DB', promotional_db_count, '#1e293b')}
        {chip('Customer DB', customer_db_count, '#374151')}
        {chip('Eligible Today', eligible_audience_today, '#16a34a')}
        {chip('Queue Built Today', queueBuiltToday, '#0d6efd')}
      </div>
    </div>
  );
}

// ── Section C: AI Campaigns ────────────────────────────────────────────────────
function SectionC({ campaigns, todayQueueByTelecaller, isInconsistent }) {
  const validationToday = campaigns?.filter(c => c.is_validation && c.is_today) ?? [];
  const regularToday    = campaigns?.filter(c => !c.is_validation && c.is_today) ?? [];

  return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>C — AI Campaigns</div>

      {/* TODAY block */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8 }}>
          TODAY — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {/* Validation campaigns (today) */}
        {validationToday.length > 0 && (
          <div style={{ marginBottom: 12, background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Validation Campaigns ({validationToday.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Campaign ID', 'Status', 'Telecaller', 'Created', 'Queued', 'Sent', 'Replies', 'Failed', 'Products'].map(h => (
                      <th key={h} style={{ ...th, background: '#dbeafe', color: '#1e40af' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validationToday.map(c => (
                    <CampaignRow key={c.id} c={c} highlight validation />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DASHBOARD DATA INCONSISTENT banner */}
        {isInconsistent && (
          <div style={{ marginBottom: 12, background: '#fff7ed', border: '2px solid #f97316', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 13, marginBottom: 4 }}>
              ⚠ DASHBOARD DATA INCONSISTENT
            </div>
            <div style={{ fontSize: 12, color: '#7c2d12', marginBottom: todayQueueByTelecaller?.length > 0 ? 10 : 0 }}>
              Queue rows exist today but 0 AI campaigns were created. Every AI queue row must belong to a campaign.
              Campaigns will be auto-created and linked on the next engine run (08:30 IST) or server restart.
            </div>
            {todayQueueByTelecaller?.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 700, marginBottom: 6 }}>
                  TODAY'S QUEUE ACTIVITY — direct from queue table (campaign ID not yet assigned)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Telecaller', 'Queue', 'Sent', 'Pending', 'Failed', 'Skipped', 'Products'].map(h => (
                          <th key={h} style={{ ...th, background: '#ffedd5', color: '#9a3412' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayQueueByTelecaller.map(r => (
                        <tr key={r.number_id} style={{ background: '#fff7ed' }}>
                          <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>
                            {r.telecaller_phone}
                          </td>
                          <td style={td}>{r.total}</td>
                          <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>{r.sent}</td>
                          <td style={{ ...td, color: '#0d6efd' }}>{r.pending}</td>
                          <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
                          <td style={{ ...td, color: '#9ca3af' }}>{r.skipped}</td>
                          <td style={{ ...td, color: '#7c3aed' }}>
                            {r.product_skus?.length > 0
                              ? `${r.product_skus.length} SKU${r.product_skus.length > 1 ? 's' : ''}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {regularToday.length === 0 && !isInconsistent ? (
          <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>
            No autonomous campaigns created today — engine will create them on next run at 8:30 AM IST.
          </div>
        ) : regularToday.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Campaign ID', 'Status', 'Telecaller', 'Created', 'Queued', 'Sent', 'Replies', 'Failed', 'Products Used'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regularToday.map(c => (
                  <CampaignRow key={c.id} c={c} highlight />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CampaignRow({ c, highlight, validation }) {
  const sentPct = c.total_queue > 0 ? Math.round((c.sent / c.total_queue) * 100) : 0;
  const rowBg   = validation ? '#eff6ff' : highlight ? '#f0fdf4' : undefined;
  return (
    <tr style={{ background: rowBg }}>
      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: validation ? '#1d4ed8' : '#0d6efd' }}>
        {c.promo_id}
        {validation && <span style={{ marginLeft: 5, fontSize: 9, background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>VALIDATION</span>}
        {c.test_mode && !validation && <span style={{ marginLeft: 5, fontSize: 9, background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>TEST</span>}
      </td>
      <td style={td}><StatusPill status={c.status} /></td>
      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>
        {c.telecaller_phone ?? <span style={{ color: '#9ca3af' }}>—</span>}
      </td>
      <td style={{ ...td, color: '#64748b', fontSize: 11 }}>
        {highlight ? fmtTime(c.created_at) : fmtDate(c.created_at)}
      </td>
      <td style={td} title="Actual queue rows built in DB (150 planned per number; sending limited by warmup stage budget)">{c.total_queue}</td>
      <td style={td}>
        <span style={{ color: '#16a34a', fontWeight: 700 }}>{c.sent}</span>
        <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 3 }}>({sentPct}%)</span>
      </td>
      <td style={td}>{c.replies}</td>
      <td style={td}><span style={{ color: c.failed > 0 ? '#dc3545' : '#94a3b8' }}>{c.failed}</span></td>
      <td style={td}>
        {c.products_used > 0
          ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{c.products_used} SKU{c.products_used > 1 ? 's' : ''}</span>
          : <span style={{ color: '#9ca3af' }}>—</span>}
      </td>
    </tr>
  );
}

// ── Section D: Campaign Queue Detail ──────────────────────────────────────────
function SectionD({ data, nested }) {
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId,  setLoadingId]  = useState(null);
  const isMobile = useIsMobile();

  const handleToggle = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingId(id);
    setTimeout(() => setLoadingId(null), 220);
  };

  const mobileRow = isMobile && expandedId
    ? (data ?? []).find(r => r.queue_id === expandedId) ?? null
    : null;

  if (!data?.length) {
    if (nested) return <div style={{ color: '#9ca3af', fontSize: 12, padding: '4px 0' }}>No rows found.</div>;
    return (
      <div style={{ ...card }}>
        <div style={sectionTitle}>D — Campaign Queue Detail (Today)</div>
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>No queue items for today.</div>
      </div>
    );
  }

  const inner = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {!nested && <div style={sectionTitle}>D — Campaign Queue Detail (Today)</div>}
        <span style={{ fontSize: 11, color: '#64748b' }}>{data.length} messages</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Customer', 'Product SKU', 'Product Title', 'Status', 'Sent Time', 'Read', 'Replied', 'Lead', 'Telecaller', 'Preview'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <React.Fragment key={r.queue_id}>
                <tr style={{ background: r.replied ? '#f0fdf4' : r.lead_created ? '#fffbeb' : undefined }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{r.customer_name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{r.customer_phone}</div>
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6d28d9' }}>{r.product_sku}</td>
                  <td style={{ ...td, maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                      {r.product_title !== r.product_sku ? r.product_title : '—'}
                    </div>
                  </td>
                  <td style={td}><StatusPill status={r.queue_status} skipReason={r.skip_reason} /></td>
                  <td style={{ ...td, color: '#64748b', fontSize: 11 }}>{r.sent_at ? fmtTime(r.sent_at) : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {r.read ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {r.replied ? (
                      <span title={r.reply_message ?? ''} style={{ color: '#0d6efd', fontWeight: 700, cursor: 'help' }}>✓</span>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {r.lead_created ? <span style={{ color: '#d97706', fontWeight: 700 }}>✓</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.telecaller_phone}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <PreviewButton
                      isOpen={expandedId === r.queue_id}
                      hasContent={!!(r.message_body || r.generated_message || r.product_image)}
                      onClick={() => handleToggle(r.queue_id)}
                    />
                  </td>
                </tr>
                {!isMobile && expandedId === r.queue_id && (
                  <ExpandedPreviewRow row={r} colSpan={10} isLoading={loadingId === r.queue_id} />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {mobileRow && <MobilePreviewSheet row={mobileRow} onClose={() => setExpandedId(null)} />}
    </>
  );

  return nested
    ? <div style={{ marginTop: 4 }}>{inner}</div>
    : <div style={{ ...card }}>{inner}</div>;
}

// ── Section E: Telecaller Performance ─────────────────────────────────────────
function SectionE({ data, engineStatus, campaigns }) {
  // Always use engine_status.numbers as the source of truth — never hides zero-activity telecallers
  const allNumbers = engineStatus?.numbers ?? [];

  // Lookup: number_id → today's performance row (backend already LEFT JOINs from whatsapp_numbers)
  const perfMap = new Map((data ?? []).map(r => [r.number_id, r]));

  // Lookup: telecaller_number_id → today's non-validation campaign
  const campByNumber = new Map();
  for (const c of (campaigns ?? [])) {
    if (c.is_today && !c.is_validation && c.telecaller_number_id) {
      campByNumber.set(c.telecaller_number_id, c);
    }
  }

  const rows = allNumbers.map(n => {
    const perf   = perfMap.get(n.id) ?? {};
    const camp   = campByNumber.get(n.id);
    return {
      id:             n.id,
      phone:          n.phone,
      name:           n.name,
      connection:     perf.connection_status ?? n.number_state ?? (n.connected ? 'CONNECTED' : 'DISCONNECTED'),
      connected:      perf.connected ?? n.connected,
      wa_state:       perf.wa_state ?? n.wa_state,
      warmup_level:   perf.warmup_level ?? n.warmup_level,
      warmup_label:   perf.warmup_label ?? `L${perf.warmup_level ?? n.warmup_level}`,
      release_allowance: perf.release_allowance ?? perf.daily_cap ?? 0,
      daily_cap:      perf.release_allowance ?? perf.daily_cap ?? 0,
      health_score:   perf.health_score ?? null,
      warnings:       perf.warnings ?? [],
      campaign:       camp?.promo_id ?? perf.promo_id ?? null,
      sent:           perf.sent_today ?? perf.sent ?? 0,
      delivered:      perf.delivered_today ?? 0,
      read:           perf.read_today ?? 0,
      replies:        perf.replies_today ?? camp?.replies ?? 0,
      failed:         perf.failed_today ?? perf.failed ?? 0,
      remaining:      perf.remaining_allowance ?? perf.remaining_today ?? perf.capacity_remaining ?? 0,
      queueAssigned:  perf.queue_assigned ?? perf.total ?? 0,
      queueWaiting:   perf.queue_waiting ?? perf.queue_pending ?? perf.pending ?? 0,
      queuePending:   perf.queue_waiting ?? perf.queue_pending ?? perf.pending ?? 0,
      lastActivity:   perf.last_activity ?? null,
    };
  });

  if (!rows.length) return (
    <div style={{ ...card }}>
      <div style={sectionTitle}>E — Telecaller Performance (Today)</div>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>No telecallers configured.</div>
    </div>
  );

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={sectionTitle}>E — Telecaller Performance (Today)</div>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Read &amp; Reply counts shown for information only — cold outreach may take 3–5 days</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Telecaller', 'Campaign', 'Connection', 'Warmup', 'Send Budget', 'Sent', 'Delivered', 'Read', 'Replies', 'Failed', 'Remaining', 'Queue Waiting', 'Health', 'Warnings', 'Last Activity'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const stateChip = waSessionChip(r.connection, r.connected);
              return (
              <tr key={r.id}>
                <td style={td}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{r.phone}</div>
                  {r.name && <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.name}</div>}
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#0d6efd' }}>
                  {r.campaign ?? <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={td}>
                  <span style={{ background: stateChip.bg, color: stateChip.color, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
                    {stateChip.label}
                  </span>
                </td>
                <td style={td}>{r.warmup_label ?? `L${r.warmup_level}`}</td>
                <td style={td}>{r.release_allowance ?? r.daily_cap}</td>
                <td style={{ ...td, color: r.sent > 0 ? '#16a34a' : '#94a3b8', fontWeight: r.sent > 0 ? 700 : 400 }}>
                  {r.sent}
                </td>
                <td style={{ ...td, color: r.delivered > 0 ? '#0f766e' : '#94a3b8' }}>{r.delivered}</td>
                <td style={{ ...td, color: r.read > 0 ? '#0891b2' : '#94a3b8' }}>{r.read}</td>
                <td style={{ ...td, color: r.replies > 0 ? '#0d6efd' : '#94a3b8' }}>{r.replies}</td>
                <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
                <td style={td}>{r.remaining}</td>
                <td style={td}>{r.queueWaiting}</td>
                <td style={td}>{r.health_score != null ? r.health_score : '—'}</td>
                <td style={{ ...td, fontSize: 10, color: r.warnings?.length ? '#c2410c' : '#94a3b8' }}>
                  {r.warnings?.length ? r.warnings.join(', ') : '—'}
                </td>
                <td style={{ ...td, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {ago(r.lastActivity)}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section F: Today's Queue ──────────────────────────────────────────────────
const STATUS_ORDER = ['pending', 'processing', 'sent', 'failed', 'skipped'];
const STATUS_CLR   = { pending: '#0d6efd', processing: '#d97706', sent: '#16a34a', failed: '#dc3545', skipped: '#9ca3af' };

function QueueSummary({ rows, oldest_pending_minutes, accentBg }) {
  const byStatus = {};
  const byNumber = {};
  for (const r of (rows ?? [])) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.count;
    if (!byNumber[r.number_phone]) byNumber[r.number_phone] = { name: r.number_name, statuses: {} };
    byNumber[r.number_phone].statuses[r.status] = (byNumber[r.number_phone].statuses[r.status] ?? 0) + r.count;
  }
  const stuckWarning = (oldest_pending_minutes ?? 0) > 15;
  const isEmpty      = STATUS_ORDER.every(s => (byStatus[s] ?? 0) === 0);

  return (
    <>
      {stuckWarning && (
        <div style={{ marginBottom: 10, fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
          ⚠ Queue stuck — oldest pending {oldest_pending_minutes}m old
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(s => (
          <div key={s} style={{ textAlign: 'center', padding: '8px 14px', background: accentBg ?? '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 70 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_CLR[s] }}>{byStatus[s] ?? 0}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{s.toUpperCase()}</div>
          </div>
        ))}
        {isEmpty && (
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, alignSelf: 'center', paddingLeft: 8 }}>
            ✓ Clean baseline — 0 across all statuses
          </div>
        )}
      </div>
      {Object.keys(byNumber).length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={th}>Number</th>
                {STATUS_ORDER.map(s => <th key={s} style={{ ...th, textAlign: 'center' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byNumber).map(([phone, info]) => (
                <tr key={phone}>
                  <td style={td}><span style={{ fontFamily: 'monospace' }}>{phone}</span></td>
                  {STATUS_ORDER.map(s => (
                    <td key={s} style={{ ...td, textAlign: 'center', fontWeight: 600, color: STATUS_CLR[s] }}>
                      {info.statuses[s] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SectionF({ queueByTelecaller, activityByTelecaller }) {
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [queueDetail,   setQueueDetail]   = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const notOnWaMap = new Map((activityByTelecaller ?? []).map(a => [a.number_id, a.not_on_whatsapp ?? 0]));
  const rows = (queueByTelecaller ?? []).map(q => ({
    number_id:       q.number_id,
    phone:           q.telecaller_phone,
    name:            q.number_name,
    queued:          q.total,
    sent:            q.sent,
    pending:         q.pending,
    failed:          q.failed,
    not_on_whatsapp: notOnWaMap.get(q.number_id) ?? 0,
  }));

  const handleToggleDetail = async () => {
    if (!detailOpen && !queueDetail) {
      setLoadingDetail(true);
      try {
        const res = await apiFetch('/marketing/whatsapp-engine/ai/queue-detail');
        setQueueDetail(Array.isArray(res) ? res : []);
      } catch {
        setQueueDetail([]);
      } finally {
        setLoadingDetail(false);
      }
    }
    setDetailOpen(v => !v);
  };

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>D — Today's Queue Summary</div>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>created_at ≥ today</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No queue activity today.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Telecaller', 'Queued', 'Sent', 'Pending', 'Not On WhatsApp', 'Failed'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.number_id}>
                <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{r.phone}</td>
                <td style={td}>{r.queued}</td>
                <td style={{ ...td, color: '#16a34a', fontWeight: 700 }}>{r.sent}</td>
                <td style={{ ...td, color: '#0d6efd' }}>{r.pending}</td>
                <td style={{ ...td, color: r.not_on_whatsapp > 0 ? '#d97706' : '#94a3b8' }}>{r.not_on_whatsapp}</td>
                <td style={{ ...td, color: r.failed > 0 ? '#dc3545' : '#94a3b8' }}>{r.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Per-contact detail — collapsed by default, fetched on demand */}
      <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
        <button
          onClick={handleToggleDetail}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span style={{ fontSize: 9 }}>{detailOpen ? '▼' : '▶'}</span>
          {loadingDetail ? 'Loading per-contact rows…' : detailOpen ? 'Hide per-contact rows' : 'Show per-contact rows (today)'}
        </button>
        {detailOpen && !loadingDetail && (
          <SectionD data={queueDetail} nested />
        )}
      </div>
    </div>
  );
}

// ── Section H: Number Utilization ─────────────────────────────────────────────
function SectionH({ data }) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={sectionTitle}>F — Today's Number Utilization</div>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          Send Budget = warmup stage limit · Queue Planned = always 150/number
        </span>
      </div>
      {!data?.length ? (
        <div style={{ color: '#9ca3af', fontSize: 13 }}>No numbers found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Phone', 'State', 'Warmup', 'Send Budget', 'Queue Planned', 'Sent Today', 'Queue Waiting', 'Remaining', 'Health', 'Budget Used'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(n => {
              const barColor  = n.utilization_pct > 80 ? '#dc3545' : n.utilization_pct > 50 ? '#d97706' : '#16a34a';
              const stateChip = waSessionChip(n.wa_state, n.connected);
              const sentToday = n.sent_today ?? n.daily_sent ?? 0;
              const budget    = n.release_allowance ?? 0;
              return (
                <tr key={n.id} style={{ opacity: n.is_active ? 1 : 0.5 }}>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{n.phone}</td>
                  <td style={td}>
                    <span style={{ background: stateChip.bg, color: stateChip.color, padding: '2px 8px', borderRadius: 10, fontWeight: 700, fontSize: 10 }}>
                      {stateChip.label}
                    </span>
                  </td>
                  <td style={td}>
                    {(() => { const w = resolveWarmup(n); return w.notStarted
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>NOT STARTED</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: '#0d6efd' }}>{w.label}</span>;
                    })()}
                  </td>
                  <td style={td}>
                    <span title="Warmup stage release limit — sender stops when this is reached">
                      {budget}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>
                    <span title="Queue rows built each day (always 150 per connected number regardless of warmup stage)">
                      {n.queue_capacity ?? 150}
                    </span>
                  </td>
                  <td style={td}><span style={{ fontWeight: 700, color: '#0d6efd' }}>{sentToday}</span></td>
                  <td style={td}>{n.queue_waiting ?? 0}</td>
                  <td style={td}>{n.remaining_allowance ?? n.remaining_today}</td>
                  <td style={td}>{n.health_score != null ? n.health_score : '—'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${n.utilization_pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>
                        {sentToday}/{budget}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Warnings Banner ────────────────────────────────────────────────────────────
function WarningsBanner({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, color: '#dc3545', fontSize: 13, marginBottom: 6 }}>Warnings</div>
      {warnings.map((w, i) => (
        <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>• {w}</div>
      ))}
    </div>
  );
}

// ── Key-Value cell helper ──────────────────────────────────────────────────────
function Kv({ label, value, children }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AiPromotionDashboard() {
  const [data,              setData]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [lastUpdated,       setLastUpdated]        = useState(null);
  const [secondsAgo,        setSecondsAgo]         = useState(0);
  const [error,             setError]             = useState(null);
  const [validationRunning, setValidationRunning]  = useState(false);
  const [validationResult,  setValidationResult]   = useState(null);
  const [validationError,   setValidationError]    = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/ai/dashboard');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setData(d);
      setLastUpdated(Date.now());
      setSecondsAgo(0);
      setError(null);
    } catch (e) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const runValidation = useCallback(async () => {
    setValidationRunning(true);
    setValidationError(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/ai/validation-run', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? `Server error ${res.status}`);
      setValidationResult(body);
      await load();
    } catch (e) {
      setValidationError(e?.message ?? 'Validation run failed');
    } finally {
      setValidationRunning(false);
    }
  }, [load]);

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const runningStatus = data?.engine_status?.running;

  return (
    <PageLayout
      title="AI Promotion"
      subtitle="Operational visibility — what ran, who received it, what products were used"
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={runValidation}
            disabled={validationRunning}
            style={{
              background:   validationRunning ? '#dbeafe' : '#1d4ed8',
              color:        validationRunning ? '#1e40af' : '#fff',
              border:       'none',
              borderRadius: 8,
              padding:      '6px 14px',
              fontWeight:   700,
              fontSize:     12,
              cursor:       validationRunning ? 'default' : 'pointer',
              letterSpacing: '0.02em',
              whiteSpace:   'nowrap',
            }}
          >
            {validationRunning ? '⌛ Running…' : '▶ Run AI Validation Test'}
          </button>
          {data?.engine_status && (
            <span style={{
              background: runningStatus ? '#dcfce7' : '#fee2e2',
              color:      runningStatus ? '#166534' : '#991b1b',
              fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20,
            }}>
              {runningStatus ? '● RUNNING' : '○ STOPPED'}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {loading ? 'Updating…' : lastUpdated ? `Updated ${secondsAgo}s ago` : '—'}
          </span>
        </div>
      }
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc3545', fontSize: 13 }}>
            {error}
          </div>
        )}

        {validationError && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', color: '#dc3545', fontSize: 13 }}>
            Validation run failed: {validationError}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 14 }}>Loading AI dashboard…</div>
        )}

        {data && (
          <>
            <WarningsBanner warnings={data.warnings} />
            <SectionAudienceStatus
              status={data.audience_status}
              dbCounts={data.database_counts}
              queueBuiltToday={data.today_activity?.queue_items ?? 0}
            />
            <SectionA data={data.engine_status} />
            {validationResult && (
              <ValidationResultCard
                runResult={validationResult}
                dashData={data}
                onDismiss={() => setValidationResult(null)}
              />
            )}
            <SectionB
              byTelecaller={data.today_activity_by_telecaller}
              fleetSummary={data.today_activity}
            />
            <SectionC
              campaigns={data.campaigns}
              todayQueueByTelecaller={data.today_queue_by_telecaller}
              isInconsistent={data.is_inconsistent}
            />
            <SectionE
              data={data.telecaller_performance}
              engineStatus={data.engine_status}
              campaigns={data.campaigns}
            />
            <SectionF
              queueByTelecaller={data.today_queue_by_telecaller}
              activityByTelecaller={data.today_activity_by_telecaller}
            />
            <SectionH data={data.number_utilization} />
          </>
        )}

        <div style={{ fontSize: 11, color: '#9ca3af', paddingBottom: 24 }}>
          Auto-refreshes every 15s · {data?.as_of ? `As of ${fmt(data.as_of)}` : ''}
          <br />
          Sections: A Engine Status · B Today's Activity · C Today's Campaigns · D Today's Queue · E Telecaller Performance · F Number Utilization
        </div>
      </div>
    </PageLayout>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

// ── Style helpers ──────────────────────────────────────────────────────────────

const btn = (bg, color = '#fff') => ({
  background: bg,
  color,
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const card = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 8,
  padding: '18px 20px',
  marginBottom: 16,
};

const sectionHead = {
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: 12,
};

function pct(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

function num(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

// ── Verdict Banner ─────────────────────────────────────────────────────────────

function VerdictBanner({ label, ok, detail }) {
  return (
    <div
      style={{
        background: ok ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 8,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 24 }}>{ok ? '✅' : '⛔'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: ok ? '#065f46' : '#991b1b' }}>{label}</div>
        {detail && <div style={{ fontSize: 13, color: ok ? '#047857' : '#b91c1c', marginTop: 3 }}>{detail}</div>}
      </div>
    </div>
  );
}

// ── Condition Row ─────────────────────────────────────────────────────────────

function ConditionRow({ label, cond }) {
  if (!cond) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 6,
        background: cond.pass ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${cond.pass ? '#bbf7d0' : '#fecaca'}`,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{cond.pass ? '✓' : '✗'}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: cond.pass ? '#065f46' : '#991b1b' }}>{label}</div>
        {cond.detail && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{cond.detail}</div>}
      </div>
    </div>
  );
}

// ── Rate Bar ──────────────────────────────────────────────────────────────────

function RateBar({ value, max = 100, color = '#0d6efd' }) {
  const pctVal = Math.min(Math.max(value || 0, 0), max);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(pctVal / max) * 100}%`, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 38, textAlign: 'right' }}>
        {pct(value)}
      </span>
    </div>
  );
}

// ── Totals Grid ───────────────────────────────────────────────────────────────

function TotalsGrid({ totals }) {
  if (!totals) return null;
  const items = [
    { label: 'Sent',     value: num(totals.sent),              color: '#0d6efd' },
    { label: 'Delivered',value: num(totals.delivered),         color: '#0891b2' },
    { label: 'Read',     value: num(totals.read),              color: '#7c3aed' },
    { label: 'Replied',  value: num(totals.replied),           color: '#059669' },
    { label: 'Failed',   value: num(totals.failed),            color: '#dc3545' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
      {items.map((it) => (
        <div key={it.label} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '10px 8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 4 }}>{it.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: it.color }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Daily Trend Table ─────────────────────────────────────────────────────────

function TrendTable({ trend }) {
  if (!trend || trend.length === 0) return <div style={{ fontSize: 13, color: '#9ca3af' }}>No trend data.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Date', 'Sent', 'Del%', 'Read%', 'Reply%', 'Fail%'].map((h) => (
              <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Date' ? 'left' : 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...trend].reverse().map((day) => (
            <tr key={day.date} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 10px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{day.date}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', color: '#0d6efd', fontWeight: 700 }}>{day.sent ?? 0}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', color: (day.delivery_rate_pct ?? 0) < 60 ? '#dc3545' : '#059669' }}>
                {pct(day.delivery_rate_pct)}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'center', color: (day.read_rate_pct ?? 0) < 20 ? '#fd7e14' : '#7c3aed' }}>
                {pct(day.read_rate_pct)}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'center', color: '#059669' }}>
                {pct(day.reply_rate_pct)}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'center', color: (day.fail_rate_pct ?? 0) > 20 ? '#dc3545' : '#6b7280' }}>
                {pct(day.fail_rate_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Re-enable Modal ───────────────────────────────────────────────────────────

function ReenableModal({ onConfirm, onClose, busy }) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>Re-enable Engine</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
          The engine was auto-paused due to a safety trigger. Before re-enabling, you must document your investigation outcome.
        </div>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
          This does not persist across restarts. Set <code>WHATSAPP_ENGINE_ENABLED=true</code> in .env to make it permanent.
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Investigation outcome / reason to re-enable
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Investigated failed sends — root cause was expired auth session on number +91XXXXXXXX. Reset and reconnected. Fail rate back to normal."
          rows={4}
          style={{ width: '100%', border: `1px solid ${valid ? '#0d6efd' : '#d1d5db'}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 11, color: valid ? '#059669' : '#9ca3af', marginTop: 4, marginBottom: 16 }}>
          {reason.trim().length} / 5 min characters
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose} disabled={busy}>Cancel</button>
          <button
            style={{ ...btn(valid ? '#059669' : '#d1d5db', valid ? '#fff' : '#9ca3af'), cursor: valid && !busy ? 'pointer' : 'not-allowed' }}
            onClick={() => valid && !busy && onConfirm(reason)}
            disabled={!valid || busy}
          >
            {busy ? 'Enabling…' : 'Re-enable Engine'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Scale-up Confirmation Modal ───────────────────────────────────────────────

function ScaleUpModal({ readiness, onConfirm, onClose, busy }) {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 6 }}>Confirm Scale Up</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
          This will increase the daily send limit from{' '}
          <strong>{num(readiness?.current_max_daily)}</strong> to{' '}
          <strong>{readiness?.next_stage === 'SECOND_NUMBER' ? 'SECOND NUMBER' : num(readiness?.next_stage)}</strong> messages/day.
        </div>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
          Scaling too fast increases ban risk. All 9 stability conditions have passed for this scale-up, but monitor closely for the next 48 hours.
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          I understand this increases send volume. I will monitor delivery and fail rates for the next 48 hours.
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={onClose} disabled={busy}>Cancel</button>
          <button
            style={{ ...btn(checked ? '#0d6efd' : '#d1d5db', checked ? '#fff' : '#9ca3af'), cursor: checked && !busy ? 'pointer' : 'not-allowed' }}
            onClick={() => checked && !busy && onConfirm()}
            disabled={!checked || busy}
          >
            {busy ? 'Scaling…' : 'Confirm Scale Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WaGovernance() {
  const navigate = useNavigate();
  const [days, setDays] = useState(14);
  const [stability, setStability] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showReenableModal, setShowReenableModal] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const showFeedback = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes, hRes] = await Promise.all([
        apiFetch(`/marketing/whatsapp-engine/stability-report?days=${days}`),
        apiFetch('/marketing/whatsapp-engine/scale-readiness'),
        apiFetch('/marketing/whatsapp-engine/health'),
      ]);
      if (!sRes.ok) throw new Error(`Stability error ${sRes.status}`);
      if (!rRes.ok) throw new Error(`Readiness error ${rRes.status}`);
      const [s, r, h] = await Promise.all([
        sRes.json(),
        rRes.json(),
        hRes.ok ? hRes.json() : null,
      ]);
      setStability(s);
      setReadiness(r);
      setHealth(h);
    } catch (e) {
      setError(e?.message || 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const doReEnable = async (reason) => {
    setActionBusy(true);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/re-enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Re-enable failed');
      setShowReenableModal(false);
      showFeedback('Engine re-enabled. Monitor closely.');
      await load();
    } catch (e) {
      showFeedback(e?.message || 'Re-enable failed', false);
    } finally {
      setActionBusy(false);
    }
  };

  const doScaleUp = async () => {
    setActionBusy(true);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/scale-up', { method: 'POST' });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Scale-up refused');
      setShowScaleModal(false);
      showFeedback(`Scale-up complete. New limit: ${d.new_limit ?? readiness?.next_stage}/day.`);
      await load();
    } catch (e) {
      showFeedback(e?.message || 'Scale-up failed', false);
      setShowScaleModal(false);
    } finally {
      setActionBusy(false);
    }
  };

  const engineDisabled = health && !health.engine_enabled;
  const conditionLabels = {
    stable_14_days:     '14-day stability',
    no_bans:            'No banned numbers',
    healthy_delivery:   'Delivery rate ≥ 60%',
    healthy_reads:      'Read rate ≥ 20%',
    healthy_replies:    'Reply rate ≥ 5%',
    stable_session:     'Stable WA session',
    low_fail_rate:      'Fail rate ≤ 20%',
    low_fatigue_growth: 'Low fatigue growth',
    low_cooldown_growth:'Low cooldown growth',
  };

  const passCount = readiness
    ? Object.values(readiness.conditions || {}).filter((c) => c?.pass).length
    : 0;
  const totalConditions = Object.keys(conditionLabels).length;

  return (
    <PageLayout
      title="Engine Governance"
      subtitle="Stability, scale readiness, and operational safety controls"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && (
            <span style={{ fontSize: 12, fontWeight: 600, color: feedback.ok ? '#059669' : '#dc3545' }}>
              {feedback.ok ? '✓' : '✗'} {feedback.msg}
            </span>
          )}
          <button style={btn('#6366f1')} onClick={() => navigate('/marketing/whatsapp/connections')}>
            Validate
          </button>
          <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      {showReenableModal && (
        <ReenableModal
          onConfirm={doReEnable}
          onClose={() => setShowReenableModal(false)}
          busy={actionBusy}
        />
      )}
      {showScaleModal && (
        <ScaleUpModal
          readiness={readiness}
          onConfirm={doScaleUp}
          onClose={() => setShowScaleModal(false)}
          busy={actionBusy}
        />
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '16px 20px', marginBottom: 16, color: '#dc3545' }}>
            {error}{' '}
            <button style={{ ...btn('#dc3545'), marginLeft: 12, padding: '4px 12px', fontSize: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {/* ── Engine Status ─────────────────────────────────────────────────── */}
        {health && (
          <div style={{ ...card, background: engineDisabled ? '#fef2f2' : '#f0fdf4', border: `1px solid ${engineDisabled ? '#fecaca' : '#bbf7d0'}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{
                  background: engineDisabled ? '#fee2e2' : '#dcfce7',
                  color: engineDisabled ? '#991b1b' : '#166534',
                  borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700,
                }}>
                  {engineDisabled ? '⛔ ENGINE DISABLED' : '✅ ENGINE ACTIVE'}
                </span>
                <span style={{
                  background: health.wa_connected ? '#dcfce7' : '#f3f4f6',
                  color: health.wa_connected ? '#166534' : '#6b7280',
                  borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                }}>
                  {health.wa_connected ? 'WA Connected' : 'WA Disconnected'}
                </span>
                <span style={{
                  background: health.send_window_active ? '#e0f2fe' : '#fef9c3',
                  color: health.send_window_active ? '#0369a1' : '#854d0e',
                  borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                }}>
                  {health.send_window_active ? 'Send Window Open' : 'Send Window Closed'}
                </span>
                {health.dry_run_mode && (
                  <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                    DRY RUN
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {health.sent_last_hour} sent / {health.failed_last_hour} failed in last hour
                </span>
              </div>
              {engineDisabled && (
                <button style={btn('#059669')} onClick={() => setShowReenableModal(true)}>
                  Re-enable Engine
                </button>
              )}
            </div>
            {engineDisabled && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>
                The engine was auto-paused by the safety system. Check the stability report below for failure details. Investigate root cause before re-enabling.
              </div>
            )}
          </div>
        )}

        {/* ── Scale Readiness ───────────────────────────────────────────────── */}
        <div style={sectionHead}>Scale Readiness</div>
        {loading && !readiness ? (
          <div style={{ ...card, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : readiness ? (
          <div style={card}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <VerdictBanner
                  ok={readiness.ready}
                  label={readiness.ready ? `GO — Ready to Scale` : `NO GO — ${totalConditions - passCount} condition${totalConditions - passCount !== 1 ? 's' : ''} failing`}
                  detail={
                    readiness.ready
                      ? `${passCount}/${totalConditions} conditions passed`
                      : `${passCount}/${totalConditions} conditions passed — fix failing conditions first`
                  }
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Current limit</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{num(readiness.current_max_daily)}<span style={{ fontSize: 13, color: '#6b7280', fontWeight: 400 }}> /day</span></div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Next stage: <strong style={{ color: '#0d6efd' }}>
                    {readiness.next_stage === 'SECOND_NUMBER' ? 'Add 2nd Number' : `${num(readiness.next_stage)}/day`}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  style={{
                    ...btn(readiness.ready ? '#0d6efd' : '#e5e7eb', readiness.ready ? '#fff' : '#9ca3af'),
                    cursor: readiness.ready ? 'pointer' : 'not-allowed',
                    padding: '10px 20px',
                    fontSize: 14,
                  }}
                  disabled={!readiness.ready}
                  title={readiness.ready ? 'Scale up daily limit' : 'All conditions must pass before scaling'}
                  onClick={() => readiness.ready && setShowScaleModal(true)}
                >
                  Scale Up →
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {Object.entries(conditionLabels).map(([key, label]) => (
                <ConditionRow key={key} label={label} cond={readiness.conditions?.[key]} />
              ))}
            </div>

            {readiness.checked_at && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, textAlign: 'right' }}>
                Checked at {new Date(readiness.checked_at).toLocaleString()}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Stability Report ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={sectionHead}>Stability Report</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  background: days === d ? '#0d6efd' : '#f1f5f9',
                  color: days === d ? '#fff' : '#475569',
                  border: 'none', borderRadius: 5, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading && !stability ? (
          <div style={{ ...card, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : stability ? (
          <>
            {/* Verdict */}
            <div style={{ marginBottom: 12 }}>
              <VerdictBanner
                ok={stability.verdict?.stable}
                label={stability.verdict?.stable ? `Stable — ${days}-day period` : `Unstable — ${stability.verdict?.issues?.length ?? 0} issue${(stability.verdict?.issues?.length ?? 0) !== 1 ? 's' : ''} found`}
                detail={stability.verdict?.issues?.join(' · ') || (stability.verdict?.stable ? `No issues in the last ${days} days.` : null)}
              />
            </div>

            {/* Totals + Rates */}
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>
                Period Totals — {days}-day window (since {stability.since ?? '—'})
              </div>
              <TotalsGrid totals={stability.totals} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Delivery Rate</div>
                  <RateBar value={stability.totals?.delivery_rate_pct} color='#0891b2' />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Read Rate</div>
                  <RateBar value={stability.totals?.read_rate_pct} color='#7c3aed' />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Reply Rate</div>
                  <RateBar value={stability.totals?.reply_rate_pct} color='#059669' />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fail Rate</div>
                  <RateBar value={stability.totals?.fail_rate_pct} color='#dc3545' />
                </div>
              </div>
            </div>

            {/* Events + Audience + Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
              {/* Operational Events */}
              <div style={card}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>Operational Events</div>
                {[
                  { label: 'Auto-pause triggers', value: stability.events?.auto_pause_count ?? 0, color: stability.events?.auto_pause_count > 0 ? '#dc3545' : '#6b7280' },
                  { label: 'Number recoveries', value: stability.events?.number_recovered_count ?? 0, color: '#059669' },
                  { label: 'Scale-up events', value: stability.events?.scale_up_count ?? 0, color: '#0d6efd' },
                  { label: 'Manual re-enables', value: stability.events?.manual_reenable_count ?? 0, color: '#fd7e14' },
                  { label: 'Fingerprint skips', value: stability.events?.fingerprint_skip_count ?? 0, color: '#6b7280' },
                  { label: 'Hard limit hits', value: stability.events?.hard_limit_hit_count ?? 0, color: stability.events?.hard_limit_hit_count > 0 ? '#dc3545' : '#6b7280' },
                ].map((ev) => (
                  <div key={ev.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{ev.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: ev.color }}>{ev.value}</span>
                  </div>
                ))}
                {stability.events?.auto_pause_reasons?.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#dc3545', background: '#fff5f5', borderRadius: 5, padding: '6px 8px', lineHeight: 1.5 }}>
                    Pause reasons: {stability.events.auto_pause_reasons.join(', ')}
                  </div>
                )}
              </div>

              {/* Audience Health */}
              <div style={card}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>Audience Health</div>
                {[
                  { label: 'Total contacts', value: num(stability.audience?.total), color: '#374151' },
                  { label: 'In cooldown', value: `${num(stability.audience?.in_cooldown)} (${pct(stability.audience?.cooldown_pct)})`, color: (stability.audience?.cooldown_pct ?? 0) > 30 ? '#dc3545' : '#fd7e14' },
                  { label: 'Opted out', value: num(stability.audience?.opted_out), color: '#6b7280' },
                  { label: 'High fatigue', value: `${num(stability.audience?.high_fatigue)} (${pct(stability.audience?.high_fatigue_pct)})`, color: (stability.audience?.high_fatigue_pct ?? 0) > 20 ? '#dc3545' : '#6b7280' },
                ].map((it) => (
                  <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{it.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: it.color }}>{it.value}</span>
                  </div>
                ))}
              </div>

              {/* Numbers Health */}
              <div style={card}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>Numbers Health</div>
                {[
                  { label: 'Active', value: stability.numbers?.active ?? 0, color: '#059669' },
                  { label: 'Inactive / paused', value: stability.numbers?.inactive ?? 0, color: '#6b7280' },
                  { label: 'Banned', value: stability.numbers?.banned ?? 0, color: stability.numbers?.banned > 0 ? '#dc3545' : '#6b7280' },
                  { label: 'Avg risk score', value: Number(stability.numbers?.avg_risk_score ?? 0).toFixed(1), color: (stability.numbers?.avg_risk_score ?? 0) > 40 ? '#dc3545' : '#374151' },
                ].map((it) => (
                  <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{it.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: it.color }}>{it.value}</span>
                  </div>
                ))}
                <button
                  style={{ ...btn('#f1f5f9', '#374151'), marginTop: 12, width: '100%', fontSize: 12, padding: '6px 10px' }}
                  onClick={() => navigate('/marketing/whatsapp/connections')}
                >
                  Manage Numbers →
                </button>
              </div>
            </div>

            {/* Daily Trend */}
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>
                Daily Trend — last {stability.daily_trend?.length ?? 0} days
              </div>
              <TrendTable trend={stability.daily_trend} />
            </div>
          </>
        ) : null}

        {/* ── Audit Event Link ───────────────────────────────────────────────── */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>Engine Audit Events</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Full audit log: auto-pauses, re-enables, scale-ups, fingerprint skips, hard limit hits</div>
          </div>
          <button style={btn('#6366f1')} onClick={() => navigate('/marketing/whatsapp/connections')}>
            Open Connections →
          </button>
        </div>

      </div>
    </PageLayout>
  );
}

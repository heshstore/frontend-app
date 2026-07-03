import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

// ── Style helpers ─────────────────────────────────────────────────────────────

const card = (extra = {}) => ({
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '16px 20px',
  ...extra,
});

const metricBox = (color = '#0d6efd') => ({
  background: '#fff',
  border: `1px solid #e2e8f0`,
  borderTop: `3px solid ${color}`,
  borderRadius: 8,
  padding: '14px 18px',
  flex: 1,
  minWidth: 130,
});

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function pct(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

// ── Status banner ──────────────────────────────────────────────────────────────

const STATUS_CFG = {
  GREEN:  { bg: '#dcfce7', border: '#16a34a', color: '#166534', label: '● PILOT GREEN — All systems nominal',  emoji: '✅' },
  YELLOW: { bg: '#fef9c3', border: '#b45309', color: '#92400e', label: '⚠ PILOT YELLOW — Warnings present',    emoji: '⚠️' },
  RED:    { bg: '#fee2e2', border: '#dc2626', color: '#991b1b', label: '✖ PILOT RED — Critical issues detected', emoji: '🚨' },
};

function StatusBanner({ status, reasons, loading }) {
  if (loading) return <div style={{ ...card(), background: '#f8fafc', color: '#9ca3af', fontSize: 14 }}>Loading pilot status…</div>;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.YELLOW;
  return (
    <div style={{ ...card(), background: cfg.bg, borderColor: cfg.border, borderWidth: 2 }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: cfg.color, marginBottom: 6 }}>{cfg.label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(reasons ?? []).map((r, i) => (
          <span key={i} style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 12, color: cfg.color }}>{r}</span>
        ))}
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={metricBox(color)}>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Health checks table ───────────────────────────────────────────────────────

const CHECK_COLOR = { OK: '#16a34a', WARN: '#b45309', FAIL: '#dc2626' };
const CHECK_BG    = { OK: '#dcfce7', WARN: '#fef9c3', FAIL: '#fee2e2' };

function HealthChecks({ checks }) {
  if (!checks?.length) return null;
  return (
    <div style={card()}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#374151' }}>Health Checks</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((c) => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: CHECK_BG[c.status], border: `1px solid ${CHECK_COLOR[c.status]}33`, borderRadius: 6, padding: '7px 12px' }}>
            <span style={{ fontWeight: 800, fontSize: 11, color: CHECK_COLOR[c.status], minWidth: 32, marginTop: 1 }}>{c.status}</span>
            <span style={{ fontWeight: 600, fontSize: 13, minWidth: 200, color: '#111827' }}>{c.name}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{c.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts list ───────────────────────────────────────────────────────────────

const ALERT_BG    = { WARN: '#fef9c3', CRITICAL: '#fee2e2' };
const ALERT_COLOR = { WARN: '#b45309', CRITICAL: '#dc2626' };

function Alerts({ alerts }) {
  if (!alerts?.length) return (
    <div style={card({ background: '#f0fdf4', borderColor: '#16a34a' })}>
      <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>✓ No active alerts</span>
    </div>
  );
  return (
    <div style={card()}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#374151' }}>Active Alerts</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ background: ALERT_BG[a.level], border: `1px solid ${ALERT_COLOR[a.level]}44`, borderRadius: 6, padding: '8px 12px' }}>
            <span style={{ fontWeight: 800, fontSize: 11, color: ALERT_COLOR[a.level], marginRight: 8 }}>{a.level}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginRight: 6 }}>{a.code}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{a.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Daily metrics history table ───────────────────────────────────────────────

const th = { padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 11, color: '#475569', textAlign: 'left' };
const td = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12, color: '#374151' };

function HistoryTable({ rows }) {
  if (!rows?.length) return <div style={{ ...card(), color: '#9ca3af', fontSize: 13 }}>No historical data yet — snapshots are taken nightly at 23:55 IST.</div>;
  return (
    <div style={{ ...card(), overflowX: 'auto' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#374151' }}>Daily Pilot Metrics</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Date','Sent','Delivered','Read','Replied','Failed','Delivery %','Read %','Reply %','Fail %','Connected'].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ background: '#fff' }}>
              <td style={td}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
              <td style={td}>{fmt(r.sent_count)}</td>
              <td style={td}>{fmt(r.delivered_count)}</td>
              <td style={td}>{fmt(r.read_count)}</td>
              <td style={td}>{fmt(r.replied_count)}</td>
              <td style={{ ...td, color: r.failed_count > 0 ? '#dc2626' : '#374151' }}>{fmt(r.failed_count)}</td>
              <td style={td}>{pct(r.delivery_rate_pct)}</td>
              <td style={td}>{pct(r.read_rate_pct)}</td>
              <td style={td}>{pct(r.reply_rate_pct)}</td>
              <td style={{ ...td, color: r.failure_rate_pct > 20 ? '#dc2626' : '#374151' }}>{pct(r.failure_rate_pct)}</td>
              <td style={td}>{fmt(r.connected_numbers)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PilotDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const [dashRes, histRes] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/pilot/dashboard').then(r => r.json()),
        apiFetch('/marketing/whatsapp-engine/pilot/metrics?days=14').then(r => r.json()),
      ]);
      setDashboard(dashRes);
      setHistory(Array.isArray(histRes) ? histRes : []);
      setError(null);
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } catch (e) {
      setError(e?.message ?? 'Failed to load pilot data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 300_000);
    return () => clearInterval(t);
  }, [load]);

  const d = dashboard ?? {};

  return (
    <PageLayout
      title="Pilot Dashboard"
      subtitle="Real-time marketing engine health · refreshes every 30s"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && <span style={{ fontSize: 11, color: '#9ca3af' }}>Last refresh: {lastRefresh}</span>}
          <button
            onClick={load}
            style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ↻ Refresh
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* Status banner */}
        <StatusBanner status={d.pilot_status} reasons={d.status_reasons} loading={loading && !dashboard} />

        {/* Today's volume */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Volume</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MetricCard label="SENT"      value={fmt(d.sent_today)}      color="#0d6efd" />
            <MetricCard label="DELIVERED" value={fmt(d.delivered_today)} color="#16a34a" />
            <MetricCard label="READ"      value={fmt(d.read_today)}      color="#7c3aed" />
            <MetricCard label="REPLIED"   value={fmt(d.replied_today)}   color="#0891b2" />
            <MetricCard label="FAILED"    value={fmt(d.failed_today)}    color={d.failed_today > 0 ? '#dc2626' : '#6b7280'} />
            <MetricCard label="SKIPPED"   value={fmt(d.skipped_today)}   color="#9ca3af" />
          </div>
        </div>

        {/* Rates row */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversion Rates</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MetricCard label="DELIVERY RATE" value={pct(d.delivery_rate_pct)} color={d.delivery_rate_pct < 50 && d.sent_today > 4 ? '#dc2626' : '#16a34a'} />
            <MetricCard label="READ RATE"     value={pct(d.read_rate_pct)}     color="#7c3aed" />
            <MetricCard label="REPLY RATE"    value={pct(d.reply_rate_pct)}    color="#0891b2" />
            <MetricCard label="FAILURE RATE"  value={pct(d.failure_rate_pct)}  color={d.failure_rate_pct > 20 ? '#dc2626' : '#16a34a'} />
          </div>
        </div>

        {/* Sender + queue health */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ ...card(), flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender Health</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Connected numbers',    d.connected_numbers, d.connected_numbers === 0 ? '#dc2626' : '#16a34a'],
                ['Active numbers',       d.active_numbers,    '#0d6efd'],
                ['Numbers at daily cap', d.numbers_at_cap,    d.numbers_at_cap === d.active_numbers ? '#dc2626' : '#9ca3af'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color }}>{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card(), flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Queue Health</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Due & pending', d.queue_backlog,    d.queue_backlog > 10 ? '#b45309' : '#0d6efd'],
                ['Processing',   d.queue_processing, '#9ca3af'],
                ['Stuck (>5min)', d.queue_stuck,     d.queue_stuck > 0 ? '#dc2626' : '#16a34a'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color }}>{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <Alerts alerts={d.alerts} />

        {/* Health checks */}
        <HealthChecks checks={d.health_checks} />

        {/* Historical metrics */}
        <HistoryTable rows={history} />

        {d.as_of && (
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
            Snapshot as of {new Date(d.as_of).toLocaleString('en-IN')}
          </div>
        )}

      </div>
    </PageLayout>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';
import { apiFetch } from '../../utils/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.borderRadius,
    padding: '16px 20px',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: { fontSize: 22, fontWeight: 800, marginTop: 3, lineHeight: 1 },
  statSub: { fontSize: 11, color: theme.textMuted, marginTop: 3 },
  th: {
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: theme.textMuted,
    textTransform: 'uppercase',
    borderBottom: `2px solid ${theme.border}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    background: '#fafafa',
  },
  td: {
    padding: '8px 10px',
    fontSize: 12,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
    verticalAlign: 'middle',
  },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  badge: (color) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    background: color + '18',
    color,
  }),
};

const PRESSURE_COLOR = { Low: '#16a34a', Medium: '#d97706', High: '#f97316', Critical: '#dc2626' };
const SCORE_COLOR = (n) => (n >= 80 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtMs = (n) => (n ? `${n} ms` : '—');
const fmtNum = (n) => (n ?? 0).toLocaleString();
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString() : '—');
const fmtUptime = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
};

// ─── Tiny components ──────────────────────────────────────────────────────────
function Kpi({ label, value, sub, color, warn }) {
  const c = color || (warn ? PRESSURE_COLOR[warn] : theme.text);
  return (
    <div style={{ minWidth: 110, flex: 1 }}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: c }}>{value ?? '—'}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

function ScoreRing({ label, value }) {
  const c = SCORE_COLOR(value);
  return (
    <div style={{ textAlign: 'center', padding: '0 12px' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: `5px solid ${c}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 5px',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 800, color: c }}>{value}</span>
      </div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function Grid({ children, cols = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color, warn }) {
  return (
    <div style={{ ...S.card, marginBottom: 0, padding: '14px 16px' }}>
      <Kpi label={label} value={value} sub={sub} color={color} warn={warn} />
    </div>
  );
}

function Table({ title, headers, rows, emptyText = 'No data yet — use the app normally to collect measurements' }) {
  return (
    <div style={S.card}>
      {title && <div style={S.sectionTitle}>{title}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ ...S.td, color: theme.textMuted, textAlign: 'center', padding: 20 }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {row.map((cell, j) => <td key={j} style={S.td}>{cell ?? '—'}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SparkBar({ buckets, field, color }) {
  const vals = buckets.map((b) => b[field]);
  const max = Math.max(...vals, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 40 }}>
      {vals.map((v, i) => (
        <div
          key={i}
          title={`${v}`}
          style={{
            flex: 1,
            height: `${Math.max(2, (v / max) * 100)}%`,
            background: v > 0 ? (color || theme.primary || '#3b82f6') : theme.border,
            borderRadius: 1,
            transition: 'height 0.3s',
          }}
        />
      ))}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{title}</div>
      {right && <div style={{ fontSize: 11, color: theme.textMuted }}>{right}</div>}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function PerformanceMonitor() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/perf-monitor/snapshot');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load snapshot');
      setData(json);
      setErr('');
      setLastRefresh(new Date());
      setCountdown(30);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  }, [load]);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  if (loading) {
    return (
      <PageLayout title="Performance Monitor" hideBack>
        <div style={{ color: theme.textMuted, padding: 32 }}>Loading…</div>
      </PageLayout>
    );
  }

  if (err) {
    return (
      <PageLayout title="Performance Monitor" hideBack>
        <div style={{ ...S.card, borderColor: '#dc2626', color: '#dc2626' }}>{err}</div>
      </PageLayout>
    );
  }

  const { meta, db, api, sql, tables, slowQueries, score, suggestions } = data;
  const pressureColor = PRESSURE_COLOR[db.pressureLabel] || theme.textMuted;

  return (
    <PageLayout
      title="Performance Monitor"
      subtitle="Live — zero DB writes — resets on restart — use the app to collect measurements"
      hideBack
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...S.badge('#16a34a'), fontSize: 12 }}>
            Uptime {fmtUptime(meta.uptimeMs)}
          </span>
          <span style={{ ...S.badge(pressureColor), fontSize: 12 }}>
            Compute: {db.pressureLabel}
          </span>
          <span style={{ ...S.badge(SCORE_COLOR(score.overall)), fontSize: 12 }}>
            Score {score.overall}/100
          </span>
          <span style={{ ...S.badge('#6b7280'), fontSize: 12 }}>
            {meta.endpointCount} routes tracked
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: theme.textMuted }}>
              Refreshed {lastRefresh.toLocaleTimeString()} · next in {countdown}s
            </span>
          )}
          <button
            onClick={load}
            style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${theme.border}`, background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            Refresh now
          </button>
        </div>
      </div>

      {/* ── Row 1: Scores + Core KPIs ── */}
      <div style={{ ...S.card, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <ScoreRing label="Overall" value={score.overall} />
          <ScoreRing label="DB" value={score.db} />
          <ScoreRing label="API" value={score.api} />
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
          <Kpi label="Queries / min" value={db.queriesPerMinute} color={db.queriesPerMinute > 150 ? '#dc2626' : db.queriesPerMinute > 50 ? '#d97706' : '#16a34a'} />
          <Kpi label="Queries / hour" value={fmtNum(db.queriesPerHour)} />
          <Kpi label="Total queries" value={fmtNum(db.totalQueries)} />
          <Kpi label="Background" value={fmtNum(db.backgroundQueries)} sub={`${db.backgroundPct}% of total (schedulers)`} />
          <Kpi label="Avg slow" value={fmtMs(db.avgSlowMs)} color={db.avgSlowMs > 500 ? '#dc2626' : undefined} />
          <Kpi label="p95 slow" value={fmtMs(db.p95SlowMs)} />
          <Kpi label="p99 slow" value={fmtMs(db.p99SlowMs)} />
          <Kpi label="Slow total" value={db.totalSlowQueries} color={db.totalSlowQueries > 10 ? '#d97706' : undefined} />
          <Kpi label="Errors" value={db.totalErrors} color={db.totalErrors > 0 ? '#dc2626' : undefined} />
        </div>
      </div>

      {/* ── Row 2: Activity sparklines ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={S.card}>
          <SectionHeader title="Query activity — rolling 60 min" right="each bar = 1 min" />
          <SparkBar buckets={db.minBuckets} field="queries" />
        </div>
        <div style={S.card}>
          <SectionHeader title="Query activity — rolling 24 h" right="each bar = 1 hour" />
          <SparkBar buckets={db.hrBuckets} field="queries" color="#8b5cf6" />
        </div>
      </div>

      {/* ── Row 3: Top tables + Top endpoints ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Table
          title="Top tables by query count"
          headers={['#', 'Table', 'Query count', '% of total']}
          rows={tables.topTables.slice(0, 10).map((t, i) => [
            <span style={{ color: theme.textMuted, fontSize: 11 }}>{i + 1}</span>,
            <code style={S.mono}>{t.table}</code>,
            fmtNum(t.count),
            db.totalQueries ? `${Math.round((t.count / db.totalQueries) * 100)}%` : '—',
          ])}
        />
        <Table
          title="Top endpoints by request count"
          headers={['#', 'Route', 'Calls', 'Avg ms', 'p95', 'Q/req']}
          rows={api.endpoints.slice(0, 10).map((e, i) => [
            <span style={{ color: theme.textMuted, fontSize: 11 }}>{i + 1}</span>,
            <code style={S.mono}>{e.endpoint}</code>,
            fmtNum(e.count),
            fmtMs(e.avgMs),
            fmtMs(e.p95),
            <span style={{ color: e.avgQueries > 5 ? '#d97706' : undefined, fontWeight: e.avgQueries > 5 ? 700 : undefined }}>
              {e.avgQueries}
            </span>,
          ])}
        />
      </div>

      {/* ── Row 4: Top SQL patterns ── */}
      <Table
        title="Top SQL patterns by frequency (normalized — literals replaced with ?)"
        headers={['#', 'Pattern', 'Count', 'Slow hits', 'Avg slow ms', 'Last seen']}
        rows={sql.patterns.slice(0, 20).map((p, i) => [
          <span style={{ color: theme.textMuted, fontSize: 11 }}>{i + 1}</span>,
          <code style={{ ...S.mono, wordBreak: 'break-all', maxWidth: 420, display: 'block' }}>{p.pattern}</code>,
          <span style={{ fontWeight: 700 }}>{fmtNum(p.count)}</span>,
          p.slowCount > 0
            ? <span style={{ color: '#d97706', fontWeight: 700 }}>{p.slowCount}</span>
            : <span style={{ color: theme.textMuted }}>0</span>,
          fmtMs(p.avgSlowMs),
          fmtTime(p.lastSeen),
        ])}
      />

      {/* ── Row 5: Slow queries log ── */}
      <Table
        title={`Slow queries log — threshold ${200}ms — last 50 (newest first)`}
        headers={['Time', 'Duration', 'Context', 'SQL pattern']}
        rows={slowQueries.slice(0, 20).map((q) => [
          fmtTime(q.ts),
          <span style={{ color: q.durationMs > 800 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
            {fmtMs(q.durationMs)}
          </span>,
          <code style={{ ...S.mono, color: '#6b7280' }}>{q.context}</code>,
          <code style={{ ...S.mono, wordBreak: 'break-all', maxWidth: 360, display: 'block' }}>{q.pattern}</code>,
        ])}
        emptyText="No slow queries — all queries completing under 200ms"
      />

      {/* ── Row 6: Optimization suggestions ── */}
      {suggestions.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Optimization suggestions (data-driven)</div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ borderLeft: '3px solid #d97706', paddingLeft: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.problem}</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{s.evidence}</div>
              <div style={{ fontSize: 12 }}>
                <span style={S.statLabel}>Fix: </span>{s.estimatedImprovement}
                {' · '}
                <span style={S.statLabel}>Risk: </span>
                <span style={{ color: s.risk === 'Low' ? '#16a34a' : '#d97706', fontWeight: 700 }}>{s.risk}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Row 7: Footer note ── */}
      <div style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', paddingTop: 8 }}>
        All data is in-memory only · Zero DB writes · Zero scheduled jobs · Resets on backend restart
        · {meta.endpointCount}/{meta.endpointCap} route slots used
      </div>
    </PageLayout>
  );
}

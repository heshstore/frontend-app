import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const WORKFLOW = [
  { label: 'Audience',   path: '/marketing/whatsapp-engine/audience',   icon: '👥', desc: 'Contact list' },
  { label: 'Templates',  path: '/marketing/whatsapp-engine/templates',  icon: '📝', desc: 'Message templates' },
  { label: 'Campaigns',  path: '/marketing/whatsapp-engine/campaigns',  icon: '📢', desc: 'Launch & manage' },
  { label: 'Queue',      path: '/marketing/whatsapp-engine/queue',      icon: '⏳', desc: 'Pending sends' },
  { label: 'Logs',       path: '/marketing/whatsapp-engine/logs',       icon: '📋', desc: 'Sent messages' },
  { label: 'Inbox',      path: '/marketing/whatsapp-engine/inbox',      icon: '📥', desc: 'Replies & leads' },
];

const card = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 8,
  padding: 16,
  textAlign: 'center',
};

const btn = (bg, color = '#fff') => ({
  background: bg,
  color,
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});

const QUICK_LINKS = [
  { emoji: '📱', title: 'Numbers', desc: 'Manage WhatsApp numbers, QR, limits and risk.', path: '/marketing/whatsapp-engine/numbers' },
  { emoji: '🛡️', title: 'Governance', desc: 'Stability report, scale readiness, re-enable controls.', path: '/marketing/whatsapp-engine/governance' },
  { emoji: '📊', title: 'Analytics', desc: 'Delivery rates, campaign stats, template performance.', path: '/marketing/whatsapp-engine/analytics' },
  { emoji: '📅', title: 'Daily Report', desc: 'Morning ops review — funnel, audience, numbers.', path: '/marketing/whatsapp-engine/daily-report' },
  { emoji: '✅', title: 'Validate', desc: 'Delivery flow diagnostics and test contacts.', path: '/marketing/whatsapp-engine/validate' },
];

function SkeletonCard() {
  return (
    <div style={{ ...card, height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
      <div style={{ height: 12, background: '#e9ecef', borderRadius: 4, width: '50%', margin: '0 auto' }} />
      <div style={{ height: 28, background: '#e9ecef', borderRadius: 4, width: '40%', margin: '0 auto' }} />
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#212529' }}>{value ?? '—'}</div>
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: ok ? '#d1fae5' : '#fee2e2',
        color: ok ? '#065f46' : '#991b1b',
        borderRadius: 20,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span style={{ fontSize: 7, lineHeight: 1 }}>●</span>
      {label}
    </span>
  );
}

const WA_STATE_CHIP_DASH = {
  ready:          { bg: '#dcfce7', color: '#166534',  label: 'Connected' },
  awaiting_scan:  { bg: '#fef9c3', color: '#854d0e',  label: 'Scan Required' },
  authenticating: { bg: '#ede9fe', color: '#6d28d9',  label: 'Authenticating' },
  initializing:   { bg: '#dbeafe', color: '#1d4ed8',  label: 'Initializing' },
  failed:         { bg: '#fee2e2', color: '#991b1b',  label: 'Failed' },
  disconnecting:  { bg: '#f3f4f6', color: '#374151',  label: 'Disconnecting' },
  idle:           { bg: '#f3f4f6', color: '#6b7280',  label: 'Idle' },
};

function WaStateCountChip({ stateKey, count }) {
  const cfg = WA_STATE_CHIP_DASH[stateKey] || WA_STATE_CHIP_DASH.idle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      borderRadius: 20, padding: '4px 12px',
      fontSize: 12, fontWeight: 700,
    }}>
      {cfg.label}
      <span style={{
        background: 'rgba(0,0,0,0.12)', borderRadius: 10,
        padding: '0 6px', fontSize: 11,
      }}>
        {count}
      </span>
    </span>
  );
}

export default function WaEngineDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, healthRes] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/analytics/engine/dashboard'),
        apiFetch('/marketing/whatsapp-engine/health'),
      ]);
      if (!statsRes.ok) throw new Error(`Stats error ${statsRes.status}`);
      const [d, h] = await Promise.all([statsRes.json(), healthRes.ok ? healthRes.json() : null]);
      setStats(d);
      setHealth(h);
    } catch (e) {
      setError(e?.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const kpis = stats
    ? [
        { label: 'Active Numbers', value: stats.active_numbers, color: '#198754' },
        { label: 'Queue Pending', value: stats.queue_pending, color: '#fd7e14' },
        { label: 'Sent Today', value: stats.sent_today, color: '#0d6efd' },
        { label: 'Delivered Today', value: stats.delivered_today, color: '#0891b2' },
        { label: 'Read Today', value: stats.read_today, color: '#7c3aed' },
        { label: 'Replies Today', value: stats.replied_today, color: '#059669' },
        { label: 'CRM Leads Today', value: stats.crm_leads_today, color: '#dc3545' },
      ]
    : [];

  const hasRiskAlerts = health && health.risk_alerts && health.risk_alerts.length > 0;

  return (
    <PageLayout
      title="WhatsApp Engine"
      subtitle="Marketing automation dashboard — auto-refreshes every 30 s"
      hideBack
      actions={
        <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Engine Status Bar */}
        {health && (
          <div
            style={{
              background: health.engine_enabled ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${health.engine_enabled ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <StatusPill ok={health.engine_enabled} label={health.engine_enabled ? 'Engine ON' : 'Engine DISABLED'} />
            <StatusPill ok={health.wa_connected} label={health.wa_connected ? 'WA Connected' : 'WA Disconnected'} />
            <StatusPill ok={health.send_window_active} label={health.send_window_active ? 'Send Window Open' : 'Send Window Closed'} />
            {health.dry_run_mode && (
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                DRY RUN MODE
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>
              {health.sent_last_hour} sent / {health.failed_last_hour} failed in last hour
            </span>
          </div>
        )}

        {/* Campaign Workflow Strip */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Campaign Workflow</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {WORKFLOW.map((step, i) => (
              <React.Fragment key={step.path}>
                <button
                  onClick={() => navigate(step.path)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '8px 14px', cursor: 'pointer', minWidth: 80,
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <span style={{ fontSize: 16 }}>{step.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginTop: 3 }}>{step.label}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{step.desc}</span>
                </button>
                {i < WORKFLOW.length - 1 && <span style={{ color: '#cbd5e1', fontSize: 18, flexShrink: 0 }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Risk Alerts */}
        {hasRiskAlerts && (
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#c2410c', marginBottom: 8 }}>
              ⚠️ {health.risk_alerts.length} number{health.risk_alerts.length > 1 ? 's' : ''} with elevated risk
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {health.risk_alerts.map((a) => (
                <span
                  key={a.number_id}
                  style={{
                    background: '#fff',
                    border: '1px solid #fed7aa',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: '#7c2d12',
                  }}
                >
                  {a.phone} — risk {a.risk_score}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* WA Number State Summary */}
        {health?.wa_state_breakdown && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              Number States (live)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['ready', 'authenticating', 'awaiting_scan', 'initializing', 'failed', 'disconnecting', 'idle'].map((k) => {
                const count = health.wa_state_breakdown[k] ?? 0;
                if (count === 0 && !['ready', 'failed'].includes(k)) return null;
                return <WaStateCountChip key={k} stateKey={k} count={count} />;
              })}
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : error
            ? null
            : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Error state */}
        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#dc3545', fontWeight: 600, marginBottom: 8 }}>Failed to load stats</div>
            <div style={{ color: '#6c757d', fontSize: 13, marginBottom: 12 }}>{error}</div>
            <button style={btn('#dc3545')} onClick={load}>
              Retry
            </button>
          </div>
        )}

        {/* Section heading */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Operations
        </div>

        {/* Quick links grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {QUICK_LINKS.map((link) => (
            <div
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: 8,
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{link.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{link.title}</div>
              <div style={{ fontSize: 12, color: '#6c757d', lineHeight: 1.4 }}>{link.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

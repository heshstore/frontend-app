import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const card = (border = '#dee2e6', bg = '#fff') => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
});

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

const pillStyle = (ok, neutral = false) => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  background: neutral ? '#f3f4f6' : ok ? '#d1fae5' : '#fee2e2',
  color: neutral ? '#374151' : ok ? '#065f46' : '#991b1b',
});

const mono = { fontFamily: 'monospace', fontSize: 12, color: '#374151' };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, ok, neutral }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 13, color: '#374151', minWidth: 200, flexShrink: 0 }}>{label}</span>
      {ok !== undefined ? <span style={pillStyle(ok, neutral)}>{ok ? 'OK' : 'FAIL'}</span> : null}
      <span style={{ ...mono, flex: 1, wordBreak: 'break-all' }}>{String(value ?? '—')}</span>
    </div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

export default function WaValidate() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seedInput, setSeedInput] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/validate');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e?.message || 'Failed to load validation report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes — validation report rarely changes
  useEffect(() => {
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, [load]);

  const handleSeedTestContacts = async () => {
    const lines = seedInput.trim().split('\n').filter(Boolean);
    const contacts = lines.map((l) => {
      const [phone, ...rest] = l.split(',');
      return { phone: phone.trim(), name: rest.join(',').trim() || undefined };
    });
    if (!contacts.length) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/validate/seed-test-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      const d = await res.json();
      setSeedResult(`Seeded ${d.seeded} contact(s)`);
      load();
    } catch (e) {
      setSeedResult('Error: ' + e?.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !report) {
    return (
      <PageLayout title="Engine Validation" subtitle="Checking system state…" hideBack>
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading…</div>
      </PageLayout>
    );
  }

  if (error && !report) {
    return (
      <PageLayout title="Engine Validation" hideBack>
        <div style={{ ...card('#fca5a5', '#fff5f5'), textAlign: 'center' }}>
          <div style={{ color: '#dc3545', fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
          <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>{error}</div>
          <button style={btn('#dc3545')} onClick={load}>Retry</button>
        </div>
      </PageLayout>
    );
  }

  const r = report;
  const hasAnomalies = r.anomalies && r.anomalies.length > 0;
  const df = r.delivery_flow;
  const funnelTotal = df.sent + df.failed;

  return (
    <PageLayout
      title="Engine Validation"
      subtitle="Phase 6 live-test checklist — auto-refreshes every 30 s"
      hideBack
      actions={
        <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Anomalies */}
        {hasAnomalies ? (
          <div style={{ ...card('#fed7aa', '#fff7ed'), marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: 10 }}>
              ⚠️ {r.anomalies.length} issue{r.anomalies.length > 1 ? 's' : ''} detected
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {r.anomalies.map((a, i) => (
                <li key={i} style={{ fontSize: 13, color: '#7c2d12', marginBottom: 4 }}>{a}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ ...card('#bbf7d0', '#f0fdf4'), marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: 15 }}>All checks passed — system is healthy</div>
          </div>
        )}

        {/* Campaign Setup */}
        <Section title="Campaign Setup">
          <div style={card()}>
            <Row label="Active templates"    value={r.catalog?.active_templates ?? '—'}   ok={(r.catalog?.active_templates ?? 0) > 0} />
            <Row label="Active campaigns"    value={r.catalog?.active_campaigns ?? '—'}   ok={null} neutral />
            <Row label="Pending queue items" value={r.catalog?.pending_queue_items ?? '—'} ok={(r.catalog?.pending_queue_items ?? 0) > 0} />
          </div>
        </Section>

        {/* Environment */}
        <Section title="Environment Config">
          <div style={card()}>
            <Row label="Engine enabled"          value={String(r.env.engine_enabled)}           ok={r.env.engine_enabled} />
            <Row label="Dry run mode"            value={String(r.env.dry_run_mode)}             ok={r.env.dry_run_mode} />
            <Row label="Pilot mode"              value={String(r.env.pilot_mode)}               ok={null} neutral />
            <Row label="Test-only mode"          value={String(r.env.test_only_mode)}           ok={null} neutral />
            <Row label="Test send-window bypass" value={String(r.env.test_bypass_send_window)}  ok={null} neutral />
          </div>
        </Section>

        {/* Server & Send Window */}
        <Section title="Server & Send Window">
          <div style={card()}>
            <Row label="Server timezone"      value={r.server.timezone}      ok={r.server.timezone !== 'UTC'} />
            <Row label="Local time (server)"  value={r.server.local_time} />
            <Row label="Send window active"   value={r.server.send_window_active ? 'YES (10am–5:30pm)' : 'NO'}  ok={r.server.send_window_active} />
            <Row label="Next window opens"    value={r.server.next_window_start} />
            <Row label="WhatsApp connected"   value={String(r.wa.connected)}  ok={r.wa.connected} />
          </div>
        </Section>

        {/* Delivery Flow Funnel */}
        <Section title="Today's Delivery Flow">
          <div style={card()}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Since midnight — {df.since?.slice(0, 10)}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Pending', value: df.pending, color: '#fd7e14' },
                { label: 'Sent', value: df.sent, color: '#0d6efd' },
                { label: 'Delivered', value: df.delivered, color: '#0891b2' },
                { label: 'Read', value: df.read, color: '#7c3aed' },
                { label: 'Replied', value: df.replied, color: '#15803d' },
                { label: 'Failed', value: df.failed, color: '#dc3545' },
                { label: 'Skipped', value: df.skipped, color: '#6b7280' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 6, padding: '10px 8px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <FunnelBar label="Delivery rate" value={df.delivered} total={funnelTotal} color="#0891b2" />
            <FunnelBar label="Read rate" value={df.read} total={df.sent || 1} color="#7c3aed" />
            <FunnelBar label="Reply rate" value={df.replied} total={df.sent || 1} color="#15803d" />
            <FunnelBar label="Fail rate" value={df.failed} total={funnelTotal || 1} color="#dc3545" />
          </div>
        </Section>

        {/* Queue Patterns */}
        <Section title="Queue Pattern Analysis">
          <div style={card()}>
            <Row label="Pending items"          value={r.queue.total_pending}         ok={r.queue.total_pending > 0} />
            <Row label="Stuck in PROCESSING"    value={r.queue.stuck_processing}      ok={r.queue.stuck_processing === 0} />
            <Row label="Items with 3+ retries"  value={r.queue.retry_loops}           ok={r.queue.retry_loops === 0} />
            <Row label="Outside send window"    value={r.queue.outside_window}        ok={r.queue.outside_window === 0} />
            <Row label="Duplicate phones"       value={r.queue.duplicate_phones.length} ok={r.queue.duplicate_phones.length === 0} />
          </div>

          {Object.keys(r.queue.timing_by_hour).length > 0 && (
            <div style={{ ...card(), marginTop: -4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Schedule spread (by hour)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(r.queue.timing_by_hour)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([hour, count]) => {
                    const h = parseInt(hour);
                    const inWindow = h >= 10 && h <= 17;
                    return (
                      <div key={hour} style={{
                        background: inWindow ? '#dbeafe' : '#fee2e2',
                        borderRadius: 6, padding: '4px 10px',
                        fontSize: 12, fontWeight: 600,
                        color: inWindow ? '#1d4ed8' : '#991b1b',
                      }}>
                        {hour}: {count}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Section>

        {/* Test Contacts */}
        <Section title="Test Contact Group">
          <div style={card()}>
            <Row label="Test contacts configured" value={r.test_contacts.count} ok={r.test_contacts.count >= 5} />
            {r.test_contacts.phones.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.test_contacts.phones.map((p) => (
                  <span key={p} style={{ ...mono, background: '#f3f4f6', padding: '3px 8px', borderRadius: 4 }}>{p}</span>
                ))}
              </div>
            )}
          </div>

          <div style={card()}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Add test contacts (one per line: phone, name)
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              Example: +919876543210, Ravi Kumar
            </div>
            <textarea
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="+919876543210, Ravi Kumar&#10;+919123456789, Priya Shah"
              rows={4}
              style={{
                width: '100%', borderRadius: 6, border: '1px solid #d1d5db',
                padding: '8px 10px', fontSize: 13, fontFamily: 'monospace',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <button style={btn('#198754')} onClick={handleSeedTestContacts} disabled={seeding || !seedInput.trim()}>
                {seeding ? 'Seeding…' : 'Add Test Contacts'}
              </button>
              {seedResult && (
                <span style={{ fontSize: 13, color: seedResult.startsWith('Error') ? '#dc3545' : '#198754' }}>
                  {seedResult}
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* Audit Events */}
        {r.recent_audit_events.length > 0 && (
          <Section title="Recent Audit Events (last 20)">
            <div style={card()}>
              {r.recent_audit_events.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: '#e0f2fe', color: '#075985', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {e.event}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{e.reason ?? '—'}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {new Date(e.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pilot mode guidance */}
        <div style={{ ...card('#e0e7ff', '#eef2ff'), marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 8 }}>Phase 6 Progression Guide</div>
          <div style={{ fontSize: 12, color: '#4338ca', lineHeight: 1.7 }}>
            <div><strong>Step 1 (now):</strong> PILOT_MODE=true, TEST_ONLY=true, DRY_RUN=false → real sends to test group only, tighter limits</div>
            <div><strong>Step 2 (day 2–3):</strong> Verify all test contacts received messages correctly, CRM leads created on replies</div>
            <div><strong>Step 3 (after 7 stable days):</strong> TEST_ONLY=false, keep PILOT_MODE=true → real audience at pilot limits</div>
            <div><strong>Step 4 (week 2+):</strong> PILOT_MODE=false, normal warmup limits → full engine active</div>
            <div style={{ marginTop: 6, color: '#6d28d9', fontWeight: 600 }}>Stop immediately if: QR logout, delivery failure spike, account warning</div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

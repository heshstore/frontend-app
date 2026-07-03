import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';
import { apiFetch } from '../../utils/api';

// ── Static fallback (shown only when API unavailable or empty) ────────────────
const LEGACY_VERSIONS = [
  {
    version: 'v2026.06.11', deployed_at: '2026-06-09T18:00:00.000Z',
    backend_commit: '37cd501', frontend_commit: 'b203308', bundle_hash: '1304c7ee',
    migration_ids: ['DB-MIG-2026-06-09-AUDIENCE-MERGE'],
    backup_snapshot: 'pre-v2026.06.11', rollback_code: 'v2026.06.11',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'Promotional DB Master Contact Merge Engine — enrich-on-duplicate, source history, contact_strength, email POSSIBLE_DUPLICATE detection, 5000/upload limit',
  },
  {
    version: 'v2026.06.10', deployed_at: '2026-06-09T16:45:00.000Z',
    backend_commit: '37cd501', frontend_commit: 'b203308', bundle_hash: '1304c7ee',
    migration_ids: [], backup_snapshot: 'pre-v2026.06.10', rollback_code: 'v2026.06.10',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'fix(promo-import): normalize + dedupe phones before bulk upsert',
  },
  {
    version: 'v2026.06.9', deployed_at: '2026-06-09T16:00:00.000Z',
    backend_commit: '37cd501', frontend_commit: 'b203308', bundle_hash: '1304c7ee',
    migration_ids: [], backup_snapshot: 'pre-v2026.06.9', rollback_code: 'v2026.06.9',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'AI Campaign dashboard — per-telecaller activity, DB counts, accurate sent attribution',
  },
  {
    version: 'v2026.06.8', deployed_at: '2026-06-09T13:30:00.000Z',
    backend_commit: '37cd501', frontend_commit: 'b203308', bundle_hash: '1304c7ee',
    migration_ids: [], backup_snapshot: 'pre-v2026.06.8', rollback_code: 'v2026.06.8',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'Prior release — rollback point before AI dashboard audit fixes',
  },
  {
    version: 'v2026.06.7', deployed_at: '2026-06-09T12:05:00.000Z',
    backend_commit: 'dbf4764', frontend_commit: 'b203308', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.7', rollback_code: 'v2026.06.7',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'fix(phone-link): clear partial session dir before reinit',
  },
  {
    version: 'v2026.06.6', deployed_at: '2026-06-09T11:35:00.000Z',
    backend_commit: 'dbf4764', frontend_commit: 'b203308', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.6', rollback_code: 'v2026.06.6',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'fix(phone-link): reinitialize client with pairWithPhoneNumber option',
  },
  {
    version: 'v2026.06.5', deployed_at: '2026-06-09T10:59:00.000Z',
    backend_commit: 'dbf4764', frontend_commit: 'b203308', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.5', rollback_code: 'v2026.06.5',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'fix(phone-link): require awaiting_scan state, 11-digit validation, pre-flight diagnostics',
  },
  {
    version: 'v2026.06.4', deployed_at: '2026-06-08T17:49:00.000Z',
    backend_commit: 'dbf4764', frontend_commit: 'b203308', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.4', rollback_code: 'v2026.06.4',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'fix(inbox): LATERAL JOIN dedup — eliminate duplicate conversations from SQL fan-out',
  },
  {
    version: 'v2026.06.3', deployed_at: '2026-06-08T00:00:00.000Z',
    backend_commit: '', frontend_commit: '', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.3', rollback_code: 'v2026.06.3',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'Fix: inbox duplicate conversations — LATERAL JOIN with LIMIT 1',
  },
  {
    version: 'v2026.06.2', deployed_at: '2026-06-08T14:59:00.000Z',
    backend_commit: 'dbf4764', frontend_commit: 'b203308', bundle_hash: null,
    migration_ids: [], backup_snapshot: 'pre-v2026.06.2', rollback_code: 'v2026.06.2',
    rollback_available: false, deployment_status: 'RELEASED',
    notes: 'Autonomous campaign capacity — warmup-only limits, deploy script added',
  },
  {
    version: 'v2026.06.1', deployed_at: '2026-06-06T14:15:00.000Z',
    backend_commit: '172b850', frontend_commit: '758c7fd', bundle_hash: null,
    migration_ids: ['DB-MIG-2026-06-06-A'],
    backup_snapshot: 'pre-v2026.06.1', rollback_code: 'v2026.06.1',
    rollback_available: true, deployment_status: 'RELEASED',
    notes: 'Pre-live stabilization — audience entity overhaul, phone nullable, number-limits, ai-dashboard',
  },
];

// ── Tamper detection ──────────────────────────────────────────────────────────
async function computeIntegrityHash(v) {
  const payload = [
    v.version           || '',
    v.backend_commit    || '',
    v.frontend_commit   || '',
    v.bundle_hash       || '',
    v.backup_snapshot   || '',
    v.rollback_code     || '',
    (v.migration_ids    || []).slice().sort().join(','),
    v.deployment_status || '',
  ].join('|');
  try {
    const encoded = new TextEncoder().encode(payload);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

async function detectTampering(versions) {
  const tampered = new Set();
  await Promise.all(versions.map(async (v) => {
    if (!v.integrity_hash) return;
    const recomputed = await computeIntegrityHash(v);
    if (recomputed && recomputed !== v.integrity_hash) tampered.add(v.version);
  }));
  return tampered;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(',', '');
  } catch { return iso; }
}

function envColor(env) {
  if (env === 'PRODUCTION') return '#dc2626';
  if (env === 'LOCAL')      return '#059669';
  if (env === 'TEST')       return '#d97706';
  return '#6b7280';
}

function statusBadge(v) {
  const s = (v.deployment_status || '').toUpperCase();
  if (s === 'PENDING')  return <span style={BADGE('#6c757d')}>PENDING</span>;
  if (s === 'FAILED')   return <span style={BADGE('#dc2626')}>FAILED</span>;
  if (s === 'ROLLBACK') return <span style={BADGE('#fd7e14')}>ROLLBACK</span>;
  if (s === 'RELEASED') return <span style={BADGE('#0d6efd')}>RELEASED</span>;
  return <span style={BADGE('#6c757d')}>{s || '—'}</span>;
}

function rollbackBadge(available) {
  if (available === true)  return <span style={BADGE('#059669')}>YES</span>;
  if (available === false) return <span style={BADGE('#dc2626')}>NO</span>;
  return <span style={BADGE('#6c757d')}>—</span>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD = {
  background: '#fff',
  border: `1px solid ${theme.border}`,
  borderRadius: theme.borderRadius,
  padding: 20,
};

const FIELD_LABEL = {
  fontSize: 11, fontWeight: 700, color: theme.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const BADGE = (bg, color = '#fff') => ({
  display: 'inline-block', padding: '3px 10px',
  borderRadius: 10, fontSize: 11, fontWeight: 700,
  background: bg, color,
});

const TH = {
  padding: '8px 12px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: theme.textMuted,
  borderBottom: `2px solid ${theme.border}`, whiteSpace: 'nowrap',
};

const TD = {
  padding: '10px 12px', fontSize: 13, color: theme.text,
  borderBottom: `1px solid ${theme.border}`, verticalAlign: 'middle',
};

const CODE = {
  fontFamily: 'monospace', background: '#f1f3f5',
  padding: '2px 6px', borderRadius: 3, fontSize: 11,
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionDivider({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: theme.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginTop: 32, marginBottom: 16,
      paddingBottom: 8, borderBottom: `2px solid ${theme.border}`,
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, valueColor, sub }) {
  return (
    <div style={CARD}>
      <div style={FIELD_LABEL}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: valueColor || theme.text }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function DrawerField({ label, value, mono }) {
  return (
    <div>
      <div style={FIELD_LABEL}>{label}</div>
      <div style={{
        fontSize: 12, marginTop: 4,
        fontFamily: mono ? 'monospace' : undefined,
        color: value ? theme.text : theme.textMuted,
        wordBreak: 'break-all',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SystemHealth() {
  const [envData,        setEnvData]        = useState(null);
  const [envLoading,     setEnvLoading]     = useState(true);
  const [envError,       setEnvError]       = useState('');
  const [versions,       setVersions]       = useState([]);
  const [versionsLoading,setVersionsLoading]= useState(true);
  const [isLegacy,       setIsLegacy]       = useState(false);
  const [apiError,       setApiError]       = useState(null);
  const [tampered,       setTampered]       = useState(new Set());
  const [expandedRow,    setExpandedRow]    = useState(null);

  // Fetch environment
  useEffect(() => {
    (async () => {
      try {
        const res  = await apiFetch('/health/environment');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Failed to load environment');
        setEnvData(json);
      } catch (e) {
        setEnvError(e.message);
      } finally {
        setEnvLoading(false);
      }
    })();
  }, []);

  // Fetch deployment versions
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch('/deployment-versions');
        if (cancelled) return;
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setVersions(data);
          setIsLegacy(false);
          const t = await detectTampering(data);
          if (!cancelled) setTampered(t);
        } else {
          setVersions(LEGACY_VERSIONS);
          setIsLegacy(true);
        }
      } catch (err) {
        if (cancelled) return;
        setApiError(err.message || 'Failed to load version history');
        setVersions(LEGACY_VERSIONS);
        setIsLegacy(true);
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const latest         = versions.find(v => v.deployment_status === 'RELEASED') ?? versions[0] ?? null;
  const displayVersions= versions.slice(0, 10);
  const hasTamper      = tampered.size > 0;

  const releaseAccent =
    latest?.deployment_status === 'RELEASED' ? '#059669' :
    latest?.deployment_status === 'FAILED'   ? '#dc2626' : '#6c757d';

  function toggleDrawer(version) {
    setExpandedRow(prev => prev === version ? null : version);
  }

  return (
    <PageLayout title="System Health" subtitle="Environment · Deployment · Recovery" hideBack>

      {/* Tamper warning */}
      {hasTamper && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 6, background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', fontSize: 13 }}>
          <strong>⚠ Integrity Warning</strong> — {tampered.size} record(s) with hash mismatch:{' '}
          {[...tampered].join(', ')}
        </div>
      )}

      {/* ── SECTION 1: Environment ─────────────────────────────────────────── */}
      <SectionDivider>Environment</SectionDivider>

      {envError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#b91c1c', fontSize: 13 }}>
          {envError}
        </div>
      )}

      {envLoading && (
        <div style={{ padding: '16px 0', color: theme.textMuted, fontSize: 13 }}>Loading environment…</div>
      )}

      {envData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
            <MetricCard
              label="Environment"
              value={envData.environment}
              valueColor={envColor(envData.environment)}
              sub={`NODE_ENV: ${envData.node_env}`}
            />
            <MetricCard
              label="Database"
              value={envData.database_status}
              valueColor={envData.database_status === 'CONNECTED' ? '#059669' : '#dc2626'}
              sub={`${envData.database_name} @ ${envData.database_host}`}
            />
            <MetricCard
              label="Customer Contacts"
              value={envData.customer_db_count ?? '—'}
              sub="records"
            />
            <MetricCard
              label="Promotional Contacts"
              value={envData.promotional_db_count ?? '—'}
              sub="records"
            />
          </div>

          <div style={{ ...CARD, marginBottom: 16 }}>
            <div style={FIELD_LABEL}>Import Protection</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>{envData.import_protection}</div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 10, fontFamily: 'monospace' }}>
              Active: {envData.database_url_redacted}
            </div>
          </div>

          {envData.audit && (
            <div style={{ ...CARD, marginBottom: 0 }}>
              <div style={FIELD_LABEL}>Isolation Audit</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>Status</div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, marginTop: 4,
                    color: envData.audit.isolation_status === 'PASS' ? '#059669'
                         : envData.audit.isolation_status === 'WARN' ? '#d97706' : '#dc2626',
                  }}>
                    {envData.audit.isolation_status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>Overwrite Risk</div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, marginTop: 4,
                    color: envData.audit.overwrite_risk === 'LOW'    ? '#059669'
                         : envData.audit.overwrite_risk === 'MEDIUM' ? '#d97706' : '#dc2626',
                  }}>
                    {envData.audit.overwrite_risk}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, marginTop: 12 }}>{envData.audit.overwrite_risk_reason}</div>

              <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>Production Database contains:</div>
                <div style={{ color: '#6b7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 16px' }}>
                  <span>• Customer Contacts</span>
                  <span>• Orders &amp; Quotations</span>
                  <span>• Promotional Contacts</span>
                  <span>• Invoices</span>
                  <span>• CRM Leads</span>
                  <span>• Production Pipeline</span>
                  <span>• Staff &amp; RBAC</span>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', color: '#6b7280' }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>Local Database</span> is for development and testing only.{' '}
                  <span style={{ color: '#374151', fontWeight: 600 }}>Production Database</span> stores live business data.
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6 }}>
                <div><strong>Local DB:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{envData.audit.local_database_redacted || '—'}</span>
                </div>
                <div><strong>Production DB:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{envData.audit.production_database_redacted || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Current Release Card ──────────────────────────────────────────── */}
      {latest && (
        <>
          <SectionDivider>Current Release</SectionDivider>
          <div style={{ ...CARD, borderLeft: `4px solid ${releaseAccent}` }}>
            {isLegacy && (
              <div style={{ fontSize: 11, color: '#d97706', marginBottom: 10 }}>
                Deployment tracking not yet active — showing static data
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
              <div>
                <div style={FIELD_LABEL}>Version</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 5 }}>{latest.version}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>Deployment Status</div>
                <div style={{ marginTop: 8 }}>{statusBadge(latest)}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>Rollback Ready</div>
                <div style={{ marginTop: 8 }}>{rollbackBadge(latest.rollback_available)}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>Backup Snapshot</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 6, color: theme.text, wordBreak: 'break-all' }}>
                  {latest.backup_snapshot || '—'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION 2: Deployment & Recovery table ───────────────────────── */}
      <SectionDivider>Deployment & Recovery</SectionDivider>

      {isLegacy && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 6, background: '#e9ecef', border: '1px solid #dee2e6', color: '#495057', fontSize: 12 }}>
          {apiError
            ? `API unavailable (${apiError}) — showing static history.`
            : 'Deployment tracking not yet active — showing static history. Data becomes live after the next deploy.sh run.'}
        </div>
      )}

      {versionsLoading ? (
        <div style={{ padding: '16px 0', color: theme.textMuted, fontSize: 13 }}>Loading deployment history…</div>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}` }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 36 }}>#</th>
                <th style={TH}>Version</th>
                <th style={{ ...TH, whiteSpace: 'nowrap' }}>Date / Time (IST)</th>
                <th style={TH}>Status</th>
                <th style={TH}>Rollback Ready</th>
                <th style={{ ...TH, textAlign: 'center', width: 90 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {displayVersions.map((v, i) => {
                const isTampered = tampered.has(v.version);
                const isOpen     = expandedRow === v.version;
                const hasMigs    = Array.isArray(v.migration_ids) && v.migration_ids.length > 0;
                const integrity  = isLegacy ? null
                  : isTampered       ? 'TAMPERED'
                  : v.integrity_hash ? 'OK'
                  : null;

                return (
                  <React.Fragment key={v.version}>
                    <tr style={isTampered ? { background: '#fff8e1' } : {}}>
                      <td style={{ ...TD, color: theme.textMuted, textAlign: 'center' }}>{i + 1}</td>
                      <td style={TD}><strong>{v.version}</strong></td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatDate(v.deployed_at)}</td>
                      <td style={TD}>{statusBadge(v)}</td>
                      <td style={TD}>{rollbackBadge(v.rollback_available)}</td>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        <button
                          onClick={() => toggleDrawer(v.version)}
                          style={{
                            background: 'none',
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4,
                            padding: '3px 10px',
                            cursor: 'pointer',
                            fontSize: 11,
                            color: theme.textMuted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isOpen ? '▼ Hide' : '▶ Details'}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${theme.border}` }}>
                          <div style={{ padding: '16px 20px', background: '#f8fafc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: hasMigs || v.notes ? 14 : 0 }}>
                              <DrawerField label="Backend SHA"  value={v.backend_commit}  mono />
                              <DrawerField label="Frontend SHA" value={v.frontend_commit} mono />
                              <DrawerField label="Bundle Hash"  value={v.bundle_hash}     mono />
                              <DrawerField label="Rollback Code" value={v.rollback_code}  mono />
                            </div>

                            {hasMigs && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ ...FIELD_LABEL, marginBottom: 6 }}>DB Migrations</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {v.migration_ids.map(id => (
                                    <span key={id} style={CODE}>{id}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {v.notes && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ ...FIELD_LABEL, marginBottom: 4 }}>Notes</div>
                                <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>{v.notes}</div>
                              </div>
                            )}

                            {!isLegacy && (
                              <div>
                                <div style={{ ...FIELD_LABEL, marginBottom: 4 }}>Integrity</div>
                                {integrity === 'TAMPERED'
                                  ? <span style={BADGE('#dc2626')}>TAMPERED — hash mismatch</span>
                                  : integrity === 'OK'
                                    ? <span style={BADGE('#059669')} title={v.integrity_hash}>OK</span>
                                    : <span style={BADGE('#6c757d')}>—</span>
                                }
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECTION 3: Recovery ───────────────────────────────────────────── */}
      <SectionDivider>Recovery</SectionDivider>

      {latest ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={CARD}>
            <div style={FIELD_LABEL}>Latest Backup Snapshot</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', marginTop: 8, color: theme.text, wordBreak: 'break-all' }}>
              {latest.backup_snapshot || '—'}
            </div>
          </div>

          <div style={CARD}>
            <div style={FIELD_LABEL}>Artifacts Present</div>
            {isLegacy
              ? <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: theme.textMuted }}>—</div>
              : latest.backup_manifest?.all_artifacts_present === true
                ? <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: '#059669' }}>YES</div>
                : <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: '#dc2626' }}>NO</div>
            }
          </div>

          <div style={CARD}>
            <div style={FIELD_LABEL}>Rollback Ready</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: latest.rollback_available ? '#059669' : '#dc2626' }}>
              {latest.rollback_available ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, color: theme.textMuted, fontSize: 13 }}>
          Rollback tracking activates after the first deploy.
        </div>
      )}

    </PageLayout>
  );
}

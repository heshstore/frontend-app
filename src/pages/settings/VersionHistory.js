import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';
import { apiFetch } from '../../utils/api';

// ── Static fallback (legacy records before DB-backed tracking was enabled) ────
// When the API returns entries, these are NOT shown — API is source of truth.
// When API is empty or unreachable, this array is displayed with a "legacy" banner.
const LEGACY_VERSIONS = [
  {
    version:        'v2026.06.11',
    deployed_at:    '2026-06-09T18:00:00.000Z',
    backend_commit:  '37cd501',
    frontend_commit: 'b203308',
    bundle_hash:     '1304c7ee',
    migration_ids:   ['DB-MIG-2026-06-09-AUDIENCE-MERGE'],
    backup_snapshot: 'pre-v2026.06.11',
    rollback_code:   'v2026.06.11',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'Promotional DB Master Contact Merge Engine — enrich-on-duplicate, source history, contact_strength, email POSSIBLE_DUPLICATE detection, 5000/upload limit',
  },
  {
    version:        'v2026.06.10',
    deployed_at:    '2026-06-09T16:45:00.000Z',
    backend_commit:  '37cd501',
    frontend_commit: 'b203308',
    bundle_hash:     '1304c7ee',
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.10',
    rollback_code:   'v2026.06.10',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'fix(promo-import): normalize + dedupe phones before bulk upsert',
  },
  {
    version:        'v2026.06.9',
    deployed_at:    '2026-06-09T16:00:00.000Z',
    backend_commit:  '37cd501',
    frontend_commit: 'b203308',
    bundle_hash:     '1304c7ee',
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.9',
    rollback_code:   'v2026.06.9',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'AI Campaign dashboard — per-telecaller activity, DB counts, accurate sent attribution',
  },
  {
    version:        'v2026.06.8',
    deployed_at:    '2026-06-09T13:30:00.000Z',
    backend_commit:  '37cd501',
    frontend_commit: 'b203308',
    bundle_hash:     '1304c7ee',
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.8',
    rollback_code:   'v2026.06.8',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'Prior release — rollback point before AI dashboard audit fixes',
  },
  {
    version:        'v2026.06.7',
    deployed_at:    '2026-06-09T12:05:00.000Z',
    backend_commit:  'dbf4764',
    frontend_commit: 'b203308',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.7',
    rollback_code:   'v2026.06.7',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'fix(phone-link): clear partial session dir before reinit',
  },
  {
    version:        'v2026.06.6',
    deployed_at:    '2026-06-09T11:35:00.000Z',
    backend_commit:  'dbf4764',
    frontend_commit: 'b203308',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.6',
    rollback_code:   'v2026.06.6',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'fix(phone-link): reinitialize client with pairWithPhoneNumber option',
  },
  {
    version:        'v2026.06.5',
    deployed_at:    '2026-06-09T10:59:00.000Z',
    backend_commit:  'dbf4764',
    frontend_commit: 'b203308',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.5',
    rollback_code:   'v2026.06.5',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'fix(phone-link): require awaiting_scan state, 11-digit validation, pre-flight diagnostics',
  },
  {
    version:        'v2026.06.4',
    deployed_at:    '2026-06-08T17:49:00.000Z',
    backend_commit:  'dbf4764',
    frontend_commit: 'b203308',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.4',
    rollback_code:   'v2026.06.4',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'fix(inbox): LATERAL JOIN dedup — eliminate duplicate conversations from SQL fan-out',
  },
  {
    version:        'v2026.06.3',
    deployed_at:    '2026-06-08T00:00:00.000Z',
    backend_commit:  '',
    frontend_commit: '',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.3',
    rollback_code:   'v2026.06.3',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'Fix: inbox duplicate conversations — LATERAL JOIN with LIMIT 1',
  },
  {
    version:        'v2026.06.2',
    deployed_at:    '2026-06-08T14:59:00.000Z',
    backend_commit:  'dbf4764',
    frontend_commit: 'b203308',
    bundle_hash:     null,
    migration_ids:   [],
    backup_snapshot: 'pre-v2026.06.2',
    rollback_code:   'v2026.06.2',
    rollback_available: false,
    deployment_status:  'RELEASED',
    notes: 'Autonomous campaign capacity — warmup-only limits, deploy script added',
  },
  {
    version:        'v2026.06.1',
    deployed_at:    '2026-06-06T14:15:00.000Z',
    backend_commit:  '172b850',
    frontend_commit: '758c7fd',
    bundle_hash:     null,
    migration_ids:   ['DB-MIG-2026-06-06-A'],
    backup_snapshot: 'pre-v2026.06.1',
    rollback_code:   'v2026.06.1',
    rollback_available: true,
    deployment_status:  'RELEASED',
    notes: 'Pre-live stabilization — audience entity overhaul, phone nullable, number-limits, ai-dashboard',
  },
];

// ── Phase 6: Tamper detection ─────────────────────────────────────────────────
// Replicates DeploymentVersionsService.computeHash — same field order, same delimiter.
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
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

async function detectTampering(versions) {
  const tampered = new Set();
  await Promise.all(
    versions.map(async (v) => {
      if (!v.integrity_hash) return;
      const recomputed = await computeIntegrityHash(v);
      if (recomputed && recomputed !== v.integrity_hash) {
        tampered.add(v.version);
      }
    }),
  );
  return tampered;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const TH    = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, borderBottom: `2px solid ${theme.border}`, whiteSpace: 'nowrap' };
const TD    = { padding: '10px 12px', fontSize: 12, color: theme.text, borderBottom: `1px solid ${theme.border}`, verticalAlign: 'top' };
const CODE  = { fontFamily: 'monospace', background: '#f1f3f5', padding: '2px 6px', borderRadius: 3, fontSize: 11 };
const BADGE = (bg, color = '#fff') => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color });

function recoverableBadge(v) {
  if (v.rollback_available === true)  return <span style={BADGE(theme.success)} title="Git tag + backup artifacts verified">YES</span>;
  if (v.rollback_available === false) return <span style={BADGE(theme.danger)}  title="No git tag or backup artifacts">NO</span>;
  return <span style={BADGE(theme.textMuted)}>—</span>;
}

function migrationCell(v) {
  const ids = Array.isArray(v.migration_ids) ? v.migration_ids : [];
  if (ids.length === 0) return <span style={BADGE(theme.textMuted)}>NO DB CHANGE</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ids.map((id) => (
        <span key={id} style={{ ...BADGE(theme.success), fontFamily: 'monospace', fontSize: 10 }}>{id}</span>
      ))}
    </div>
  );
}

function statusBadge(v) {
  const s = (v.deployment_status || '').toUpperCase();
  const n = (v.notes || '').toLowerCase();
  if (s === 'FAILED')   return <span style={BADGE(theme.danger)}>FAILED</span>;
  if (s === 'ROLLBACK') return <span style={BADGE('#fd7e14')}>ROLLBACK</span>;
  if (n.includes('live') && !n.includes('pre')) return <span style={BADGE(theme.success)}>LIVE</span>;
  if (n.includes('pre-live') || n.includes('stable')) return <span style={BADGE('#6c757d')}>PRE-LIVE</span>;
  return <span style={BADGE('#0d6efd')}>RELEASE</span>;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(',', '');
  } catch { return iso; }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VersionHistory() {
  const [versions,    setVersions]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [isLegacy,    setIsLegacy]    = useState(false);
  const [apiError,    setApiError]    = useState(null);
  const [tampered,    setTampered]    = useState(new Set());

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
          // API returned empty — show legacy static data
          setVersions(LEGACY_VERSIONS);
          setIsLegacy(true);
        }
      } catch (err) {
        if (cancelled) return;
        setApiError(err.message || 'Failed to load version history');
        setVersions(LEGACY_VERSIONS);
        setIsLegacy(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const hasTamper = tampered.size > 0;

  return (
    <PageLayout
      title="Version History"
      subtitle="Deployment log — recoverable flag indicates real rollback capability"
      hideBack
    >
      {/* Phase 6: global tamper warning */}
      {hasTamper && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 6,
          background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', fontSize: 13,
        }}>
          <strong>⚠ Integrity Warning</strong> — {tampered.size} deployment record(s) have a hash
          mismatch. The DB rows may have been modified after registration:&nbsp;
          {[...tampered].join(', ')}
        </div>
      )}

      {/* Legacy data banner */}
      {isLegacy && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 6,
          background: '#e9ecef', border: '1px solid #dee2e6', color: '#495057', fontSize: 12,
        }}>
          {apiError
            ? `API unavailable (${apiError}) — showing local static history.`
            : 'No deployments registered in DB yet — showing legacy static history. Data becomes live after the next deploy.sh run.'}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: theme.textMuted }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}` }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 36 }}>#</th>
                <th style={TH}>Version</th>
                <th style={{ ...TH, whiteSpace: 'nowrap' }}>Date / Time (IST)</th>
                <th style={TH}>Backend</th>
                <th style={TH}>Frontend</th>
                <th style={TH}>Bundle</th>
                <th style={TH}>Rollback Ready</th>
                <th style={TH}>DB Migrations</th>
                <th style={TH}>Backup Snapshot</th>
                <th style={TH}>Rollback Code</th>
                <th style={TH}>Status</th>
                <th style={TH}>Notes</th>
                {!isLegacy && <th style={TH}>Integrity</th>}
              </tr>
            </thead>
            <tbody>
              {versions.map((v, i) => {
                const isTampered = tampered.has(v.version);
                return (
                  <tr key={v.version} style={isTampered ? { background: '#fff8e1' } : {}}>
                    <td style={{ ...TD, color: theme.textMuted, textAlign: 'center' }}>{i + 1}</td>
                    <td style={TD}><strong>{v.version}</strong></td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatDate(v.deployed_at)}</td>
                    <td style={TD}><span style={CODE}>{v.backend_commit || '—'}</span></td>
                    <td style={TD}><span style={CODE}>{v.frontend_commit || '—'}</span></td>
                    <td style={TD}><span style={CODE}>{v.bundle_hash || '—'}</span></td>
                    <td style={TD}>{recoverableBadge(v)}</td>
                    <td style={TD}>{migrationCell(v)}</td>
                    <td style={TD}><span style={CODE}>{v.backup_snapshot || '—'}</span></td>
                    <td style={TD}><span style={CODE}>{v.rollback_code || '—'}</span></td>
                    <td style={TD}>{statusBadge(v)}</td>
                    <td style={{ ...TD, maxWidth: 280 }}>{v.notes || '—'}</td>
                    {!isLegacy && (
                      <td style={TD}>
                        {isTampered
                          ? <span style={BADGE(theme.danger)} title="integrity_hash mismatch">TAMPERED</span>
                          : v.integrity_hash
                            ? <span style={BADGE(theme.success)} title={v.integrity_hash.substring(0, 16) + '...'}>OK</span>
                            : <span style={BADGE(theme.textMuted)}>—</span>
                        }
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}

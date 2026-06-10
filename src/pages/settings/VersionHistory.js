import React from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';

// To add a new version: prepend an entry to this array. Newest first.
//
// RULES:
// 1. dbMigrations is CUMULATIVE — carry forward all previous IDs and append new ones.
//    No schema change this release? Use dbMigrations: [] — renders "NO DB CHANGE".
// 2. backupSnapshot and rollback.dbBranch are REQUIRED for EVERY release, even with
//    no schema change. Every deployment must have a named rollback point.
// 3. rollback.codeTag matches the git tag for this release.
// 4. recoverable: true ONLY when git tag + backup snapshot + unique SHAs all exist.
//    recoverable: false — documented release, not a rollback contract.
// 5. deploy.sh validates: version, backendCommit, frontendCommit, frontendBundleHash, recoverable.
const VERSIONS = [
  {
    version:        'v2026.06.11',
    dateTime:       '2026-06-09 23:30 IST',
    backendCommit:  '37cd501',
    frontendCommit: 'b203308',
    frontendBundleHash: '1304c7ee',
    dbMigrations:   ['DB-MIG-2026-06-09-AUDIENCE-MERGE'],
    backupSnapshot: 'pre-v2026.06.11',
    recoverable:    false,
    recoveryNote:   'Manual rsync deploy — no git tag, no VPS backup. Code includes uncommitted merge-engine changes not at SHA 37cd501.',
    rollback: {
      codeTag:  'v2026.06.11',
      dbBranch: 'pre-v2026.06.11',
    },
    statusNotes: 'Promotional DB Master Contact Merge Engine — enrich-on-duplicate, source history, contact_strength, email POSSIBLE_DUPLICATE detection, 5000/upload limit',
  },
  {
    version:        'v2026.06.10',
    dateTime:       '2026-06-09 22:15 IST',
    backendCommit:  '37cd501',
    frontendCommit: 'b203308',
    frontendBundleHash: '1304c7ee',
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.10',
    recoverable:    false,
    recoveryNote:   'Manual rsync — no git tag, no backup. Same claimed SHA as v2026.06.11; not independently recoverable.',
    rollback: {
      codeTag:  'v2026.06.10',
      dbBranch: 'pre-v2026.06.10',
    },
    statusNotes: 'fix(promo-import): normalize + dedupe phones before bulk upsert — prevents ON CONFLICT DO UPDATE cannot affect row a second time',
  },
  {
    version:        'v2026.06.9',
    dateTime:       '2026-06-09 21:30 IST',
    backendCommit:  '37cd501',
    frontendCommit: 'b203308',
    frontendBundleHash: '1304c7ee',
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.9',
    recoverable:    false,
    recoveryNote:   'Manual rsync — no git tag, no backup. AI dashboard fixes deployed as uncommitted changes.',
    rollback: {
      codeTag:  'v2026.06.9',
      dbBranch: 'pre-v2026.06.9',
    },
    statusNotes: 'AI Campaign dashboard — per-telecaller activity, DB counts, accurate sent attribution (actual_sender_number_id), promo import 15mb body limit + batching',
  },
  {
    version:        'v2026.06.8',
    dateTime:       '2026-06-09 19:00 IST',
    backendCommit:  '37cd501',
    frontendCommit: 'b203308',
    frontendBundleHash: '1304c7ee',
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.8',
    recoverable:    false,
    recoveryNote:   'Manual rsync — no git tag, no backup. Pre-dashboard-audit baseline not recoverable.',
    rollback: {
      codeTag:  'v2026.06.8',
      dbBranch: 'pre-v2026.06.8',
    },
    statusNotes: 'Prior release — rollback point before AI dashboard audit fixes',
  },
  {
    version:        'v2026.06.7',
    dateTime:       '2026-06-09 17:35 IST',
    backendCommit:  'dbf4764',
    frontendCommit: 'b203308',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.7',
    recoverable:    false,
    recoveryNote:   'Git tag v2026.06.7 exists (dbf4764) but VPS backup snapshot missing on disk.',
    rollback: {
      codeTag:  'v2026.06.7',
      dbBranch: 'pre-v2026.06.7',
    },
    statusNotes: 'fix(phone-link): clear partial session dir before reinit — LevelDB-only profile caused requestPairingCode() to hang silently; fix state regression via idle transition; clear qrDataUrl in destroyClient',
  },
  {
    version:        'v2026.06.6',
    dateTime:       '2026-06-09 17:05 IST',
    backendCommit:  'dbf4764',
    frontendCommit: 'b203308',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.6',
    recoverable:    false,
    recoveryNote:   'Git tag exists; no VPS backup snapshot.',
    rollback: {
      codeTag:  'v2026.06.6',
      dbBranch: 'pre-v2026.06.6',
    },
    statusNotes: 'fix(phone-link): reinitialize client with pairWithPhoneNumber option — WA Web 2.3000+ rejects external requestPairingCode on QR-mode pages',
  },
  {
    version:        'v2026.06.5',
    dateTime:       '2026-06-09 16:29 IST',
    backendCommit:  'dbf4764',
    frontendCommit: 'b203308',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.5',
    recoverable:    false,
    recoveryNote:   'Git tag exists; no VPS backup snapshot.',
    rollback: {
      codeTag:  'v2026.06.5',
      dbBranch: 'pre-v2026.06.5',
    },
    statusNotes: 'fix(phone-link): require awaiting_scan state, 11-digit country-code validation, pre-flight diagnostics, full error logging',
  },
  {
    version:        'v2026.06.4',
    dateTime:       '2026-06-08 23:19 IST',
    backendCommit:  'dbf4764',
    frontendCommit: 'b203308',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.4',
    recoverable:    false,
    recoveryNote:   'Git tag exists; no VPS backup snapshot.',
    rollback: {
      codeTag:  'v2026.06.4',
      dbBranch: 'pre-v2026.06.4',
    },
    statusNotes: 'fix(inbox): LATERAL JOIN dedup — eliminate duplicate conversations from SQL fan-out',
  },
  {
    version:        'v2026.06.3',
    dateTime:       '2026-06-08 IST',
    backendCommit:  '',
    frontendCommit: '',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.3',
    recoverable:    false,
    recoveryNote:   'No commit SHAs recorded; no backup on VPS.',
    rollback: {
      codeTag:  'v2026.06.3',
      dbBranch: 'pre-v2026.06.3',
    },
    statusNotes: 'Fix: inbox duplicate conversations — LATERAL JOIN with LIMIT 1 on customer + marketing_audience lookups prevents fan-out when multiple DB records match the same phone',
  },
  {
    version:        'v2026.06.2',
    dateTime:       '2026-06-08 20:29 IST',
    backendCommit:  'dbf4764',
    frontendCommit: 'b203308',
    frontendBundleHash: null,
    dbMigrations:   [],
    backupSnapshot: 'pre-v2026.06.2',
    recoverable:    false,
    recoveryNote:   'Git tag exists; deploy.sh referenced but never committed; no VPS backup.',
    rollback: {
      codeTag:  'v2026.06.2',
      dbBranch: 'pre-v2026.06.2',
    },
    statusNotes: 'Autonomous campaign capacity — warmup-only limits (L1=20 L2=50 L3=100 L4=150), removed MAX_DAILY_AUDIENCE / PILOT_LIMITS / AUTONOMOUS_DAILY_LIMIT, deploy script added',
  },
  {
    version:        'v2026.06.1',
    dateTime:       '2026-06-06 19:45 IST',
    backendCommit:  '172b850',
    frontendCommit: '758c7fd',
    frontendBundleHash: null,
    dbMigrations:   ['DB-MIG-2026-06-06-A'],
    backupSnapshot: 'pre-v2026.06.1',
    recoverable:    true,
    recoveryNote:   'Git tags + VPS backup (schema-snapshot.sql, marketing-backup.sql) verified on disk.',
    rollback: {
      codeTag: 'v2026.06.1',
      dbBranch: 'pre-v2026.06.1',
    },
    statusNotes: 'Pre-live stabilization — audience entity overhaul, phone nullable, number-limits, ai-dashboard, sender/queue hardening, pilot monitoring refinements',
  },
];

const TH    = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, borderBottom: `2px solid ${theme.border}`, whiteSpace: 'nowrap' };
const TD    = { padding: '10px 12px', fontSize: 12, color: theme.text, borderBottom: `1px solid ${theme.border}`, verticalAlign: 'top' };
const CODE  = { fontFamily: 'monospace', background: '#f1f3f5', padding: '2px 6px', borderRadius: 3, fontSize: 11 };
const BADGE = (bg, color = '#fff') => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color });

function resolveMigrations(v) {
  if (Array.isArray(v.dbMigrations)) return v.dbMigrations;
  if (typeof v.dbMigration === 'string' && v.dbMigration && v.dbMigration !== 'NO') return [v.dbMigration];
  return [];
}

function dbMigrationCell(v) {
  const ids = resolveMigrations(v);
  if (ids.length === 0) return <span style={BADGE(theme.textMuted)}>NO DB CHANGE</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ids.map((id) => (
        <span key={id} style={{ ...BADGE(theme.success), fontFamily: 'monospace', fontSize: 10 }}>{id}</span>
      ))}
    </div>
  );
}

function recoverableBadge(v) {
  if (v.recoverable === true)  return <span style={BADGE(theme.success)} title={v.recoveryNote || ''}>YES</span>;
  if (v.recoverable === false) return <span style={BADGE(theme.danger)} title={v.recoveryNote || ''}>NO</span>;
  return <span style={BADGE(theme.textMuted)}>—</span>;
}

function statusBadge(notes) {
  const n = notes.toLowerCase();
  if (n.includes('live') && !n.includes('pre'))       return <span style={BADGE(theme.success)}>LIVE</span>;
  if (n.includes('pre-live') || n.includes('stable')) return <span style={BADGE('#6c757d')}>PRE-LIVE</span>;
  if (n.includes('rollback'))                         return <span style={BADGE(theme.danger)}>ROLLBACK</span>;
  return <span style={BADGE('#0d6efd')}>RELEASE</span>;
}

export default function VersionHistory() {
  return (
    <PageLayout title="Version History" subtitle="Deployment log — recoverable flag indicates real rollback capability" hideBack>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}` }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 36 }}>#</th>
              <th style={TH}>Version</th>
              <th style={TH}>Date / Time</th>
              <th style={TH}>Backend</th>
              <th style={TH}>Frontend</th>
              <th style={TH}>Bundle</th>
              <th style={TH}>Recoverable</th>
              <th style={TH}>DB Migrations</th>
              <th style={TH}>Backup Snapshot</th>
              <th style={TH}>Rollback Code</th>
              <th style={TH}>Status</th>
              <th style={TH}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {VERSIONS.map((v, i) => (
              <tr key={v.version}>
                <td style={{ ...TD, color: theme.textMuted, textAlign: 'center' }}>{i + 1}</td>
                <td style={TD}><strong>{v.version}</strong></td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{v.dateTime}</td>
                <td style={TD}><span style={CODE}>{v.backendCommit || '—'}</span></td>
                <td style={TD}><span style={CODE}>{v.frontendCommit || '—'}</span></td>
                <td style={TD}><span style={CODE}>{v.frontendBundleHash || '—'}</span></td>
                <td style={TD}>{recoverableBadge(v)}</td>
                <td style={TD}>{dbMigrationCell(v)}</td>
                <td style={TD}><span style={CODE}>{v.backupSnapshot || '—'}</span></td>
                <td style={TD}><span style={CODE}>{v.rollback?.codeTag || v.rollbackTag || '—'}</span></td>
                <td style={TD}>{statusBadge(v.statusNotes)}</td>
                <td style={{ ...TD, maxWidth: 280 }} title={v.recoveryNote || ''}>{v.statusNotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}

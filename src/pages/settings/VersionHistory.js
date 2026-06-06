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
const VERSIONS = [
  {
    version:        'v2026.06.1',
    dateTime:       '2026-06-06 19:45 IST',
    backendCommit:  'fd74ee3',
    frontendCommit: '3104125',
    dbMigrations:   ['DB-MIG-2026-06-06-A'],
    backupSnapshot: 'pre-v2026.06.1',
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

// Resolves both old string field and new array field — backwards compatible.
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

function statusBadge(notes) {
  const n = notes.toLowerCase();
  if (n.includes('live') && !n.includes('pre'))       return <span style={BADGE(theme.success)}>LIVE</span>;
  if (n.includes('pre-live') || n.includes('stable')) return <span style={BADGE('#6c757d')}>PRE-LIVE</span>;
  if (n.includes('rollback'))                         return <span style={BADGE(theme.danger)}>ROLLBACK</span>;
  return <span style={BADGE('#0d6efd')}>RELEASE</span>;
}

export default function VersionHistory() {
  return (
    <PageLayout title="Version History" subtitle="Read-only deployment log" hideBack>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: theme.borderRadius, border: `1px solid ${theme.border}` }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: 36 }}>#</th>
              <th style={TH}>Version</th>
              <th style={TH}>Date / Time</th>
              <th style={TH}>Backend</th>
              <th style={TH}>Frontend</th>
              <th style={TH}>DB Migrations</th>
              <th style={TH}>Backup Snapshot</th>
              <th style={TH}>Rollback Code</th>
              <th style={TH}>Rollback DB</th>
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
                <td style={TD}><span style={CODE}>{v.backendCommit}</span></td>
                <td style={TD}><span style={CODE}>{v.frontendCommit}</span></td>
                <td style={TD}>{dbMigrationCell(v)}</td>
                <td style={TD}><span style={CODE}>{v.backupSnapshot || '—'}</span></td>
                <td style={TD}><span style={CODE}>{v.rollback?.codeTag || v.rollbackTag || '—'}</span></td>
                <td style={TD}><span style={CODE}>{v.rollback?.dbBranch || '—'}</span></td>
                <td style={TD}>{statusBadge(v.statusNotes)}</td>
                <td style={{ ...TD, maxWidth: 280 }}>{v.statusNotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}

import React from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';

// To add a new version: prepend an entry to this array. Newest first.
const VERSIONS = [
  {
    version:         'v2026.06.1',
    dateTime:        '2026-06-06 19:45 IST',
    backendCommit:   '172b850',
    frontendCommit:  '758c7fd',
    statusNotes:     'Pre-live stabilization — audience entity overhaul, phone nullable, number-limits, ai-dashboard, sender/queue hardening, pilot monitoring refinements',
    rollbackTag:     'v2026.06.1',
  },
];

const TH = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, borderBottom: `2px solid ${theme.border}`, whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', fontSize: 12, color: theme.text, borderBottom: `1px solid ${theme.border}`, verticalAlign: 'top' };
const CODE = { fontFamily: 'monospace', background: '#f1f3f5', padding: '2px 6px', borderRadius: 3, fontSize: 11 };
const BADGE = (bg, color = '#fff') => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color });

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
              <th style={TH}>Version</th>
              <th style={TH}>Date / Time</th>
              <th style={TH}>Backend</th>
              <th style={TH}>Frontend</th>
              <th style={TH}>Status</th>
              <th style={TH}>Notes</th>
              <th style={TH}>Rollback Tag</th>
            </tr>
          </thead>
          <tbody>
            {VERSIONS.map((v) => (
              <tr key={v.version}>
                <td style={TD}><strong>{v.version}</strong></td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{v.dateTime}</td>
                <td style={TD}><span style={CODE}>{v.backendCommit}</span></td>
                <td style={TD}><span style={CODE}>{v.frontendCommit}</span></td>
                <td style={TD}>{statusBadge(v.statusNotes)}</td>
                <td style={{ ...TD, maxWidth: 340 }}>{v.statusNotes}</td>
                <td style={TD}><span style={CODE}>{v.rollbackTag}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}

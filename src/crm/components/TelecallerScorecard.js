import React, { useMemo } from 'react';
import { computeQueueScorecard } from '../crmCockpit';

function Chip({ label, value, warn }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 5,
        background: warn ? '#fef2f2' : '#f1f5f9',
        color: warn ? '#b91c1c' : '#475569',
        border: `1px solid ${warn ? '#fecaca' : '#e2e8f0'}`,
      }}
    >
      {label}: <strong>{value}</strong>
    </span>
  );
}

export default function TelecallerScorecard({ items, userId }) {
  const stats = useMemo(() => computeQueueScorecard(items, userId), [items, userId]);
  if (!items?.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
        padding: '8px 10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', alignSelf: 'center', marginRight: 4 }}>
        MY QUEUE
      </span>
      <Chip label="SLA OK" value={`${stats.slaPct}%`} warn={stats.slaPct < 80} />
      <Chip label="Stale" value={stats.stale} warn={stats.stale > 0} />
      <Chip label="Callback abuse" value={stats.callbackAbuse} warn={stats.callbackAbuse > 0} />
      <Chip label="In quote stage" value={`${stats.quotePct}%`} />
      {stats.avgResponseH != null && (
        <Chip label="Avg lead age" value={`${stats.avgResponseH}h`} />
      )}
    </div>
  );
}

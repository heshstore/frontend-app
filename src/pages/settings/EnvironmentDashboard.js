import React, { useEffect, useState } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { theme } from '../../theme';
import { apiFetch } from '../../utils/api';

const CARD = {
  background: '#fff',
  border: `1px solid ${theme.border}`,
  borderRadius: theme.borderRadius,
  padding: 20,
};

const LABEL = { fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' };
const VALUE = { fontSize: 22, fontWeight: 800, marginTop: 4 };

function envColor(env) {
  if (env === 'PRODUCTION') return '#dc2626';
  if (env === 'LOCAL') return '#059669';
  if (env === 'TEST') return '#d97706';
  return '#6b7280';
}

export default function EnvironmentDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/health/environment');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Failed to load environment');
        setData(json);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <PageLayout title="Environment" subtitle="Database isolation and record counts" hideBack>
      {err && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#b91c1c' }}>
          {err}
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={CARD}>
            <div style={LABEL}>Environment</div>
            <div style={{ ...VALUE, color: envColor(data.environment) }}>{data.environment}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>NODE_ENV: {data.node_env}</div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Database</div>
            <div style={{ ...VALUE, color: data.database_status === 'CONNECTED' ? '#059669' : '#dc2626' }}>
              {data.database_status}
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{data.database_name} @ {data.database_host}</div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Customer Contacts</div>
            <div style={{ ...VALUE, color: '#1d4ed8' }}>{data.customer_db_count ?? '—'}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>records</div>
          </div>

          <div style={CARD}>
            <div style={LABEL}>Promotional Contacts</div>
            <div style={{ ...VALUE, color: '#7c3aed' }}>{data.promotional_db_count ?? '—'}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>records</div>
          </div>
        </div>
      )}

      {data && (
        <div style={{ ...CARD, marginTop: 16 }}>
          <div style={LABEL}>Import protection</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>{data.import_protection}</div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 10, fontFamily: 'monospace' }}>
            Active: {data.database_url_redacted}
          </div>
        </div>
      )}

      {data?.audit && (
        <div style={{ ...CARD, marginTop: 16 }}>
          <div style={LABEL}>Isolation audit</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Status</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: data.audit.isolation_status === 'PASS' ? '#059669' : data.audit.isolation_status === 'WARN' ? '#d97706' : '#dc2626' }}>
                {data.audit.isolation_status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Overwrite risk</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: data.audit.overwrite_risk === 'LOW' ? '#059669' : data.audit.overwrite_risk === 'MEDIUM' ? '#d97706' : '#dc2626' }}>
                {data.audit.overwrite_risk}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, marginTop: 12 }}>{data.audit.overwrite_risk_reason}</div>
          <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6 }}>
            <div><strong>Local DB:</strong> <span style={{ fontFamily: 'monospace' }}>{data.audit.local_database_redacted || '—'}</span></div>
            <div><strong>Production DB:</strong> <span style={{ fontFamily: 'monospace' }}>{data.audit.production_database_redacted || '—'}</span></div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

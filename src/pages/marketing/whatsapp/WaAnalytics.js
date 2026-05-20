import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

const btn = (bg, color = '#fff') => ({
  background: bg,
  color,
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const sectionCard = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 8,
  padding: '18px 20px',
  marginBottom: 20,
};

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    active: { bg: '#dcfce7', color: '#166534' },
    inactive: { bg: '#f3f4f6', color: '#6b7280' },
    draft: { bg: '#fef9c3', color: '#854d0e' },
    completed: { bg: '#dbeafe', color: '#1d4ed8' },
    paused: { bg: '#fef9c3', color: '#854d0e' },
    running: { bg: '#dcfce7', color: '#166534' },
  };
  const c = map[s] || { bg: '#e2e8f0', color: '#374151' };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      {status || '—'}
    </span>
  );
}

// CSS percentage bar
function PercentBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ color: '#6c757d', fontSize: 12 }}>
          {count.toLocaleString()} &nbsp;
          <span style={{ fontWeight: 700, color }}>{pct}%</span>
        </span>
      </div>
      <div
        style={{
          height: 10,
          background: '#f1f5f9',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 99,
            transition: 'width 0.4s ease',
            minWidth: pct > 0 ? 4 : 0,
          }}
        />
      </div>
    </div>
  );
}

// Inline campaign stats panel
function CampaignStats({ campaignId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(`/marketing/whatsapp-engine/analytics/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((d) => { if (!cancelled) { setStats(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e?.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) return <div style={{ padding: '10px 0', fontSize: 12, color: '#6c757d' }}>Loading campaign stats…</div>;
  if (error) return <div style={{ padding: '10px 0', fontSize: 12, color: '#dc3545' }}>Error: {error}</div>;
  if (!stats) return null;

  const total = stats.total || stats.sent || 1;
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '12px 14px',
        marginTop: 10,
      }}
    >
      <PercentBar label="Sent" count={stats.sent || 0} total={total} color="#1d4ed8" />
      <PercentBar label="Delivered" count={stats.delivered || 0} total={total} color="#0f766e" />
      <PercentBar label="Read" count={stats.read || 0} total={total} color="#6d28d9" />
      <PercentBar label="Replied" count={stats.replied || 0} total={total} color="#166534" />
      <PercentBar label="Failed" count={stats.failed || 0} total={total} color="#991b1b" />
    </div>
  );
}

export default function WaAnalytics() {
  const [overallStats, setOverallStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tplRes, campRes] = await Promise.all([
        apiFetch('/marketing/whatsapp-engine/analytics/dashboard'),
        apiFetch('/marketing/whatsapp-engine/templates'),
        apiFetch('/marketing/whatsapp-engine/campaigns'),
      ]);

      if (!statsRes.ok) throw new Error(`Stats error ${statsRes.status}`);
      if (!tplRes.ok) throw new Error(`Templates error ${tplRes.status}`);
      if (!campRes.ok) throw new Error(`Campaigns error ${campRes.status}`);

      const [statsData, tplData, campData] = await Promise.all([
        statsRes.json(),
        tplRes.json(),
        campRes.json(),
      ]);

      setOverallStats(statsData);
      setTemplates(Array.isArray(tplData) ? tplData : []);
      setCampaigns(Array.isArray(campData) ? campData : []);
    } catch (e) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCampaign = (id) => {
    setExpandedCampaign((prev) => (prev === id ? null : id));
  };

  return (
    <PageLayout
      title="WhatsApp Analytics"
      subtitle="Delivery rates, templates, and campaign performance"
      actions={
        <button style={btn('#0d6efd')} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      }
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 16,
              color: '#dc3545',
            }}
          >
            {error}{' '}
            <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>
              Retry
            </button>
          </div>
        )}

        {/* Overall Delivery Stats */}
        <div style={sectionCard}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Overall Delivery Stats
          </div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading stats…</div>
          ) : overallStats ? (
            (() => {
              const total = overallStats.total || overallStats.sent || 1;
              return (
                <>
                  <PercentBar label="Sent" count={overallStats.sent || 0} total={total} color="#1d4ed8" />
                  <PercentBar label="Delivered" count={overallStats.delivered || 0} total={total} color="#0f766e" />
                  <PercentBar label="Read" count={overallStats.read || 0} total={total} color="#6d28d9" />
                  <PercentBar label="Replied" count={overallStats.replied || 0} total={total} color="#166534" />
                  <PercentBar label="Failed" count={overallStats.failed || 0} total={total} color="#991b1b" />
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    Total tracked: {(overallStats.total || 0).toLocaleString()} messages
                  </div>
                </>
              );
            })()
          ) : (
            <div style={{ color: '#6c757d', fontSize: 13 }}>No stats available</div>
          )}
        </div>

        {/* Templates */}
        <div style={sectionCard}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            Templates ({templates.length})
          </div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading templates…</div>
          ) : templates.length === 0 ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>No templates found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map((tpl, i) => (
                <div
                  key={tpl.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                      {tpl.name || tpl.template_name || `Template ${tpl.id}`}
                    </div>
                    {tpl.category && (
                      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                        {tpl.category}
                        {tpl.language && ` · ${tpl.language}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {tpl.status && statusBadge(tpl.status)}
                    <span
                      style={{
                        background: tpl.is_active !== false ? '#dcfce7' : '#f3f4f6',
                        color: tpl.is_active !== false ? '#166534' : '#6b7280',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {tpl.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div style={sectionCard}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            Campaigns ({campaigns.length})
          </div>
          {loading ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>Loading campaigns…</div>
          ) : campaigns.length === 0 ? (
            <div style={{ color: '#6c757d', fontSize: 13 }}>No campaigns found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaigns.map((camp, i) => (
                <div
                  key={camp.id || i}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* Campaign header row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: expandedCampaign === camp.id ? '#eff6ff' : '#f8fafc',
                      flexWrap: 'wrap',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                    onClick={() => camp.id && toggleCampaign(camp.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                        {camp.name || camp.campaign_name || `Campaign ${camp.id}`}
                      </div>
                      {(camp.created_at || camp.scheduled_at) && (
                        <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                          {camp.created_at
                            ? new Date(camp.created_at).toLocaleDateString()
                            : new Date(camp.scheduled_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {statusBadge(camp.status)}
                      {camp.id && (
                        <button
                          style={btn(expandedCampaign === camp.id ? '#0d6efd' : '#f3f4f6', expandedCampaign === camp.id ? '#fff' : '#374151')}
                          onClick={(e) => { e.stopPropagation(); toggleCampaign(camp.id); }}
                        >
                          {expandedCampaign === camp.id ? '▲ Hide Stats' : '▼ View Stats'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline campaign stats */}
                  {expandedCampaign === camp.id && camp.id && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <CampaignStats campaignId={camp.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

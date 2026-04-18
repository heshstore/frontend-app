import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

const STATUS_COLORS = {
  NEW: '#ffc107',
  CONTACTED: '#0d6efd',
  INTERESTED: '#198754',
  QUOTATION: '#6f42c1',
  CONVERTED: '#198754',
  LOST: '#dc3545',
};

const URGENCY_COLORS = {
  HIGH: '#dc3545',
  MEDIUM: '#ffc107',
  LOW: '#6c757d',
};

const SOURCE_LABELS = {
  INDIAMART: 'IndiaMart',
  META_ADS: 'Meta Ads',
  GOOGLE_ADS: 'Google Ads',
  SHOPIFY: 'Shopify',
  WHATSAPP: 'WhatsApp',
  DIRECT_CALL: 'Direct Call',
  MANUAL: 'Manual',
};

function ScoreDial({ score }) {
  const color = score >= 70 ? '#198754' : score >= 40 ? '#ffc107' : '#dc3545';
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
        color,
        flexShrink: 0,
      }}
    >
      {score}
    </div>
  );
}

function HotTimer({ ageHours }) {
  if (ageHours > 24) return null;
  const isHot = ageHours < 1;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 10,
        background: isHot ? '#dc3545' : '#ffc107',
        color: isHot ? '#fff' : '#212529',
      }}
    >
      {isHot ? `🔥 ${Math.round(ageHours * 60)}m ago` : `${Math.round(ageHours)}h ago`}
    </span>
  );
}

function LeadCard({ item, onOpen }) {
  const { lead, score, nextAction, isOverdue, ageHours } = item;
  const urgencyColor = URGENCY_COLORS[nextAction?.urgency] || theme.textMuted;

  return (
    <div
      onClick={() => onOpen(lead.id)}
      style={{
        background: '#fff',
        border: `1px solid ${isOverdue ? '#dc3545' : theme.border}`,
        borderLeft: `4px solid ${urgencyColor}`,
        borderRadius: 10,
        padding: '14px 14px 12px',
        marginBottom: 10,
        cursor: 'pointer',
        boxShadow: isOverdue ? '0 2px 8px rgba(220,53,69,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Row 1: name + score + hot timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <ScoreDial score={score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lead.name}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            {lead.phone} · {SOURCE_LABELS[lead.source] || lead.source}
          </div>
        </div>
        <HotTimer ageHours={ageHours} />
      </div>

      {/* Row 2: status + action label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 8,
            background: STATUS_COLORS[lead.status] || '#6c757d',
            color: '#fff',
            textTransform: 'uppercase',
          }}
        >
          {lead.status}
        </span>
        {nextAction && (
          <span style={{ fontSize: 12, color: urgencyColor, fontWeight: 600 }}>
            → {nextAction.label}
          </span>
        )}
        {isOverdue && (
          <span style={{ fontSize: 10, color: '#dc3545', fontWeight: 700 }}>OVERDUE</span>
        )}
      </div>

      {/* Row 3: product interest */}
      {lead.product_interest && (
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lead.product_interest}
        </div>
      )}

      {/* CTA button */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(lead.id); }}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '10px',
          background: urgencyColor === '#dc3545' ? '#dc3545' : theme.primary,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        {nextAction?.buttonText || 'Open Lead'}
      </button>
    </div>
  );
}

export default function TelecallerDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiFetch('/crm/leads/queue');
      if (res.ok) {
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const FILTERS = ['ALL', 'HIGH', 'NEW', 'CONTACTED', 'INTERESTED', 'QUOTATION'];

  const filtered = queue.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return item.nextAction?.urgency === 'HIGH';
    return item.lead.status === filter;
  });

  const overdueCount = queue.filter((i) => i.isOverdue).length;
  const highCount = queue.filter((i) => i.nextAction?.urgency === 'HIGH').length;

  return (
    <PageLayout title="My Queue">
      {/* Summary bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Total', value: queue.length, color: theme.primary },
          { label: 'Urgent', value: highCount, color: '#dc3545' },
          { label: 'Overdue', value: overdueCount, color: '#fd7e14' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              flex: 1,
              minWidth: 80,
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 13px',
              borderRadius: 20,
              border: `1px solid ${filter === f ? theme.primary : theme.border}`,
              background: filter === f ? theme.primary : '#fff',
              color: filter === f ? '#fff' : theme.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => load(true)}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            borderRadius: 20,
            border: `1px solid ${theme.border}`,
            background: '#fff',
            color: theme.textMuted,
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {refreshing ? '...' : '↻'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>Loading queue...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: theme.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>All caught up!</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>No leads in this category.</div>
        </div>
      ) : (
        filtered.map((item) => (
          <LeadCard
            key={item.lead.id}
            item={item}
            onOpen={(id) => navigate(`/crm/leads/${id}`)}
          />
        ))
      )}

      {/* Add lead FAB */}
      <button
        onClick={() => navigate('/crm/leads/new')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: theme.primary,
          color: '#fff',
          border: 'none',
          fontSize: 26,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,102,179,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        +
      </button>
    </PageLayout>
  );
}

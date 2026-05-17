import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { SOURCE_LABELS } from './crmSourceLabels';
import { STATUS_BADGE_COLORS } from './crmConstants';

// STATUS_BADGE_COLORS imported from crmConstants — shared with LeadList.js

const TABS = [
  {
    key: 'all',
    label: 'All',
    color: '#0066B3',
    desc: null,
  },
  {
    key: 'crm',
    label: 'CRM Leads',
    color: '#0066B3',
    desc: 'Operational pipeline — callable leads with contact info and valid quality tier.',
  },
  {
    key: 'converted',
    label: 'Converted',
    color: '#15803d',
    desc: 'Leads that converted into customers.',
  },
  {
    key: 'lost',
    label: 'Lost',
    color: '#b91c1c',
    desc: 'Leads marked as lost or dead.',
  },
  {
    key: 'tracking',
    label: 'Tracking',
    color: '#6b7280',
    desc: 'Anonymous visitors and product-view-only events. Not actionable — read-only analytics.',
  },
  {
    key: 'duplicate',
    label: 'Duplicates',
    color: '#d97706',
    desc: 'Same phone number already exists in CRM. Review and merge or discard.',
  },
  {
    key: 'junk',
    label: 'Junk',
    color: '#92400e',
    desc: 'No contact info, no product interest. Filtered out of the active pipeline.',
  },
];

const PAGE_SIZE = 50;

function ageLabel(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AllLeadsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      // Historical view: bypass the is_active=true guard in findAll().
      // Backend enforces this to elevated roles only — telecallers see their own active leads.
      p.set('includeInactive', 'true');
      if (search) p.set('search', search);
      if (sourceFilter) p.set('source', sourceFilter);
      if (activeTab === 'crm') p.set('operationalOnly', 'true');
      else if (activeTab === 'converted') p.set('status', 'CONVERTED');
      else if (activeTab === 'lost') p.set('status', 'LOST');
      else if (activeTab === 'tracking') p.set('quality', 'TRACKING_ONLY');
      else if (activeTab === 'duplicate') p.set('quality', 'DUPLICATE');
      else if (activeTab === 'junk') p.set('quality', 'JUNK');
      // 'all' tab: no status/quality filter — full CRM history
      const res = await apiFetch(`/crm/leads?${p}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
      setPage(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, activeTab]);

  useEffect(() => { load(); }, [load]);

  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const currentTab = TABS.find(t => t.key === activeTab);

  const inp = {
    border: `1px solid ${theme.border}`, borderRadius: 6, padding: '7px 10px',
    fontSize: 13, background: '#fff', color: theme.text,
  };
  const pageBtn = (disabled) => ({
    padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
    background: theme.surface, color: theme.text, opacity: disabled ? 0.4 : 1,
  });

  return (
    <PageLayout title="All Leads">
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ margin: '0 0 4px' }}>All Leads</h2>
        <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>
          Full CRM history — converted customers, lost leads, tracking intelligence, and audit visibility.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, margin: '14px 0 0',
        borderBottom: `2px solid ${theme.border}`, paddingBottom: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(0); }}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, borderRadius: '6px 6px 0 0', marginBottom: -2,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? tab.color : theme.textMuted,
              borderBottom: activeTab === tab.key
                ? `2px solid ${tab.color}`
                : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <input
          style={{ ...inp, flex: '1 1 160px' }}
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={inp} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          <optgroup label="Manual / High Trust">
            {['WALK_IN','REFERRAL','OLD_CUSTOMER','EXHIBITION','FIELD_VISIT','DEALER_REFERENCE','BUSINESS_CARD','DIRECT','IMPORTED'].map(s => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </optgroup>
          <optgroup label="Digital / Auto-Captured">
            {['INDIAMART','META','GOOGLE','WHATSAPP','SHOPIFY','LINKEDIN'].map(s => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Tab context banner */}
      {currentTab?.desc && (
        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
          padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#6b7280',
        }}>
          {currentTab.desc}
        </div>
      )}

      {loading && <p style={{ color: theme.textMuted, fontSize: 13 }}>Loading...</p>}

      {!loading && leads.length === 0 && (
        <p style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40 }}>
          No leads found for this filter.
        </p>
      )}

      {/* Lead rows */}
      {paginated.map((lead) => {
        const sc = STATUS_BADGE_COLORS[lead.status] || { bg: '#eee', text: '#333' };
        return (
          <div
            key={lead.id}
            onClick={() => navigate(`/crm/leads/${lead.id}`, { state: { from: location.pathname + location.search } })}
            style={{
              border: `1px solid ${theme.border}`, borderRadius: 8, marginBottom: 8,
              background: '#fff', cursor: 'pointer', userSelect: 'none', padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {lead.lead_ref && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: '0.04em',
                  background: '#e8edf5', color: '#1e3a5f',
                  border: '1px solid #c3cfe2', borderRadius: 5, padding: '2px 8px',
                }}>
                  {lead.lead_ref}
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                background: sc.bg, color: sc.text,
              }}>
                {lead.status}
              </span>
              {lead.source && (
                <span style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 3, padding: '2px 6px',
                  background: '#f1f5f9', color: '#64748b',
                }}>
                  {SOURCE_LABELS[lead.source] || lead.source}
                </span>
              )}
              {lead.product_interest && (
                <span style={{
                  fontSize: 11, color: '#6b7280', fontStyle: 'italic',
                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {lead.product_interest}
                </span>
              )}
              <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 'auto' }}>
                {ageLabel(lead.created_at)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', flex: '1 1 120px' }}>
                {lead.name}
              </span>
              {lead.phone && <span style={{ fontSize: 12, color: '#374151' }}>{lead.phone}</span>}
              {lead.email && <span style={{ fontSize: 12, color: '#374151' }}>{lead.email}</span>}
              {lead.city && <span style={{ fontSize: 12, color: '#9ca3af' }}>{lead.city}</span>}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button style={pageBtn(page === 0)} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: theme.textMuted, lineHeight: '30px' }}>
            Page {page + 1} / {totalPages} ({leads.length} leads)
          </span>
          <button style={pageBtn(page >= totalPages - 1)} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </PageLayout>
  );
}

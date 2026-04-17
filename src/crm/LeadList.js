import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';

const STATUS_COLORS = {
  NEW:       { bg: '#fff3cd', text: '#856404' },
  CONTACTED: { bg: '#cfe2ff', text: '#0a3372' },
  INTERESTED:{ bg: '#d1e7dd', text: '#0f5132' },
  QUOTATION: { bg: '#e2d9f3', text: '#432874' },
  CONVERTED: { bg: '#d1e7dd', text: '#0f5132' },
  LOST:      { bg: '#f8d7da', text: '#842029' },
};

const SOURCE_LABELS = {
  INDIAMART:   'IndiaMart',
  META_ADS:    'Meta Ads',
  GOOGLE_ADS:  'Google Ads',
  SHOPIFY:     'Shopify',
  WHATSAPP:    'WhatsApp',
  DIRECT_CALL: 'Direct Call',
  MANUAL:      'Manual',
};

const PRIORITY_COLORS = { HIGH: '#dc3545', MEDIUM: '#ffc107', LOW: '#198754' };

function hotLeadAge(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return { label: `${mins}m ago`, urgent: mins < 10 };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h ago`, urgent: false };
  return { label: `${Math.floor(hrs / 24)}d ago`, urgent: false };
}

const PAGE_SIZE = 50;

export default function LeadList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (sourceFilter) p.set('source', sourceFilter);
      if (search) p.set('search', search);
      const res = await apiFetch(`/crm/leads?${p}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
      setPage(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, search]);

  useEffect(() => { load(); }, [load]);

  const paginated = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);

  const inp = {
    border: `1px solid ${theme.border}`, borderRadius: 6, padding: '7px 10px',
    fontSize: 13, background: '#fff', color: theme.text,
  };
  const selBtn = (active) => ({
    padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? theme.primary : theme.surface,
    color: active ? '#fff' : theme.text,
  });

  return (
    <PageLayout title="Leads">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          style={{ ...inp, flex: '1 1 160px' }}
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...inp }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={{ ...inp }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {Object.keys(SOURCE_LABELS).map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
        <button
          onClick={() => navigate('/crm/leads/new')}
          style={{ ...inp, background: theme.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          + New Lead
        </button>
      </div>

      {loading && <p style={{ color: theme.textMuted, fontSize: 13 }}>Loading...</p>}

      {!loading && leads.length === 0 && (
        <p style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40 }}>
          No leads found. Create your first lead or wait for incoming webhooks.
        </p>
      )}

      {/* Lead rows */}
      {paginated.map((lead) => {
        const age = hotLeadAge(lead.created_at);
        const sc = STATUS_COLORS[lead.status] || { bg: '#eee', text: '#333' };
        const isOpen = expanded === lead.id;

        return (
          <div
            key={lead.id}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              marginBottom: 8,
              background: lead.duplicate_flag ? '#fff8e1' : '#fff',
              overflow: 'hidden',
            }}
          >
            {/* Row header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', flexWrap: 'wrap',
              }}
              onClick={() => setExpanded(isOpen ? null : lead.id)}
            >
              {/* Hot lead indicator */}
              {lead.status === 'NEW' && age.urgent && (
                <span style={{ fontSize: 11, background: '#dc3545', color: '#fff', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                  HOT
                </span>
              )}
              <span style={{ fontWeight: 600, fontSize: 14, flex: '1 1 120px' }}>{lead.name}</span>
              <span style={{ fontSize: 13, color: theme.textMuted }}>{lead.phone}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                background: sc.bg, color: sc.text,
              }}>
                {lead.status}
              </span>
              <span style={{ fontSize: 11, color: theme.textMuted }}>{SOURCE_LABELS[lead.source] || lead.source}</span>
              <span style={{
                fontSize: 11, color: PRIORITY_COLORS[lead.lead_priority] || theme.textMuted,
                fontWeight: 600,
              }}>
                {lead.lead_priority}
              </span>
              <span style={{ fontSize: 11, color: age.urgent ? '#dc3545' : theme.textMuted, marginLeft: 'auto' }}>
                {age.label}
              </span>
              <span style={{ fontSize: 12, color: theme.primary }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Duplicate warning */}
            {lead.duplicate_flag && (
              <div style={{ background: '#fff3cd', padding: '4px 14px', fontSize: 12, color: '#856404' }}>
                Same phone number has other open leads — verify before contacting.
              </div>
            )}

            {/* Expanded details */}
            {isOpen && (
              <div style={{ padding: '10px 14px', borderTop: `1px solid ${theme.border}`, background: theme.surface }}>
                {lead.product_interest && (
                  <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                    <strong>Interest:</strong> {lead.product_interest}
                  </p>
                )}
                {lead.notes && (
                  <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                    <strong>Notes:</strong> {lead.notes}
                  </p>
                )}
                {lead.follow_up_date && (
                  <p style={{ margin: '0 0 6px', fontSize: 13 }}>
                    <strong>Follow-up:</strong> {new Date(lead.follow_up_date).toLocaleString('en-IN')}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    style={{ padding: '6px 14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    style={{ padding: '6px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Edit
                  </button>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      style={{ padding: '6px 14px', background: '#6c757d', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
                    >
                      Email
                    </a>
                  )}
                  <a
                    href={`https://wa.me/91${lead.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '6px 14px', background: '#25D366', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button style={selBtn(false)} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: theme.textMuted, lineHeight: '30px' }}>
            Page {page + 1} / {totalPages} ({leads.length} leads)
          </span>
          <button style={selBtn(false)} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </PageLayout>
  );
}

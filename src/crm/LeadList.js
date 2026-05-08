import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { theme } from '../theme';
import { HOT_LEAD_WINDOWS, WAITING_L2_MINS, WAITING_L3_MINS, OVERDUE_MINS } from './crmConstants';
import './LeadList.css';

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

function compactAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60)  return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
  const days    = Math.floor(hrs / 24);
  const remHrs  = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

function ageLabel(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Single badge per lead row. Priority: OVERDUE > WAITING(3) > WAITING(2) > WAITING(1) > HOT.
 *
 * WAITING/OVERDUE conditions (all must hold):
 *   • last_customer_reply_at exists
 *   • status not CONVERTED or LOST
 *   • last_salesman_reply_at IS NULL OR < last_customer_reply_at  (strict <)
 *     Same-second timestamps: treated as "salesman replied" — no false WAITING.
 *
 * OVERDUE: unanswered ≥ OVERDUE_MINS. No expiry — stays until salesman replies.
 * WAITING: unanswered < OVERDUE_MINS. Three escalation levels from crmConstants.
 *
 * HOT: only when WAITING/OVERDUE are absent.
 *   • status === 'NEW' (clears automatically on first status change)
 *   • source in HOT_LEAD_WINDOWS
 *   • age < maxMins for that source
 */
function leadBadge(lead) {
  const now        = Date.now();
  const replyAt    = lead.last_customer_reply_at  ? +new Date(lead.last_customer_reply_at)  : null;
  const salesmanAt = lead.last_salesman_reply_at  ? +new Date(lead.last_salesman_reply_at)  : null;

  if (replyAt && !['CONVERTED', 'LOST'].includes(lead.status)) {
    // Strict <: if salesmanAt === replyAt (same second), treat as "replied" — no badge
    const unanswered = !salesmanAt || salesmanAt < replyAt;
    if (unanswered) {
      const waitMs = now - replyAt;
      if (waitMs <= 0) return null;  // server clock ahead of browser — suppress badge
      const waitMins = Math.floor(waitMs / 60000);
      const age      = compactAge(waitMs);

      if (waitMins >= OVERDUE_MINS) {
        return { text: `OVERDUE · ${age}`, bg: '#dc2626', color: '#fff', border: 'transparent', cardBorder: '#dc2626' };
      }
      if (waitMins >= WAITING_L3_MINS) {
        return { text: `WAITING · ${age}`, bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', cardBorder: '#f87171' };
      }
      if (waitMins >= WAITING_L2_MINS) {
        return { text: `WAITING · ${age}`, bg: '#ffedd5', color: '#9a3412', border: '#fb923c', cardBorder: '#fb923c' };
      }
      return { text: `WAITING · ${age}`, bg: '#fef9c3', color: '#854d0e', border: '#fde047', cardBorder: '#fde047' };
    }
  }

  if (lead.status === 'NEW') {
    const w = HOT_LEAD_WINDOWS[lead.source];
    if (w) {
      const ageMs   = now - +new Date(lead.created_at);
      const ageMins = Math.floor(ageMs / 60000);
      if (ageMins < w.maxMins) {
        return { text: `HOT · ${w.shortLabel} · ${compactAge(ageMs)}`, bg: '#dc3545', color: '#fff', border: 'transparent', cardBorder: '#dc3545' };
      }
    }
  }

  return null;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>Leads</h2>
        <button
          onClick={() => navigate('/crm/queue')}
          style={{ background: '#ff9800', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          ⚡ Priority Queue
        </button>
      </div>

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
        const badge       = leadBadge(lead);
        const sc          = STATUS_COLORS[lead.status] || { bg: '#eee', text: '#333' };
        const isOpen      = expanded === lead.id;
        const isAutoActive = lead.assigned_to && !['CONVERTED', 'LOST'].includes(lead.status);
        const lastAutoTime = lead.follow_up_date
          ? new Date(lead.follow_up_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : null;
        const isWaiting   = badge?.text?.startsWith('WAITING');

        return (
          <div
            key={lead.id}
            style={{
              border: `1px solid ${badge?.cardBorder ?? theme.border}`,
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
              {badge && (
                <span style={{
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: badge.bg, color: badge.color,
                  border: `1px solid ${badge.border}`,
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  {badge.text}
                </span>
              )}
              {/* Auto active badge */}
              {isAutoActive && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  background: '#e0f2fe', color: '#0369a1',
                  padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                }}>
                  AUTO{lastAutoTime ? ` · ${lastAutoTime}` : ''}
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
              <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 'auto' }}>
                {ageLabel(lead.created_at)}
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
                {lead.last_customer_reply_at && (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: isWaiting ? '#854d0e' : theme.textMuted }}>
                    <strong>Customer replied:</strong> {new Date(lead.last_customer_reply_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
                    href={`https://wa.me/${normalizePhoneForWhatsApp(lead.phone)}`}
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

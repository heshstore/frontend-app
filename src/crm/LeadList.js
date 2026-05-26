import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { HOT_LEAD_WINDOWS, STATUS_BADGE_COLORS } from './crmConstants';
import { SOURCE_LABELS } from './crmSourceLabels';
import { compactAge, getWaitingBadge } from './crmUtils';
import './LeadList.css';
import { normalizePhoneForWhatsApp } from '../utils/phone';

// STATUS_BADGE_COLORS imported from crmConstants — shared with AllLeadsView.js
const STATUS_COLORS = STATUS_BADGE_COLORS;

const QUALITY_STYLE = {
  QUALIFIED:     { bg: '#dcfce7', text: '#15803d', label: 'Qualified' },
  PARTIAL:       { bg: '#dbeafe', text: '#1d4ed8', label: 'Partial'   },
  TRACKING_ONLY: { bg: '#f3f4f6', text: '#6b7280', label: 'Tracking'  },
  DUPLICATE:     { bg: '#fef9c3', text: '#92400e', label: 'Duplicate' },
  JUNK:          { bg: '#fee2e2', text: '#b91c1c', label: 'Junk'      },
  AUTO_CAPTURED: { bg: '#f3e8ff', text: '#7e22ce', label: 'Auto'      },
};

// Sources where physical/relationship trust means less urgency for auto-contact
const MANUAL_SOURCE_SET = new Set([
  'WALK_IN', 'REFERRAL', 'EXHIBITION', 'FIELD_VISIT',
  'OLD_CUSTOMER', 'DEALER_REFERENCE', 'BUSINESS_CARD', 'IMPORTED', 'DIRECT',
]);

const PRIORITY_COLORS = { HIGH: '#dc3545', MEDIUM: '#ffc107', LOW: '#198754' };

function ageLabel(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Single badge per lead row. Priority: OVERDUE > WAITING(3) > WAITING(2) > WAITING(1) > HOT.
// WAITING/OVERDUE logic lives in crmUtils.getWaitingBadge().
// HOT: only shown when no WAITING/OVERDUE badge is present.
function leadBadge(lead) {
  const waiting = getWaitingBadge(lead);
  if (waiting) return waiting;

  if (lead.status === 'NEW') {
    const w = HOT_LEAD_WINDOWS[lead.source];
    if (w) {
      const ageMs   = Date.now() - +new Date(lead.created_at);
      const ageMins = Math.floor(ageMs / 60000);
      if (ageMins < w.maxMins) {
        return { text: `HOT · ${w.shortLabel} · ${compactAge(ageMs)}`, bg: '#dc3545', color: '#fff', border: 'transparent', cardBorder: '#dc3545' };
      }
    }
  }

  return null;
}

const PAGE_SIZE = 50;

function quickFuPresets() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const tomorrow10 = new Date(now); tomorrow10.setDate(tomorrow10.getDate()+1); tomorrow10.setHours(10,0,0,0);
  const inTwoHours = new Date(now); inTwoHours.setHours(inTwoHours.getHours()+2);
  return [
    { label: '+2h', value: fmt(inTwoHours) },
    { label: 'Tomorrow 10am', value: fmt(tomorrow10) },
  ];
}

function InlineFollowUpForm({ leadId, onDone }) {
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const presets = quickFuPresets();
  const inp = { padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, boxSizing: 'border-box' };

  const save = async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      await apiFetch(`/crm/leads/${leadId}/followups`, {
        method: 'POST',
        body: JSON.stringify({ due_date: date }),
      });
      onDone();
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}
      onClick={(e) => e.stopPropagation()}>
      {presets.map(p => (
        <button key={p.label} onClick={() => setDate(p.value)} style={{
          ...inp, background: date === p.value ? '#fff7ed' : '#fff', color: date === p.value ? '#c2410c' : '#374151',
          border: `1px solid ${date === p.value ? '#f97316' : '#d1d5db'}`, cursor: 'pointer', fontWeight: 600,
        }}>{p.label}</button>
      ))}
      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, minWidth: 160 }} />
      <button onClick={save} disabled={!date || saving} style={{
        ...inp, background: '#0066B3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700,
      }}>{saving ? '…' : 'Schedule'}</button>
    </div>
  );
}

export default function LeadList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [contextFilter, setContextFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [inlineFu, setInlineFu] = useState(null); // leadId showing inline follow-up form
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (sourceFilter) p.set('source', sourceFilter);
      if (contextFilter) p.set('context', contextFilter);
      if (search) p.set('search', search);
      p.set('operationalOnly', 'true');
      const res = await apiFetch(`/crm/leads?${p}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
      setPage(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, contextFilter, search]);

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
    <PageLayout title="Available Leads">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>Available Leads</h2>
        <button
          onClick={() => navigate('/crm/queue')}
          style={{ background: '#ff9800', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          ⚡ Today Tasks
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
        <select style={{ ...inp }} value={contextFilter} onChange={(e) => setContextFilter(e.target.value)}>
          <option value="">All Origins</option>
          <optgroup label="Google">
            <option value="GOOGLE – Ads">Google – Ads</option>
            <option value="GOOGLE – Organic">Google – Organic</option>
          </optgroup>
          <optgroup label="Meta">
            <option value="META – Lead Form">Meta – Lead Form</option>
          </optgroup>
          <optgroup label="Shopify">
            <option value="SHOPIFY – Product Form">Shopify – Product Form</option>
            <option value="SHOPIFY – WhatsApp Click">Shopify – WhatsApp Click</option>
            <option value="SHOPIFY – Exit Popup">Shopify – Exit Popup</option>
            <option value="SHOPIFY – Floating Button">Shopify – Floating Button</option>
          </optgroup>
          <optgroup label="Other">
            <option value="WHATSAPP – Inbound">WhatsApp – Inbound</option>
            <option value="INDIAMART – Query">IndiaMart – Query</option>
            <option value="DIRECT – Manual">Direct – Manual Entry</option>
          </optgroup>
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
          No active leads. Create your first lead or wait for incoming webhooks.
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
            onClick={() => navigate(`/crm/leads/${lead.id}`, { state: { from: location.pathname + location.search } })}
            style={{
              border: `1px solid ${badge?.cardBorder ?? theme.border}`,
              borderRadius: 8,
              marginBottom: 8,
              background: lead.duplicate_flag ? '#fff8e1' : '#fff',
              overflow: 'hidden',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {/* Row header — clicking anywhere on card navigates to detail;
                chevron button intercepts and toggles the preview panel instead */}
            <div style={{ padding: '10px 14px' }}>
              {/* Top row: badges + age + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {/* Lead reference — primary business ID, always first */}
                {lead.lead_ref ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    fontFamily: "'Courier New', Courier, monospace",
                    letterSpacing: '0.04em',
                    background: '#e8edf5', color: '#1e3a5f',
                    border: '1px solid #c3cfe2',
                    borderRadius: 5, padding: '2px 8px',
                  }}>
                    {lead.lead_ref}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                    fontFamily: "'Courier New', Courier, monospace",
                    background: '#f3f4f6', color: '#9ca3af',
                    border: '1px solid #e5e7eb',
                    borderRadius: 5, padding: '2px 8px',
                    fontStyle: 'italic',
                  }}>
                    Generating…
                  </span>
                )}
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
                {isAutoActive && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                    background: '#e0f2fe', color: '#0369a1',
                    padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                  }}>
                    AUTO{lastAutoTime ? ` · ${lastAutoTime}` : ''}
                  </span>
                )}
                {/* Quality badge */}
                {lead.lead_quality && QUALITY_STYLE[lead.lead_quality] && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                    background: QUALITY_STYLE[lead.lead_quality].bg,
                    color: QUALITY_STYLE[lead.lead_quality].text,
                    padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                    textTransform: 'uppercase',
                  }}>
                    {QUALITY_STYLE[lead.lead_quality].label}
                  </span>
                )}
                {/* Source — green bg for manual/trusted, slate for digital */}
                <span style={{
                  fontSize: 10, fontWeight: 600, flexShrink: 0,
                  borderRadius: 3, padding: '2px 6px',
                  background: MANUAL_SOURCE_SET.has(lead.source) ? '#dcfce7' : '#f1f5f9',
                  color:      MANUAL_SOURCE_SET.has(lead.source) ? '#15803d' : '#64748b',
                }}>
                  {MANUAL_SOURCE_SET.has(lead.source) ? '✓ ' : ''}{SOURCE_LABELS[lead.source] || lead.source}
                </span>
                {/* Status */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: sc.bg, color: sc.text, flexShrink: 0,
                }}>
                  {lead.status}
                </span>
                <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 'auto' }}>
                  {ageLabel(lead.created_at)}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : lead.id); }}
                  style={{ fontSize: 12, color: theme.primary, padding: '4px 6px', cursor: 'pointer' }}
                  title={isOpen ? 'Collapse preview' : 'Expand preview'}
                >
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              {/* Main info row: name + contact details */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', flex: '1 1 120px' }}>
                  {lead.name}
                </span>
                {lead.phone && (
                  <span style={{ fontSize: 12, color: '#374151' }}>{lead.phone}</span>
                )}
                {lead.email && (
                  <span style={{ fontSize: 12, color: '#374151' }}>{lead.email}</span>
                )}
                {lead.city && (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{lead.city}</span>
                )}
                {lead.product_interest && (
                  <span style={{
                    fontSize: 11, color: '#6b7280', fontStyle: 'italic',
                    maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {lead.product_interest}
                  </span>
                )}
                <span style={{
                  fontSize: 11, color: PRIORITY_COLORS[lead.lead_priority] || theme.textMuted,
                  fontWeight: 600,
                }}>
                  {lead.lead_priority}
                </span>
              </div>
            </div>

            {/* Duplicate warning */}
            {lead.duplicate_flag && (
              <div style={{ background: '#fff3cd', padding: '4px 14px', fontSize: 12, color: '#856404' }}>
                Same phone number has other open leads — verify before contacting.
              </div>
            )}

            {/* Expanded details */}
            {isOpen && (
              <div
                style={{ padding: '10px 14px', borderTop: `1px solid ${theme.border}`, background: theme.surface }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Quick actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {lead.phone && (
                    <a
                      href={`tel:+91${normalizePhoneForWhatsApp(lead.phone)}`}
                      style={{ padding: '7px 12px', background: '#0066B3', color: '#fff', textDecoration: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                    >📞 Call</a>
                  )}
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${normalizePhoneForWhatsApp(lead.phone)}`}
                      target="_blank" rel="noreferrer"
                      style={{ padding: '7px 12px', background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                    >💬 WA</a>
                  )}
                  <button
                    onClick={() => setInlineFu(inlineFu === lead.id ? null : lead.id)}
                    style={{ padding: '7px 12px', background: inlineFu === lead.id ? '#0066B3' : '#f3f4f6', color: inlineFu === lead.id ? '#fff' : '#374151', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >📅 Follow-up</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/crm/leads/${lead.id}`, { state: { from: location.pathname + location.search } }); }}
                    style={{ padding: '7px 12px', background: '#f3f4f6', color: '#0066B3', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                  >→ Open</button>
                </div>

                {/* Inline follow-up form */}
                {inlineFu === lead.id && (
                  <InlineFollowUpForm leadId={lead.id} onDone={() => { setInlineFu(null); load(); }} />
                )}

                {/* Lead context */}
                {lead.lead_quality && lead.quality_score != null && (
                  <div style={{ marginBottom: 6, fontSize: 12, color: '#6b7280' }}>
                    Quality score: <strong style={{ color: lead.quality_score >= 60 ? '#16a34a' : lead.quality_score >= 30 ? '#d97706' : '#dc2626' }}>
                      {lead.quality_score}/100
                    </strong>
                    {lead.context_history && <span style={{ marginLeft: 8, fontStyle: 'italic', color: '#9ca3af' }}>{lead.context_history}</span>}
                  </div>
                )}
                {lead.notes && (
                  <p style={{ margin: '0 0 4px', fontSize: 12 }}><strong>Notes:</strong> {lead.notes}</p>
                )}
                {lead.follow_up_date && (
                  <p style={{ margin: '0 0 4px', fontSize: 12 }}><strong>Follow-up:</strong> {new Date(lead.follow_up_date).toLocaleString('en-IN')}</p>
                )}
                {lead.last_customer_reply_at && (
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: isWaiting ? '#854d0e' : theme.textMuted }}>
                    <strong>Customer replied:</strong> {new Date(lead.last_customer_reply_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
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

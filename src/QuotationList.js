import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { API_URL } from './config';
import { theme, buttonStyle } from './theme';
import DocActions from './components/DocActions';
import StatusBadge, { PricingBadge } from './components/ui/StatusBadge';
import EmptyState from './components/ui/EmptyState';
import { SkeletonList } from './components/ui/SkeletonCard';
import { toast } from './utils/toast';
import { useConfirm } from './components/ui/ConfirmModal';

const EDITABLE_STATUSES    = ['DRAFT', 'SENT', 'APPROVED'];
const CONVERTIBLE_STATUSES = ['DRAFT', 'SENT', 'APPROVED'];

const STATUS_BORDER = {
  DRAFT:     '#6c757d',
  SENT:      '#0d6efd',
  APPROVED:  '#198754',
  REJECTED:  '#dc3545',
  CANCELLED: '#dc3545',
  CONVERTED: '#0066B3',
};

const STATUS_CHIPS = [
  { value: '',          label: 'All' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SENT',      label: 'Sent' },
  { value: 'APPROVED',  label: 'Approved' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const FILTER_KEY = 'saachu_quot_filter';

const btn = (extra = {}) => ({
  ...buttonStyle,
  padding: '6px 13px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 5,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
  border: 'none',
  ...extra,
});

export default function QuotationList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [converting, setConverting] = useState(null); // quotation id being converted
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    try { return localStorage.getItem(FILTER_KEY) || ''; } catch { return ''; }
  });
  const [expanded, setExpanded] = useState(null);
  const [confirm, confirmModal] = useConfirm();

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch(`/quotations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuotations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadQuotations(); }, [loadQuotations]);

  const setFilter = (val) => {
    setStatusFilter(val);
    try { localStorage.setItem(FILTER_KEY, val); } catch {}
  };

  const filtered = quotations.filter((q) => {
    const text = search.toLowerCase();
    return (
      (q.quotation_no || '').toLowerCase().includes(text) ||
      (q.customer_name || '').toLowerCase().includes(text) ||
      String(q.id).includes(text)
    );
  });

  const handleCancel = async (id) => {
    if (!await confirm('Cancel this quotation?', 'This cannot be undone. The quotation will remain in history as Cancelled.', { danger: true, confirmLabel: 'Yes, cancel' })) return;
    try {
      const res = await apiFetch(`/quotations/${id}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        toast.success('Quotation cancelled');
        loadQuotations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Cancel failed');
      }
    } catch { toast.error('Cancel failed'); }
  };

  const handleConvert = async (id) => {
    if (!await confirm(
      'Convert to order?',
      'A new order will be created from this quotation. The quotation status will change to Converted.',
      { confirmLabel: 'Convert to order' },
    )) return;

    setConverting(id);
    try {
      const res  = await apiFetch(`/quotations/${id}/convert-to-order`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const orderId = data.order_id;
        const orderNo = data.order_no || (orderId ? `ORD-${String(orderId).padStart(4, '0')}` : '');
        toast.success(`Order ${orderNo} created successfully`);
        loadQuotations();
        if (orderId) navigate(`/orders/${orderId}`);
        else navigate('/orders');
      } else {
        const msg = data?.message || 'Conversion failed';
        if (msg.toLowerCase().includes('already converted')) {
          toast.error('This quotation was already converted to an order');
        } else if (msg.toLowerCase().includes('mobile') || msg.toLowerCase().includes('phone')) {
          toast.error('Customer mobile number is missing — update the customer record first');
        } else if (msg.toLowerCase().includes('item')) {
          toast.error('Quotation has no items — add items before converting');
        } else {
          toast.error(msg);
        }
      }
    } catch (err) {
      toast.error('Conversion failed — please try again');
    } finally {
      setConverting(null);
    }
  };

  return (
    <>
      {confirmModal}
      <div>

        {/* Page title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', flex: 1 }}>Quotations</h1>
          <button onClick={() => navigate('/quotation')} style={{ ...buttonStyle, padding: '8px 16px', borderRadius: 6, fontSize: 13, height: 36 }}>
            + New quotation
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Search by No. / Customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {STATUS_CHIPS.map(chip => (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                background: statusFilter === chip.value ? '#2563eb' : '#f3f4f6',
                color: statusFilter === chip.value ? '#fff' : '#6b7280',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading && <SkeletonList count={5} />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon="📄"
            title="No quotations found"
            subtitle={statusFilter ? `No ${statusFilter.toLowerCase()} quotations. Try a different filter.` : 'Create your first quotation to get started.'}
            actionLabel="+ New quotation"
            onAction={() => navigate('/quotation')}
          />
        )}

        {!loading && filtered.map((q) => {
          const isEditable        = EDITABLE_STATUSES.includes(q.status);
          const isConvertible     = CONVERTIBLE_STATUSES.includes(q.status);
          const isCancellable     = isEditable;
          const isReadOnly        = !isEditable;
          const hasPhone          = !!(q.customer_phone || q.customer_mobile);
          const convertBlocked    = isConvertible && !hasPhone; // phone missing — warn user

          return (
            <div
              key={q.id}
              style={{
                border: `1px solid ${theme.border}`,
                borderLeft: `4px solid ${STATUS_BORDER[q.status] || '#6c757d'}`,
                borderRadius: 8,
                marginBottom: 12,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {q.quotation_no || `QUO-${q.id}`}
                    <StatusBadge status={q.status} />
                    {q.is_wholesaler !== undefined && <PricingBadge isWholesaler={q.is_wholesaler} />}
                  </div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>
                    {q.customer_name || '—'} · ₹{Number(q.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : ''}
                    {q.valid_till ? ` · Valid till ${new Date(q.valid_till).toLocaleDateString('en-IN')}` : ''}
                    {q.status === 'CONVERTED' && q.converted_order_id
                      ? <span
                          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${q.converted_order_id}`); }}
                          style={{ marginLeft: 8, color: '#0066B3', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          → Order #{q.converted_order_id}
                        </span>
                      : null}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: theme.textMuted }}>{expanded === q.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded */}
              {expanded === q.id && (
                <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 16px' }}>

                  {/* Items */}
                  {q.items && q.items.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#374151' }}>Items</div>
                      {q.items.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', fontSize: 13,
                          padding: '4px 0', borderBottom: `1px solid #f3f4f6`,
                        }}>
                          <span style={{ color: '#111' }}>{item.item_name || item.sku || `Item ${i + 1}`}</span>
                          <span style={{ color: '#6b7280' }}>
                            ×{item.qty} @ ₹{Number(item.rate || 0).toLocaleString('en-IN')} = <strong>₹{Number(item.amount || 0).toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                      ))}
                      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                        Total: ₹{Number(q.total_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: `1px solid #f3f4f6`,
                  }}>

                    {/* Left */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/quotations/${q.id}/view`)}
                        style={btn({ background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' })}
                      >
                        👁 View
                      </button>

                      {isEditable && (
                        <button
                          onClick={() => navigate(`/quotation?id=${q.id}`)}
                          style={btn({ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' })}
                        >
                          ✏ Edit
                        </button>
                      )}

                      {isCancellable && (
                        <button
                          onClick={() => handleCancel(q.id)}
                          style={btn({ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' })}
                        >
                          ✕ Cancel
                        </button>
                      )}

                      {isReadOnly && (
                        <span style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center', padding: '0 4px' }}>
                          {q.status === 'CANCELLED' ? 'Cancelled — read only' : 'Converted — read only'}
                        </span>
                      )}
                    </div>

                    {/* Right */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <DocActions
                        type="quotation"
                        id={q.id}
                        docNo={q.quotation_no}
                        docDate={q.created_at}
                        amount={q.total_amount}
                        customerMobile={q.customer_phone}
                        customerName={q.customer_name}
                        customerEmail={q.customer_email}
                        publicPdfUrl={q.quotation_no ? `${API_URL}/quotations/public/${encodeURIComponent(q.quotation_no)}/pdf` : ''}
                      />

                      {isConvertible && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => {
                              if (convertBlocked) {
                                toast.error('Customer mobile number missing — update the customer record first');
                                return;
                              }
                              handleConvert(q.id);
                            }}
                            disabled={converting === q.id}
                            title={convertBlocked ? 'Customer mobile number required to convert' : 'Convert this quotation to an order'}
                            style={btn({
                              background: converting === q.id ? '#6b9dc2' : convertBlocked ? '#9ca3af' : '#0066B3',
                              color: '#fff',
                              cursor: converting === q.id ? 'not-allowed' : convertBlocked ? 'not-allowed' : 'pointer',
                              opacity: converting === q.id ? 0.8 : 1,
                            })}
                          >
                            {converting === q.id
                              ? '⏳ Converting…'
                              : convertBlocked
                                ? '⚠️ No mobile'
                                : '🔄 Convert to order'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

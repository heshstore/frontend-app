import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { theme, buttonStyle } from './theme';
import DocActions from './components/DocActions';

const STATUS_COLORS = {
  OPEN: '#198754',
  CONVERTED: '#0066B3',
  CANCELLED: '#dc3545',
  EXPIRED: '#6c757d',
};

export default function QuotationList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

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

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const filtered = quotations.filter((q) => {
    const text = search.toLowerCase();
    return (
      (q.quotation_no || '').toLowerCase().includes(text) ||
      (q.customer_name || '').toLowerCase().includes(text) ||
      String(q.id).includes(text)
    );
  });

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this quotation?')) return;
    try {
      const res = await apiFetch(`/quotations/${id}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        alert('Quotation cancelled');
        loadQuotations();
      } else {
        alert('Cancel failed');
      }
    } catch {
      alert('Cancel failed');
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this quotation to an order?')) return;
    try {
      const res = await apiFetch(`/quotations/${id}/convert-to-order`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const orderNo = data.order_id ? `#ORD-${String(data.order_id).padStart(5, '0')}` : '';
        alert(`Order ${orderNo} created successfully!`);
        loadQuotations();
        navigate('/orders');
      } else {
        alert(data?.message || 'Conversion failed');
      }
    } catch {
      alert('Conversion failed');
    }
  };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.background, minHeight: '100vh', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: theme.primary, color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>Quotations</h2>
        <button onClick={() => navigate('/quotation')} style={{ ...buttonStyle, background: '#fff', color: theme.primary, fontWeight: 600 }}>
          + New
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            placeholder="Search by No. / Customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 4, fontSize: 14 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: 4, fontSize: 14 }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {loading && <div style={{ padding: 24, textAlign: 'center', color: theme.textMuted }}>Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: theme.textMuted }}>
            No quotations found.{' '}
            <button onClick={() => navigate('/quotation')} style={{ ...buttonStyle, padding: '6px 14px' }}>
              Create one
            </button>
          </div>
        )}

        {!loading && filtered.map((q) => (
          <div
            key={q.id}
            style={{
              border: `1px solid ${theme.border}`,
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
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {q.quotation_no || `QUO-${q.id}`}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      background: STATUS_COLORS[q.status] || '#6c757d',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {q.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{q.customer_name || '—'} · ₹{Number(q.total_amount || 0).toLocaleString('en-IN')}</span>
                  {q.is_wholesaler !== undefined && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                      background: q.is_wholesaler ? '#fef9c3' : '#dbeafe',
                      color: q.is_wholesaler ? '#a16207' : '#1e40af',
                    }}>
                      {q.is_wholesaler ? 'WHOLESALER' : 'RETAILER'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : ''}
                  {q.valid_till ? ` · Valid till ${new Date(q.valid_till).toLocaleDateString('en-IN')}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 18, color: theme.textMuted }}>{expanded === q.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded details */}
            {expanded === q.id && (
              <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 16px' }}>
                {/* Items */}
                {q.items && q.items.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Items</div>
                    {q.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <span>{item.item_name || item.sku || `Item ${i + 1}`}</span>
                        <span>× {item.qty} @ ₹{Number(item.rate || 0).toLocaleString('en-IN')} = ₹{Number(item.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {q.status === 'OPEN' && (
                    <>
                      <button onClick={() => navigate(`/quotation?id=${q.id}`)} style={{ ...buttonStyle, padding: '6px 14px' }}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleConvert(q.id)}
                        style={{ ...buttonStyle, background: theme.success || '#198754', padding: '6px 14px' }}
                      >
                        Convert to Order
                      </button>
                      <button
                        onClick={() => handleCancel(q.id)}
                        style={{ ...buttonStyle, background: '#dc3545', padding: '6px 14px' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <DocActions
                    type="quotation"
                    id={q.id}
                    docNo={q.quotation_no}
                    amount={q.total_amount}
                    customerMobile={q.mobile}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

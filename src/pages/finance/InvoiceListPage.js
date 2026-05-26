import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6,
  padding: '6px 12px', fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

const th = {
  padding: '10px 14px', background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left', fontWeight: 600,
  color: '#475569', fontSize: 12, whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
  fontSize: 13, verticalAlign: 'middle',
};

const fmt = (n) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_BADGE = {
  PENDING: { bg: '#fff7ed', color: '#c2410c', label: 'PENDING' },
  PARTIAL: { bg: '#eff6ff', color: '#1d4ed8', label: 'PARTIAL' },
  PAID:    { bg: '#f0fdf4', color: '#15803d', label: 'PAID'    },
  OVERDUE: { bg: '#fff1f2', color: '#be123c', label: 'OVERDUE' },
};

function StatusBadge({ status }) {
  const s = (status || 'PENDING').toUpperCase();
  const m = STATUS_BADGE[s] || { bg: '#f3f4f6', color: '#6b7280', label: s };
  return (
    <span style={{ background: m.bg, color: m.color, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  );
}

async function downloadPdf(id, invoiceNo) {
  try {
    const r = await apiFetch(`/invoice/${id}/pdf`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceNo || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(`PDF download failed: ${e.message}`);
  }
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pdfBusy, setPdfBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch('/invoice');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const d = await r.json();
      setInvoices(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePdf = async (inv) => {
    setPdfBusy(inv.id);
    await downloadPdf(inv.id, inv.invoice_no);
    setPdfBusy(null);
  };

  const filtered = invoices.filter(inv => {
    if (statusFilter && (inv.status || '').toUpperCase() !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(inv.invoice_no || '').toLowerCase().includes(q) &&
        !String(inv.order_id).includes(q)
      ) return false;
    }
    return true;
  });

  const totalOutstanding = filtered
    .filter(i => (i.status || '').toUpperCase() !== 'PAID')
    .reduce((s, i) => s + Number(i.total_amount || 0), 0);

  return (
    <PageLayout
      title="Invoices"
      subtitle="All formal invoices — generated from orders"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn('#0d6efd', '#fff', loading)} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search invoice no. or order ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: 13, width: 240,
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PAID">Paid</option>
          </select>
          {totalOutstanding > 0 && (
            <div style={{ marginLeft: 'auto', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#c2410c', fontWeight: 700 }}>
              Outstanding: {fmt(totalOutstanding)}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={load}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading invoices…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>
              {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filter'}
            </div>
            {invoices.length === 0 && (
              <div style={{ fontSize: 13 }}>
                Open an order and click <strong>View Invoice</strong> to generate one.
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Invoice No.</th>
                  <th style={th}>Order ID</th>
                  <th style={th}>Type</th>
                  <th style={th}>GST Type</th>
                  <th style={th}>Total Amount</th>
                  <th style={th}>GST</th>
                  <th style={th}>Status</th>
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const gstTotal = Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
                  const isOverdue = (inv.status || '').toUpperCase() === 'OVERDUE';
                  return (
                    <tr key={inv.id} style={{ background: isOverdue ? '#fff9f9' : '#fff' }}>
                      <td style={td}>
                        <span style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                          {inv.invoice_no || `—`}
                        </span>
                      </td>
                      <td style={td}>
                        <button
                          onClick={() => navigate(`/orders/${inv.order_id}`)}
                          style={{ ...btn('#eff6ff', '#1d4ed8'), fontSize: 11 }}
                        >
                          #{inv.order_id}
                        </button>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                          {inv.type || 'TALLY'}
                        </span>
                      </td>
                      <td style={td}>{inv.gst_type || '—'}</td>
                      <td style={td}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(inv.total_amount)}</span>
                      </td>
                      <td style={td}>
                        {gstTotal > 0 ? (
                          <span style={{ fontSize: 12, color: '#475569' }}>{fmt(gstTotal)}</span>
                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={td}><StatusBadge status={inv.status} /></td>
                      <td style={{ ...td, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate(`/invoice-view/${inv.id}`)}>
                            Details
                          </button>
                          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate(`/invoice/${inv.order_id}`)}>
                            Proforma
                          </button>
                          <button
                            style={btn('#dc2626', '#fff', pdfBusy === inv.id)}
                            disabled={pdfBusy === inv.id}
                            onClick={() => handlePdf(inv)}
                          >
                            {pdfBusy === inv.id ? '…' : 'PDF'}
                          </button>
                          {(inv.status || '').toUpperCase() !== 'PAID' && (
                            <button
                              style={btn('#198754')}
                              onClick={() => navigate(`/accounts/payment/${inv.order_id}`)}
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} shown
          {filtered.length !== invoices.length ? ` (${invoices.length} total)` : ''}.
          Invoices are generated from orders — use <strong>View Invoice</strong> on any order to create one.
        </div>
      </div>
    </PageLayout>
  );
}

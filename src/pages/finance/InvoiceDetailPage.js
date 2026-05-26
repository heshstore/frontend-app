import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6,
  padding: '7px 14px', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

const fmt = (n) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_META = {
  PENDING: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  PARTIAL: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  PAID:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  OVERDUE: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
};

function Row({ label, value, mono = false, bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#111827', fontWeight: bold ? 700 : 400, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [emailForm, setEmailForm] = useState({ open: false, to: '', busy: false, sent: false });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch(`/invoice/${id}`);
      if (!r.ok) throw new Error(`Invoice not found (${r.status})`);
      setInvoice(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePdf = async () => {
    setPdfBusy(true);
    await downloadPdf(id, invoice?.invoice_no);
    setPdfBusy(false);
  };

  const sendEmail = async () => {
    if (!emailForm.to.trim()) return;
    setEmailForm(f => ({ ...f, busy: true }));
    try {
      const r = await apiFetch(`/invoice/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailForm.to.trim() }),
      });
      if (!r.ok) throw new Error(`Email error ${r.status}`);
      setEmailForm(f => ({ ...f, sent: true, busy: false }));
    } catch (e) {
      alert(`Email failed: ${e.message}`);
      setEmailForm(f => ({ ...f, busy: false }));
    }
  };

  if (loading) return (
    <PageLayout title="Invoice Detail" subtitle="Loading…">
      <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading invoice…</div>
    </PageLayout>
  );

  if (error) return (
    <PageLayout title="Invoice Detail" subtitle="">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: 20, color: '#dc3545', marginBottom: 16 }}>{error}</div>
        <button style={btn('#0d6efd')} onClick={() => navigate('/invoices')}>← Back to Invoices</button>
      </div>
    </PageLayout>
  );

  const inv = invoice;
  const statusUpper = (inv.status || 'PENDING').toUpperCase();
  const statusMeta  = STATUS_META[statusUpper] || { bg: '#f3f4f6', color: '#6b7280', border: '#e2e8f0' };
  const gstTotal    = Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
  const isPaid      = statusUpper === 'PAID';

  return (
    <PageLayout
      title={`Invoice ${inv.invoice_no || `#${id}`}`}
      subtitle={`Order ${inv.order_no || `#${inv.order_id}`} · ${inv.order_status || ''}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate('/invoices')}>← All Invoices</button>
          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate(`/invoice/${inv.order_id}`)}>View Proforma</button>
          <button style={btn('#dc2626', '#fff', pdfBusy)} disabled={pdfBusy} onClick={handlePdf}>
            {pdfBusy ? 'Downloading…' : 'Download PDF'}
          </button>
          {!isPaid && (
            <button style={btn('#198754')} onClick={() => navigate(`/accounts/payment/${inv.order_id}`)}>
              Collect Payment
            </button>
          )}
        </div>
      }
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Status banner */}
        <div style={{
          background: statusMeta.bg, border: `1px solid ${statusMeta.border}`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: statusMeta.color, marginRight: 12 }}>{statusUpper}</span>
            <span style={{ fontSize: 13, color: '#475569' }}>
              {statusUpper === 'PAID' ? 'This invoice is fully paid.' :
               statusUpper === 'OVERDUE' ? 'This invoice is overdue.' :
               statusUpper === 'PARTIAL' ? 'Partially paid — balance outstanding.' :
               'Payment pending.'}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: statusMeta.color }}>
            {fmt(inv.total_amount)}
          </div>
        </div>

        {/* Invoice details card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 4 }}>Invoice Details</div>
          <Row label="Invoice No."     value={inv.invoice_no || '—'}    mono />
          <Row label="Invoice Type"    value={inv.type || 'TALLY'} />
          <Row label="Order No."       value={inv.order_no || `#${inv.order_id}`} />
          <Row label="Order Status"    value={inv.order_status || '—'} />
          {inv.salesman_name && <Row label="Salesman" value={`${inv.salesman_name} (${inv.salesman_role || '—'})`} />}
          <Row label="Created"         value={inv.created_at ? new Date(inv.created_at).toLocaleString('en-IN') : '—'} />
        </div>

        {/* Amount breakdown card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 4 }}>Amount Breakdown</div>
          <Row label="Total Amount"    value={fmt(inv.total_amount)} bold />
          <Row label="GST Type"        value={inv.gst_type || 'none'} />
          {Number(inv.cgst) > 0 && <Row label="CGST (9%)"    value={fmt(inv.cgst)} />}
          {Number(inv.sgst) > 0 && <Row label="SGST (9%)"    value={fmt(inv.sgst)} />}
          {Number(inv.igst) > 0 && <Row label="IGST (18%)"   value={fmt(inv.igst)} />}
          {gstTotal > 0 && <Row label="Total GST"             value={fmt(gstTotal)} bold />}
        </div>

        {/* Email invoice */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Email Invoice</div>
          {emailForm.sent ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', color: '#15803d', fontWeight: 600 }}>
              Invoice emailed to {emailForm.to}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="customer@example.com"
                value={emailForm.to}
                onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
              />
              <button
                style={btn('#6366f1', '#fff', emailForm.busy || !emailForm.to.trim())}
                disabled={emailForm.busy || !emailForm.to.trim()}
                onClick={sendEmail}
              >
                {emailForm.busy ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          )}
        </div>

        {/* Navigation shortcuts */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate(`/orders/${inv.order_id}`)}>View Order →</button>
          <button style={btn('#f3f4f6', '#374151')} onClick={() => navigate(`/accounts/history/${inv.order_id}`)}>Payment History →</button>
          {!isPaid && (
            <button style={btn('#2563eb')} onClick={() => navigate(`/accounts/payment/${inv.order_id}`)}>
              Record Payment →
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

import React from 'react';

const COMPANY_NAME  = process.env.REACT_APP_COMPANY_NAME  || 'Saachu';
const COMPANY_STATE = process.env.REACT_APP_COMPANY_STATE || 'Maharashtra';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

function buildGstMap(items) {
  const map = {};
  for (const item of items) {
    const taxable = Number(item.amount || 0);
    const pct     = Number(item.gst_percent || 0);
    const key     = String(pct);
    if (!map[key]) map[key] = { pct, taxable: 0, gst: 0 };
    map[key].taxable += taxable;
    map[key].gst     += taxable * pct / 100;
  }
  return Object.values(map).filter((r) => r.pct > 0);
}

export default function QuotationTemplate({ data }) {
  if (!data) return null;

  const items          = data.items || [];
  const gstSlabs       = buildGstMap(items);
  const totalGst       = gstSlabs.reduce((s, r) => s + r.gst, 0);
  const subTotal       = Number(data.sub_total || 0);
  const discountType   = data.discount_type || 'PERCENT';
  const discountValue  = Number(data.discount_value || 0);
  const headerDiscount = discountType === 'FLAT'
    ? discountValue
    : (subTotal * discountValue) / 100;
  const charges =
    Number(data.charges_packing      || 0) +
    Number(data.charges_cartage      || 0) +
    Number(data.charges_forwarding   || 0) +
    Number(data.charges_installation || 0) +
    Number(data.charges_loading      || 0);
  const grandTotal = Number(data.total_amount || 0);

  const s = styles;

  return (
    <div style={s.page} className="quotation-print-page">
      {/* ── Company + doc header ──────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <div style={s.companyName}>{COMPANY_NAME}</div>
          <div style={s.companyMeta}>State: {COMPANY_STATE}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={s.docTitle}>QUOTATION</div>
          <div style={s.docMeta}>No: <strong>{data.quotation_no || '-'}</strong></div>
          <div style={s.docMeta}>Date: {fmtDate(data.created_at)}</div>
          {data.valid_till && <div style={s.docMeta}>Valid Till: {fmtDate(data.valid_till)}</div>}
        </div>
      </div>
      <div style={s.divider} />

      {/* ── Billing blocks ───────────────────────────────────── */}
      <div style={s.billingRow}>
        <div style={s.billingBox}>
          <div style={s.blockLabel}>BILL TO</div>
          <div style={s.blockName}>{data.customer_name || '-'}</div>
          {data.billing_address && <div style={s.blockAddr}>{data.billing_address}</div>}
          {data.gst_number && <div style={s.blockMeta}>GSTIN: {data.gst_number}</div>}
          {data.customer_phone && <div style={s.blockMeta}>Ph: {data.customer_phone}</div>}
        </div>
        <div style={s.billingBox}>
          <div style={s.blockLabel}>SHIP TO</div>
          <div style={s.blockName}>{data.customer_name || '-'}</div>
          {(data.shipping_address || data.billing_address) && (
            <div style={s.blockAddr}>{data.shipping_address || data.billing_address}</div>
          )}
        </div>
      </div>

      {/* ── Items table ──────────────────────────────────────── */}
      <table style={s.table}>
        <thead>
          <tr>
            {['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Total'].map((h) => (
              <th key={h} style={{ ...s.th, textAlign: ['Rate', 'GST Amt', 'Total'].includes(h) ? 'right' : ['#', 'HSN', 'Qty', 'GST%'].includes(h) ? 'center' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const taxable = Number(item.amount || 0);
            const gstAmt  = taxable * Number(item.gst_percent || 0) / 100;
            return (
              <tr key={i} style={i % 2 === 1 ? s.trAlt : {}}>
                <td style={{ ...s.td, textAlign: 'center' }}>{i + 1}</td>
                <td style={s.td}>
                  <div style={{ fontWeight: 500 }}>{item.item_name || '-'}</div>
                  {item.sku && <div style={{ fontSize: 10, color: '#888' }}>SKU: {item.sku}</div>}
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>{item.hsn_code || '-'}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.qty || 0)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(item.rate)}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.gst_percent || 0)}%</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(gstAmt)}</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{fmt(taxable + gstAmt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── GST summary + totals ─────────────────────────────── */}
      <div style={s.summaryRow}>
        {/* GST breakdown */}
        {gstSlabs.length > 0 && (
          <div style={{ flex: 1, marginRight: 24 }}>
            <div style={s.blockLabel}>GST SUMMARY</div>
            <table style={{ ...s.table, marginTop: 4 }}>
              <thead>
                <tr>
                  {['Rate', 'Taxable', 'CGST', 'SGST', 'Total GST'].map((h) => (
                    <th key={h} style={{ ...s.th, textAlign: h === 'Rate' ? 'left' : 'right', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gstSlabs.map((row) => (
                  <tr key={row.pct}>
                    <td style={s.td}>{row.pct}%</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{fmt(row.taxable)}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{fmt(row.gst / 2)}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{fmt(row.gst / 2)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{fmt(row.gst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div style={{ minWidth: 220 }}>
          <table style={{ ...s.table, marginTop: gstSlabs.length > 0 ? 24 : 0 }}>
            <tbody>
              <tr>
                <td style={s.td}>Sub Total</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(subTotal)}</td>
              </tr>
              {totalGst > 0 && (
                <tr>
                  <td style={s.td}>Total GST</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{fmt(totalGst)}</td>
                </tr>
              )}
              {headerDiscount > 0 && (
                <tr>
                  <td style={{ ...s.td, color: '#dc2626' }}>Discount</td>
                  <td style={{ ...s.td, textAlign: 'right', color: '#dc2626' }}>-{fmt(headerDiscount)}</td>
                </tr>
              )}
              {charges > 0 && (
                <tr>
                  <td style={s.td}>Extra Charges</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{fmt(charges)}</td>
                </tr>
              )}
              <tr style={{ background: '#1e3a8a' }}>
                <td style={{ ...s.td, fontWeight: 700, color: '#fff', fontSize: 13 }}>Grand Total</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: '#fff', fontSize: 13 }}>{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delivery / payment terms ─────────────────────────── */}
      {(data.payment_type || data.delivery_type || data.delivery_by || data.delivery_instructions) && (
        <>
          <div style={{ ...s.divider, margin: '16px 0 10px' }} />
          <div style={s.termsRow}>
            {data.payment_type  && <div style={s.termItem}><span style={s.termLabel}>Payment:</span> {data.payment_type}</div>}
            {data.delivery_type && <div style={s.termItem}><span style={s.termLabel}>Delivery:</span> {data.delivery_type}</div>}
            {data.delivery_by   && <div style={s.termItem}><span style={s.termLabel}>Deliver By:</span> {data.delivery_by}</div>}
            {data.delivery_instructions && <div style={{ ...s.termItem, flex: '1 1 100%' }}><span style={s.termLabel}>Instructions:</span> {data.delivery_instructions}</div>}
          </div>
        </>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={s.footer}>
        This is a computer-generated quotation and does not require a signature.
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 12,
    color: '#1a1a1a',
    background: '#fff',
    padding: '32px 40px',
    maxWidth: 860,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyName: { fontSize: 22, fontWeight: 700, color: '#1e3a8a' },
  companyMeta: { fontSize: 11, color: '#555', marginTop: 2 },
  docTitle:    { fontSize: 22, fontWeight: 700, color: '#1e3a8a' },
  docMeta:     { fontSize: 11, color: '#444', marginTop: 2 },
  divider:     { borderTop: '2px solid #1e3a8a', margin: '0 0 12px' },
  billingRow:  { display: 'flex', gap: 24, marginBottom: 16 },
  billingBox:  { flex: 1 },
  blockLabel:  { fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  blockName:   { fontWeight: 600, fontSize: 13 },
  blockAddr:   { fontSize: 11, color: '#555', marginTop: 2 },
  blockMeta:   { fontSize: 11, color: '#555', marginTop: 1 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    background: '#f1f5f9',
    padding: '6px 8px',
    fontWeight: 700,
    fontSize: 11,
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '5px 8px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
  trAlt: { background: '#f8fafc' },
  summaryRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 0,
    alignItems: 'flex-start',
  },
  termsRow:  { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11 },
  termItem:  { color: '#444' },
  termLabel: { fontWeight: 600, color: '#1a1a1a' },
  footer:    { marginTop: 24, fontSize: 9, color: '#aaa', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 },
};

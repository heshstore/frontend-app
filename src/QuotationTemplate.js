/**
 * QuotationTemplate — single source of truth for View, Print, and PDF layout.
 *
 * Props:
 *   data      Quotation record from API (with items[])
 *   wrapClass CSS class on the outer div:
 *               "qp-screen"  → centred A4 card on grey background (View page)
 *               ""           → flush, no wrapper padding (Print page)
 */
import React from 'react';
import { company, bank, hasBankDetails } from './config/company';

/* ── Formatters ─────────────────────────────────────────────────────────── */
const inr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits:  2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/* ── GST slab builder ───────────────────────────────────────────────────── */
function buildGstSlabs(items) {
  const map = {};
  for (const it of items) {
    const taxable = Number(it.amount || 0);
    const pct     = Number(it.gst_percent || 0);
    if (pct <= 0) continue;
    const key = String(pct);
    if (!map[key]) map[key] = { pct, taxable: 0, gst: 0 };
    map[key].taxable += taxable;
    map[key].gst     += (taxable * pct) / 100;
  }
  return Object.values(map).sort((a, b) => a.pct - b.pct);
}

/* ── Print + screen styles (injected once per render) ───────────────────── */
const CSS = `
/* ── Print reset ─────────────────────────────────────────────────── */
@page { size: A4; margin: 0; }

@media print {
  html, body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
  .qp-screen {
    background: none !important;
    padding: 0 !important;
    min-height: unset !important;
    display: block !important;
  }
  .qp-page {
    width: 210mm !important;
    min-height: 297mm !important;
    padding: 11mm 13mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-inside: auto;
  }
  /* Keep totals + footer on same page when possible */
  .qp-summary-row,
  .qp-bank-row,
  .qp-terms { page-break-inside: avoid; }
}

/* ── Screen wrapper (centres the A4 card) ────────────────────────── */
.qp-screen {
  background: #e2e5ea;
  min-height: 100vh;
  padding: 28px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── A4 page card ────────────────────────────────────────────────── */
.qp-page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  box-shadow: 0 3px 32px rgba(0,0,0,.16);
  padding: 11mm 13mm;
  box-sizing: border-box;
  font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 9pt;
  color: #1a1a1a;
  line-height: 1.45;
}

/* ── Dividers ────────────────────────────────────────────────────── */
.qp-rule      { border: none; border-top: 1.75pt solid #1e3a8a; margin: 5pt 0 7pt; }
.qp-rule-slim { border: none; border-top: 0.5pt solid #cbd5e1;  margin: 3pt 0; }

/* ── Header ──────────────────────────────────────────────────────── */
.qp-hdr {
  display: flex;
  align-items: flex-start;
  gap: 8pt;
  margin-bottom: 3pt;
}
.qp-co-block  { flex: 1 1 0; min-width: 0; }
.qp-co-name   { font-size: 15pt; font-weight: 700; color: #1e3a8a; line-height: 1.1; }
.qp-co-meta   { font-size: 7.5pt; color: #475569; margin-top: 3pt; line-height: 1.65; }
.qp-title-col {
  flex: 0 0 auto;
  text-align: center;
  padding: 0 10pt;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.qp-doc-title {
  font-size: 12pt;
  font-weight: 700;
  letter-spacing: 1pt;
  color: #1e3a8a;
  text-transform: uppercase;
  border: 2pt solid #1e3a8a;
  padding: 5pt 14pt;
  white-space: nowrap;
}
.qp-logo-col  { flex: 0 0 64pt; text-align: right; }
.qp-logo-col img {
  max-width: 64pt;
  max-height: 48pt;
  object-fit: contain;
}

/* ── 3-column billing block ──────────────────────────────────────── */
.qp-info-grid {
  display: grid;
  grid-template-columns: 5fr 5fr 4fr;
  border: 0.75pt solid #94a3b8;
  margin-bottom: 7pt;
}
.qp-info-col { padding: 6pt 8pt; }
.qp-info-col + .qp-info-col { border-left: 0.75pt solid #94a3b8; }

.qp-block-label {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.4pt;
  color: #64748b;
  margin-bottom: 4pt;
  border-bottom: 0.5pt solid #e2e8f0;
  padding-bottom: 2pt;
}
.qp-cust-name { font-size: 9.5pt; font-weight: 700; color: #0f172a; }
.qp-addr-line {
  font-size: 7.5pt;
  color: #475569;
  line-height: 1.55;
  margin-top: 2pt;
  word-break: break-word;
}
.qp-meta-row  {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4pt;
  font-size: 8pt;
  padding: 2pt 0;
}
.qp-meta-key { color: #64748b; font-weight: 600; white-space: nowrap; }
.qp-meta-val { font-weight: 600; text-align: right; }

/* ── Items table ─────────────────────────────────────────────────── */
.qp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  margin-bottom: 4pt;
  table-layout: fixed;
}
.qp-table col.c-no   { width: 4%; }
.qp-table col.c-desc { width: 34%; }
.qp-table col.c-hsn  { width: 9%; }
.qp-table col.c-qty  { width: 6%; }
.qp-table col.c-rate { width: 13%; }
.qp-table col.c-gst  { width: 8%; }
.qp-table col.c-gamt { width: 13%; }
.qp-table col.c-amt  { width: 13%; }
.qp-table th {
  background: #1e3a8a;
  color: #fff;
  padding: 5pt 5pt;
  font-size: 7.5pt;
  font-weight: 600;
  white-space: nowrap;
  border-right: 0.5pt solid rgba(255,255,255,.15);
}
.qp-table th:last-child { border-right: none; }
.qp-table td {
  padding: 4pt 5pt;
  border-bottom: 0.5pt solid #e8ecf0;
  vertical-align: top;
  overflow-wrap: break-word;
  word-break: break-word;
}
.qp-table tbody tr:nth-child(even) td { background: #f8fafc; }
.qp-table tbody tr:last-child td { border-bottom: 1pt solid #94a3b8; }
.qp-item-name { font-weight: 600; color: #0f172a; }
.qp-item-sku  { font-size: 7pt; color: #94a3b8; margin-top: 1pt; }
.ta-r { text-align: right; }
.ta-c { text-align: center; }
.ta-l { text-align: left; }

/* ── Totals area ─────────────────────────────────────────────────── */
.qp-summary-row {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 14pt;
  margin: 4pt 0 8pt;
}
.qp-gst-box { flex: 1 1 0; min-width: 0; }

.qp-gst-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
.qp-gst-table th {
  background: #f1f5f9;
  color: #475569;
  padding: 3pt 5pt;
  font-size: 7.5pt;
  font-weight: 700;
  border-bottom: 0.75pt solid #cbd5e1;
}
.qp-gst-table td {
  padding: 2.5pt 5pt;
  border-bottom: 0.4pt solid #e8ecf0;
  font-size: 8pt;
}

.qp-totals-box { min-width: 195pt; }
.qp-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.5pt 5pt;
  border-bottom: 0.4pt solid #e8ecf0;
  font-size: 8.5pt;
}
.qp-total-key { color: #475569; }
.qp-total-val { text-align: right; min-width: 72pt; font-variant-numeric: tabular-nums; }
.qp-disc-val  { color: #dc2626; }
.qp-grand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5pt 6pt;
  background: #1e3a8a;
  color: #fff;
  font-size: 11pt;
  font-weight: 700;
  margin-top: 2pt;
  letter-spacing: 0.2pt;
}

/* ── Bank details ────────────────────────────────────────────────── */
.qp-bank-row {
  display: flex;
  align-items: flex-start;
  gap: 12pt;
  padding: 7pt 0 6pt;
  border-top: 0.75pt solid #94a3b8;
  margin-top: 4pt;
}
.qp-bank-section { flex: 1 1 0; min-width: 0; }
.qp-bank-title {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.4pt;
  color: #64748b;
  margin-bottom: 4pt;
  border-bottom: 0.5pt solid #e2e8f0;
  padding-bottom: 2pt;
}
.qp-bank-line { display: flex; gap: 6pt; font-size: 8pt; padding: 1.5pt 0; }
.qp-bank-key  { color: #64748b; font-weight: 600; min-width: 48pt; }

/* ── Delivery instructions ───────────────────────────────────────── */
.qp-delivery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4pt 12pt;
  font-size: 8pt;
  padding: 6pt 0 4pt;
  border-top: 0.75pt solid #94a3b8;
  margin-top: 4pt;
}
.qp-dl-key { font-weight: 700; color: #475569; }
.qp-dl-full { grid-column: 1 / -1; }

/* ── Terms ───────────────────────────────────────────────────────── */
.qp-terms {
  border-top: 0.75pt solid #94a3b8;
  padding-top: 6pt;
  margin-top: 6pt;
  font-size: 7.5pt;
  color: #475569;
  line-height: 1.6;
}
.qp-terms-title {
  font-size: 8pt;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 3pt;
}
.qp-footer-note {
  margin-top: 12pt;
  text-align: center;
  font-size: 7pt;
  color: #94a3b8;
  border-top: 0.4pt solid #e2e8f0;
  padding-top: 5pt;
}

/* ── Responsive — mobile scrolls the A4 card horizontally ───────── */
@media (max-width: 780px) {
  .qp-screen { padding: 0; background: #e2e5ea; }
  .qp-page {
    width: 100%;
    min-height: unset;
    padding: 14px;
    box-shadow: none;
    font-size: 8pt;
  }
  .qp-co-name  { font-size: 13pt; }
  .qp-doc-title{ font-size: 10pt; padding: 4pt 10pt; }
  .qp-info-grid{ grid-template-columns: 1fr; }
  .qp-info-col + .qp-info-col { border-left: none; border-top: 0.75pt solid #94a3b8; }
  .qp-summary-row { flex-direction: column; }
  .qp-gst-box     { width: 100%; }
  .qp-totals-box  { min-width: 100%; }
  .qp-delivery-grid { grid-template-columns: 1fr; }
  .qp-table { font-size: 7.5pt; }
  .qp-table th, .qp-table td { padding: 3pt 4pt; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function QuotationTemplate({ data, wrapClass = 'qp-screen' }) {
  if (!data) return null;

  const items       = data.items || [];
  const gstSlabs    = buildGstSlabs(items);
  const totalGst    = gstSlabs.reduce((s, r) => s + r.gst, 0);
  const subTotal    = Number(data.sub_total || 0);
  const discType    = data.discount_type || 'PERCENT';
  const discValue   = Number(data.discount_value || 0);
  const headerDisc  = discType === 'FLAT' ? discValue : (subTotal * discValue) / 100;
  const chargePack  = Number(data.charges_packing      || 0);
  const chargeCar   = Number(data.charges_cartage      || 0);
  const chargeFwd   = Number(data.charges_forwarding   || 0);
  const chargeInst  = Number(data.charges_installation || 0);
  const chargeLoad  = Number(data.charges_loading      || 0);
  const grandTotal  = Number(data.total_amount || 0);

  const hasDelivery = data.payment_type || data.delivery_type || data.delivery_by || data.delivery_instructions;

  return (
    <div className={wrapClass}>
      <style>{CSS}</style>

      <div className="qp-page">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="qp-hdr">
          <div className="qp-co-block">
            <div className="qp-co-name">{company.name}</div>
            <div className="qp-co-meta">
              {company.address && <div>{company.address}</div>}
              {company.state   && !company.address && <div>State: {company.state}</div>}
              {(company.phone || company.email) && (
                <div>
                  {company.phone && <>Ph: {company.phone}</>}
                  {company.phone && company.email && '  ·  '}
                  {company.email && <>{company.email}</>}
                </div>
              )}
              {company.gstin && <div>GSTIN: <strong>{company.gstin}</strong></div>}
            </div>
          </div>

          <div className="qp-title-col">
            <div className="qp-doc-title">Proforma Invoice</div>
          </div>

          <div className="qp-logo-col">
            <img
              src={company.logoUrl}
              alt="Logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        <hr className="qp-rule" />

        {/* ── 3-column: Bill To | Delivery To | Document Details ────── */}
        <div className="qp-info-grid">
          {/* Bill To */}
          <div className="qp-info-col">
            <div className="qp-block-label">Bill To</div>
            <div className="qp-cust-name">{data.customer_name || '—'}</div>
            {data.billing_address && (
              <div className="qp-addr-line">{data.billing_address}</div>
            )}
            {data.gst_number && (
              <div className="qp-addr-line">GSTIN: <strong>{data.gst_number}</strong></div>
            )}
            {data.customer_phone && (
              <div className="qp-addr-line">Ph: {data.customer_phone}</div>
            )}
          </div>

          {/* Delivery To */}
          <div className="qp-info-col">
            <div className="qp-block-label">Delivery To</div>
            <div className="qp-cust-name">{data.customer_name || '—'}</div>
            {(data.shipping_address || data.billing_address) && (
              <div className="qp-addr-line">
                {data.shipping_address || data.billing_address}
              </div>
            )}
          </div>

          {/* Document meta */}
          <div className="qp-info-col">
            <div className="qp-block-label">Document Details</div>
            <div className="qp-meta-row">
              <span className="qp-meta-key">PI No.</span>
              <span className="qp-meta-val">{data.quotation_no || '—'}</span>
            </div>
            <hr className="qp-rule-slim" />
            <div className="qp-meta-row">
              <span className="qp-meta-key">Date</span>
              <span className="qp-meta-val">{fmtDate(data.created_at)}</span>
            </div>
            {data.valid_till && (
              <div className="qp-meta-row">
                <span className="qp-meta-key">Valid till</span>
                <span className="qp-meta-val">{fmtDate(data.valid_till)}</span>
              </div>
            )}
            {data.payment_type && (
              <div className="qp-meta-row">
                <span className="qp-meta-key">Payment</span>
                <span className="qp-meta-val">{data.payment_type}</span>
              </div>
            )}
            <div className="qp-meta-row">
              <span className="qp-meta-key">Customer type</span>
              <span className="qp-meta-val">{data.is_wholesaler ? 'Wholesale' : 'Retail'}</span>
            </div>
          </div>
        </div>

        {/* ── Items table ───────────────────────────────────────────── */}
        <table className="qp-table">
          <colgroup>
            <col className="c-no"   />
            <col className="c-desc" />
            <col className="c-hsn"  />
            <col className="c-qty"  />
            <col className="c-rate" />
            <col className="c-gst"  />
            <col className="c-gamt" />
            <col className="c-amt"  />
          </colgroup>
          <thead>
            <tr>
              <th className="ta-c">#</th>
              <th className="ta-l">Description</th>
              <th className="ta-c">HSN</th>
              <th className="ta-c">Qty</th>
              <th className="ta-r">Rate (₹)</th>
              <th className="ta-c">GST%</th>
              <th className="ta-r">GST amt</th>
              <th className="ta-r">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '14pt' }}>
                  No items
                </td>
              </tr>
            ) : items.map((it, i) => {
              const taxable = Number(it.amount || 0);
              const gstPct  = Number(it.gst_percent || 0);
              const gstAmt  = taxable * gstPct / 100;
              return (
                <tr key={i}>
                  <td className="ta-c" style={{ color: '#64748b' }}>{i + 1}</td>
                  <td>
                    <div className="qp-item-name">{it.item_name || '—'}</div>
                    {it.sku && <div className="qp-item-sku">SKU: {it.sku}</div>}
                  </td>
                  <td className="ta-c" style={{ color: '#64748b' }}>{it.hsn_code || '—'}</td>
                  <td className="ta-c">{Number(it.qty || 0)}</td>
                  <td className="ta-r">{inr(it.rate)}</td>
                  <td className="ta-c">{gstPct}%</td>
                  <td className="ta-r" style={{ color: '#475569' }}>{inr(gstAmt)}</td>
                  <td className="ta-r" style={{ fontWeight: 600 }}>{inr(taxable + gstAmt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── GST summary + Totals ──────────────────────────────────── */}
        <div className="qp-summary-row">

          {/* GST breakdown — shown only when there are GST slabs */}
          {gstSlabs.length > 0 && (
            <div className="qp-gst-box">
              <table className="qp-gst-table">
                <thead>
                  <tr>
                    <th className="ta-l">Rate</th>
                    <th className="ta-r">Taxable</th>
                    <th className="ta-r">CGST</th>
                    <th className="ta-r">SGST</th>
                    <th className="ta-r" style={{ fontWeight: 700 }}>Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  {gstSlabs.map((row) => (
                    <tr key={row.pct}>
                      <td>{row.pct}%</td>
                      <td className="ta-r">{inr(row.taxable)}</td>
                      <td className="ta-r">{inr(row.gst / 2)}</td>
                      <td className="ta-r">{inr(row.gst / 2)}</td>
                      <td className="ta-r" style={{ fontWeight: 600 }}>{inr(row.gst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals box */}
          <div className="qp-totals-box">
            <div className="qp-total-row">
              <span className="qp-total-key">Sub total</span>
              <span className="qp-total-val">{inr(subTotal)}</span>
            </div>
            {totalGst > 0 && (
              <div className="qp-total-row">
                <span className="qp-total-key">Total GST</span>
                <span className="qp-total-val">{inr(totalGst)}</span>
              </div>
            )}
            {headerDisc > 0 && (
              <div className="qp-total-row">
                <span className="qp-total-key">
                  Discount{discType === 'PERCENT' && discValue > 0 ? ` (${discValue}%)` : ''}
                </span>
                <span className="qp-total-val qp-disc-val">−{inr(headerDisc)}</span>
              </div>
            )}
            {chargePack  > 0 && <div className="qp-total-row"><span className="qp-total-key">Packing</span><span className="qp-total-val">{inr(chargePack)}</span></div>}
            {chargeCar   > 0 && <div className="qp-total-row"><span className="qp-total-key">Cartage</span><span className="qp-total-val">{inr(chargeCar)}</span></div>}
            {chargeFwd   > 0 && <div className="qp-total-row"><span className="qp-total-key">Forwarding</span><span className="qp-total-val">{inr(chargeFwd)}</span></div>}
            {chargeInst  > 0 && <div className="qp-total-row"><span className="qp-total-key">Installation</span><span className="qp-total-val">{inr(chargeInst)}</span></div>}
            {chargeLoad  > 0 && <div className="qp-total-row"><span className="qp-total-key">Loading</span><span className="qp-total-val">{inr(chargeLoad)}</span></div>}
            <div className="qp-grand-row">
              <span>Grand Total</span>
              <span>{inr(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Bank details ──────────────────────────────────────────── */}
        {hasBankDetails && (
          <div className="qp-bank-row">
            <div className="qp-bank-section">
              <div className="qp-bank-title">Bank Details</div>
              {bank.name    && <div className="qp-bank-line"><span className="qp-bank-key">Bank</span><span>{bank.name}</span></div>}
              {bank.account && <div className="qp-bank-line"><span className="qp-bank-key">A/C No.</span><span>{bank.account}</span></div>}
              {bank.ifsc    && <div className="qp-bank-line"><span className="qp-bank-key">IFSC</span><span>{bank.ifsc}</span></div>}
              {bank.branch  && <div className="qp-bank-line"><span className="qp-bank-key">Branch</span><span>{bank.branch}</span></div>}
            </div>
          </div>
        )}

        {/* ── Delivery / payment instructions ───────────────────────── */}
        {hasDelivery && (
          <div className="qp-delivery-grid">
            {data.delivery_type && (
              <div><span className="qp-dl-key">Delivery mode: </span>{data.delivery_type}</div>
            )}
            {data.delivery_by && (
              <div><span className="qp-dl-key">Deliver by: </span>{data.delivery_by}</div>
            )}
            {data.payment_type && (
              <div><span className="qp-dl-key">Payment terms: </span>{data.payment_type}</div>
            )}
            {data.delivery_instructions && (
              <div className="qp-dl-full">
                <span className="qp-dl-key">Instructions: </span>{data.delivery_instructions}
              </div>
            )}
          </div>
        )}

        {/* ── Terms & Conditions ────────────────────────────────────── */}
        <div className="qp-terms">
          <div className="qp-terms-title">Terms &amp; Conditions</div>
          <div>
            1. Prices are valid for the stated period and subject to revision upon expiry.
            {company.state ? ` GST applicable as per ${company.state} norms.` : ''}
          </div>
          <div>2. Payment as per agreed terms. Goods remain the property of seller until full payment is received.</div>
          <div>3. All disputes are subject to local jurisdiction only. E &amp; O.E.</div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="qp-footer-note">
          This is a computer-generated document. No signature required.
        </div>

      </div>{/* .qp-page */}
    </div>
  );
}

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

/* ── Amount in words (Indian format) ───────────────────────────────────── */
const _ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const _tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function _u100(n) {
  return n < 20 ? _ones[n] : _tens[Math.floor(n / 10)] + (n % 10 ? ' ' + _ones[n % 10] : '');
}
function _u1000(n) {
  if (n < 100) return _u100(n);
  return _ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + _u100(n % 100) : '');
}

function amountInWords(amount) {
  const n     = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - n) * 100);
  if (n === 0 && paise === 0) return 'Zero Rupees Only';
  const cr  = Math.floor(n / 10000000);
  const lk  = Math.floor((n % 10000000) / 100000);
  const th  = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;
  let w = '';
  if (cr)  w += _u1000(cr) + ' Crore ';
  if (lk)  w += _u100(lk)  + ' Lakh ';
  if (th)  w += _u100(th)  + ' Thousand ';
  if (rem) w += _u1000(rem);
  w = w.trim() + ' Rupees';
  if (paise > 0) w += ' and ' + _u100(paise) + ' Paise';
  return w + ' Only';
}

/* ── Print + screen styles ──────────────────────────────────────────────── */
const CSS = `
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
    padding: 10mm 13mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-inside: auto;
  }
  .qp-totals-section,
  .qp-bottom-grid,
  .qp-cg-line,
  .qp-footer { page-break-inside: avoid; }
}

.qp-screen {
  background: #e2e5ea;
  min-height: 100vh;
  padding: 28px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qp-page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  box-shadow: 0 3px 32px rgba(0,0,0,.16);
  padding: 10mm 13mm;
  box-sizing: border-box;
  font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 9pt;
  color: #1a1a1a;
  line-height: 1.45;
}

/* ── Utilities ───────────────────────────────────────────────────────────── */
.qp-rule      { border: none; border-top: 1.75pt solid #005fb8; margin: 5pt 0 7pt; }
.qp-rule-slim { border: none; border-top: 0.5pt solid #cbd5e1;  margin: 2pt 0; }
.ta-r { text-align: right; }
.ta-c { text-align: center; }
.ta-l { text-align: left; }

/* ── Header ──────────────────────────────────────────────────────────────── */
.qp-hdr {
  display: flex;
  align-items: flex-start;
  gap: 6pt;
  margin-bottom: 3pt;
}
.qp-co-block  { flex: 1 1 0; min-width: 0; }
.qp-co-name   { font-size: 15pt; font-weight: 700; color: #005fb8; line-height: 1.1; }
.qp-co-meta   { font-size: 7.5pt; color: #475569; margin-top: 3pt; line-height: 1.65; }

.qp-title-col {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 8pt;
}
.qp-doc-title {
  font-size: 12pt;
  font-weight: 700;
  letter-spacing: 1pt;
  color: #005fb8;
  text-transform: uppercase;
  border: 2pt solid #005fb8;
  padding: 5pt 14pt;
  white-space: nowrap;
}

.qp-right-col {
  flex: 0 0 80pt;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5pt;
}
.qp-right-col img {
  max-width: 72pt;
  max-height: 48pt;
  object-fit: contain;
}
.qp-pi-details { width: 100%; font-size: 7.5pt; }
.qp-pi-row {
  display: flex;
  justify-content: space-between;
  padding: 1.5pt 0;
  border-bottom: 0.4pt solid #e2e8f0;
}
.qp-pi-key { color: #64748b; font-weight: 600; }
.qp-pi-val { font-weight: 700; color: #0f172a; text-align: right; }

/* ── 3-column billing block ──────────────────────────────────────────────── */
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
  text-transform: uppercase;
}
.qp-cust-name { font-size: 9.5pt; font-weight: 700; color: #0f172a; }
.qp-addr-line {
  font-size: 7.5pt;
  color: #475569;
  line-height: 1.55;
  margin-top: 2pt;
  word-break: break-word;
}
.qp-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4pt;
  font-size: 8pt;
  padding: 2pt 0;
}
.qp-meta-key { color: #64748b; font-weight: 600; white-space: nowrap; }
.qp-meta-val { font-weight: 600; text-align: right; }

/* ── Items table (9 cols) ────────────────────────────────────────────────── */
.qp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 4pt;
  table-layout: fixed;
}
.qp-table col.c-no    { width: 4%; }
.qp-table col.c-photo { width: 6%; }
.qp-table col.c-name  { width: 28%; }
.qp-table col.c-instr { width: 17%; }
.qp-table col.c-gst   { width: 6%; }
.qp-table col.c-disc  { width: 7%; }
.qp-table col.c-qty   { width: 6%; }
.qp-table col.c-rate  { width: 12%; }
.qp-table col.c-amt   { width: 14%; }
.qp-table th {
  background: #005fb8;
  color: #fff;
  padding: 5pt 4pt;
  font-size: 7.5pt;
  font-weight: 600;
  white-space: nowrap;
  border-right: 0.5pt solid rgba(255,255,255,.15);
}
.qp-table th:last-child { border-right: none; }
.qp-table td {
  padding: 4pt 4pt;
  border-bottom: 0.5pt solid #e8ecf0;
  vertical-align: top;
  overflow-wrap: break-word;
  word-break: break-word;
}
.qp-table tbody tr:nth-child(even) td { background: #f8fafc; }
.qp-table tbody tr:last-child td { border-bottom: 1pt solid #94a3b8; }
.qp-item-name { font-weight: 600; color: #0f172a; }
.qp-item-sku  { font-size: 7pt; color: #94a3b8; margin-top: 1pt; }
.qp-photo-placeholder {
  width: 28pt; height: 28pt;
  background: #f1f5f9;
  border: 0.5pt solid #e2e8f0;
  border-radius: 2pt;
  display: flex; align-items: center; justify-content: center;
  font-size: 6pt; color: #cbd5e1;
}

/* ── Totals section ──────────────────────────────────────────────────────── */
.qp-totals-section {
  display: flex;
  gap: 10pt;
  margin: 4pt 0 8pt;
  align-items: flex-start;
}
.qp-words-box {
  flex: 1 1 0; min-width: 0;
  border: 0.75pt solid #e2e8f0;
  border-radius: 4pt;
  padding: 7pt 9pt;
  background: #f8fafc;
  font-size: 8pt;
}
.qp-words-label {
  font-size: 7pt; font-weight: 700; color: #64748b;
  letter-spacing: 0.3pt; text-transform: uppercase;
  margin-bottom: 4pt;
}
.qp-words-text { font-style: italic; color: #1a1a1a; font-size: 8.5pt; line-height: 1.5; }

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
  background: #005fb8;
  color: #fff;
  font-size: 11pt;
  font-weight: 700;
  margin-top: 2pt;
  letter-spacing: 0.2pt;
}

/* ── Payment Terms Bar ───────────────────────────────────────────────────── */
.qp-terms-bar {
  border: 1.25pt solid #005fb8;
  border-radius: 3pt;
  padding: 6pt 12pt;
  margin: 6pt 0 8pt;
  text-align: center;
  color: #005fb8;
  font-size: 8.5pt;
}
.qp-terms-bar-label {
  font-size: 7pt; font-weight: 700;
  letter-spacing: 0.5pt; text-transform: uppercase;
  margin-bottom: 3pt; opacity: 0.75;
}
.qp-terms-bar-text { font-weight: 700; font-size: 9pt; }

/* ── Bottom 2-col grid (Bank | T&C) ─────────────────────────────────────── */
.qp-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12pt;
  border-top: 0.75pt solid #94a3b8;
  padding-top: 7pt;
  margin-top: 4pt;
}
.qp-section-label {
  font-size: 7pt; font-weight: 700; letter-spacing: 0.4pt;
  color: #64748b; text-transform: uppercase;
  margin-bottom: 5pt; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 2pt;
}

/* Bank details inner layout */
.qp-bank-inner { display: flex; gap: 8pt; align-items: flex-start; }
.qp-bank-qr img {
  width: 60pt; height: 60pt; object-fit: contain;
  border: 0.5pt solid #e2e8f0; border-radius: 3pt;
}
.qp-bank-rows { flex: 1 1 0; min-width: 0; }
.qp-bank-line { display: flex; gap: 5pt; font-size: 7.5pt; padding: 1.5pt 0; }
.qp-bank-key  { color: #64748b; font-weight: 600; min-width: 52pt; flex-shrink: 0; }

/* T&C */
.qp-tc-list { font-size: 7.5pt; color: #475569; line-height: 1.65; }
.qp-tc-list li { margin-bottom: 2pt; }

/* ── Computer-generated line ─────────────────────────────────────────────── */
.qp-cg-line {
  margin-top: 10pt;
  text-align: center;
  font-size: 7.5pt;
  color: #94a3b8;
  font-style: italic;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.qp-footer {
  margin-top: 8pt;
  padding-top: 5pt;
  border-top: 0.4pt solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 7.5pt;
  color: #64748b;
}
.qp-footer-thanks { font-weight: 600; color: #005fb8; }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 780px) {
  .qp-screen { padding: 0; background: #e2e5ea; }
  .qp-page {
    width: 100%;
    min-height: unset;
    padding: 14px;
    box-shadow: none;
    font-size: 8pt;
  }
  .qp-co-name   { font-size: 13pt; }
  .qp-doc-title { font-size: 10pt; padding: 4pt 10pt; }
  .qp-info-grid { grid-template-columns: 1fr; }
  .qp-info-col + .qp-info-col { border-left: none; border-top: 0.75pt solid #94a3b8; }
  .qp-totals-section { flex-direction: column; }
  .qp-totals-box { min-width: 100%; }
  .qp-bottom-grid { grid-template-columns: 1fr; }
  .qp-table { font-size: 7pt; }
  .qp-table th, .qp-table td { padding: 3pt 3pt; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function QuotationTemplate({ data, wrapClass = 'qp-screen' }) {
  if (!data) return null;

  const items      = data.items || [];
  const subTotal   = Number(data.sub_total || 0);
  const discType   = data.discount_type  || 'PERCENT';
  const discValue  = Number(data.discount_value  || 0);
  const headerDisc = discType === 'FLAT' ? discValue : (subTotal * discValue) / 100;
  const taxable    = subTotal - headerDisc;

  const totalGst   = items.reduce((s, it) => {
    const base = Number(it.amount || 0);
    const pct  = Number(it.gst_percent || 0);
    return s + (base * pct) / 100;
  }, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

  const chargePack = Number(data.charges_packing      || 0);
  const chargeCar  = Number(data.charges_cartage      || 0);
  const chargeFwd  = Number(data.charges_forwarding   || 0);
  const chargeInst = Number(data.charges_installation || 0);
  const chargeLoad = Number(data.charges_loading      || 0);

  const grandTotal = Number(data.total_amount || 0);

  const payTerms = company.paymentTerms || data.payment_type || '';

  return (
    <div className={wrapClass}>
      <style>{CSS}</style>

      <div className="qp-page">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="qp-hdr">

          {/* LEFT: company info */}
          <div className="qp-co-block">
            <div className="qp-co-name">{company.name}</div>
            <div className="qp-co-meta">
              {company.address && <div>{company.address}</div>}
              {!company.address && company.state && <div>State: {company.state}</div>}
              {(company.phone || company.email) && (
                <div>
                  {company.phone && <>Ph: {company.phone}</>}
                  {company.phone && company.email && '  ·  '}
                  {company.email && <>{company.email}</>}
                </div>
              )}
              {company.website && <div>{company.website}</div>}
              {company.gstin && <div>GSTIN: <strong>{company.gstin}</strong></div>}
            </div>
          </div>

          {/* CENTER: document title */}
          <div className="qp-title-col">
            <div className="qp-doc-title">Proforma Invoice</div>
          </div>

          {/* RIGHT: logo + PI details */}
          <div className="qp-right-col">
            <img
              src={company.logoUrl}
              alt="Logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="qp-pi-details">
              <div className="qp-pi-row">
                <span className="qp-pi-key">PI No.</span>
                <span className="qp-pi-val">{data.quotation_no || '—'}</span>
              </div>
              <div className="qp-pi-row">
                <span className="qp-pi-key">PI Date</span>
                <span className="qp-pi-val">{fmtDate(data.created_at)}</span>
              </div>
              {data.valid_till && (
                <div className="qp-pi-row">
                  <span className="qp-pi-key">Valid Till</span>
                  <span className="qp-pi-val">{fmtDate(data.valid_till)}</span>
                </div>
              )}
              {data.sales_person && (
                <div className="qp-pi-row">
                  <span className="qp-pi-key">Sales Man</span>
                  <span className="qp-pi-val">{data.sales_person}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        <hr className="qp-rule" />

        {/* ── 3-col: Bill To | Delivery To | Delivery Details ──────── */}
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

          {/* Delivery Details */}
          <div className="qp-info-col">
            <div className="qp-block-label">Delivery Details</div>
            {data.booking_at && (
              <div className="qp-meta-row">
                <span className="qp-meta-key">Booking At</span>
                <span className="qp-meta-val">{data.booking_at}</span>
              </div>
            )}
            <div className="qp-meta-row">
              <span className="qp-meta-key">Goods Sent By</span>
              <span className="qp-meta-val">{data.delivery_by || '—'}</span>
            </div>
            <div className="qp-meta-row">
              <span className="qp-meta-key">Payment Mode</span>
              <span className="qp-meta-val">{data.payment_type || '—'}</span>
            </div>
            {data.delivery_instructions && (
              <div style={{ marginTop: 4 }}>
                <div className="qp-meta-key" style={{ fontSize: '7pt', marginBottom: 2 }}>Instructions</div>
                <div style={{ fontSize: '7.5pt', color: '#475569', lineHeight: 1.5 }}>
                  {data.delivery_instructions}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Items table (9 columns) ──────────────────────────────── */}
        <table className="qp-table">
          <colgroup>
            <col className="c-no"    />
            <col className="c-photo" />
            <col className="c-name"  />
            <col className="c-instr" />
            <col className="c-gst"   />
            <col className="c-disc"  />
            <col className="c-qty"   />
            <col className="c-rate"  />
            <col className="c-amt"   />
          </colgroup>
          <thead>
            <tr>
              <th className="ta-c">#</th>
              <th className="ta-c">Photo</th>
              <th className="ta-l">Item No / Name</th>
              <th className="ta-l">Instructions</th>
              <th className="ta-c">GST%</th>
              <th className="ta-c">Disc.</th>
              <th className="ta-c">Qty</th>
              <th className="ta-r">Rate (₹)</th>
              <th className="ta-r">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '14pt' }}>
                  No items
                </td>
              </tr>
            ) : items.map((it, i) => {
              const base   = Number(it.amount || 0);
              const gstPct = Number(it.gst_percent || 0);
              const gstAmt = (base * gstPct) / 100;
              const total  = base + gstAmt;
              const disc   = it.discount_percent
                ? `${it.discount_percent}%`
                : it.discount_value
                  ? inr(it.discount_value)
                  : '—';
              return (
                <tr key={i}>
                  <td className="ta-c" style={{ color: '#64748b' }}>{i + 1}</td>
                  <td className="ta-c">
                    {it.image_url ? (
                      <img
                        src={it.image_url}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 2 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="qp-photo-placeholder">IMG</div>
                    )}
                  </td>
                  <td>
                    <div className="qp-item-name">{it.item_name || '—'}</div>
                    {it.sku && <div className="qp-item-sku">{it.sku}</div>}
                  </td>
                  <td style={{ fontSize: '7.5pt', color: '#475569' }}>
                    {it.instructions || it.notes || '—'}
                  </td>
                  <td className="ta-c">{gstPct > 0 ? `${gstPct}%` : '—'}</td>
                  <td className="ta-c">{disc}</td>
                  <td className="ta-c">{Number(it.qty || 0)}</td>
                  <td className="ta-r">{inr(it.rate)}</td>
                  <td className="ta-r" style={{ fontWeight: 600 }}>{inr(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Totals: Amount in Words | Breakdown ─────────────────── */}
        <div className="qp-totals-section">

          {/* LEFT: amount in words */}
          <div className="qp-words-box">
            <div className="qp-words-label">Amount in Words</div>
            <div className="qp-words-text">{amountInWords(grandTotal)}</div>
          </div>

          {/* RIGHT: totals breakdown */}
          <div className="qp-totals-box">
            <div className="qp-total-row">
              <span className="qp-total-key">Sub Total</span>
              <span className="qp-total-val">{inr(subTotal)}</span>
            </div>
            {headerDisc > 0 && (
              <div className="qp-total-row">
                <span className="qp-total-key">
                  Discount{discType === 'PERCENT' && discValue > 0 ? ` (${discValue}%)` : ''}
                </span>
                <span className="qp-total-val qp-disc-val">−{inr(headerDisc)}</span>
              </div>
            )}
            <div className="qp-total-row">
              <span className="qp-total-key">Taxable Amount</span>
              <span className="qp-total-val">{inr(taxable)}</span>
            </div>
            {cgst > 0 && (
              <div className="qp-total-row">
                <span className="qp-total-key">CGST</span>
                <span className="qp-total-val">{inr(cgst)}</span>
              </div>
            )}
            {sgst > 0 && (
              <div className="qp-total-row">
                <span className="qp-total-key">SGST</span>
                <span className="qp-total-val">{inr(sgst)}</span>
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

        {/* ── Payment Terms Bar ────────────────────────────────────── */}
        {payTerms && (
          <div className="qp-terms-bar">
            <div className="qp-terms-bar-label">Payment Terms</div>
            <div className="qp-terms-bar-text">{payTerms}</div>
          </div>
        )}

        {/* ── Bottom: Bank Details | Terms & Conditions ────────────── */}
        <div className="qp-bottom-grid">

          {/* Bank Details */}
          <div>
            <div className="qp-section-label">Bank Details</div>
            <div className="qp-bank-inner">
              {bank.qrUrl && (
                <div className="qp-bank-qr">
                  <img
                    src={bank.qrUrl}
                    alt="QR"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="qp-bank-rows">
                {bank.accountName && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">Acc. Name</span>
                    <span>{bank.accountName}</span>
                  </div>
                )}
                {bank.name && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">Bank</span>
                    <span>{bank.name}</span>
                  </div>
                )}
                {bank.branch && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">Branch</span>
                    <span>{bank.branch}</span>
                  </div>
                )}
                {bank.account && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">A/C No.</span>
                    <span>{bank.account}</span>
                  </div>
                )}
                {bank.ifsc && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">IFSC</span>
                    <span>{bank.ifsc}</span>
                  </div>
                )}
                {bank.upiId && (
                  <div className="qp-bank-line">
                    <span className="qp-bank-key">UPI</span>
                    <span>{bank.upiId}</span>
                  </div>
                )}
                {!hasBankDetails && (
                  <div style={{ fontSize: '7.5pt', color: '#94a3b8' }}>
                    Bank details not configured.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <div className="qp-section-label">Terms &amp; Conditions</div>
            <ol className="qp-tc-list">
              <li>All disputes are subject to Chennai jurisdiction only.</li>
              <li>Payment as per agreed terms. Goods remain the property of seller until full payment is received.</li>
              <li>Delivery charges and risks are borne by the buyer unless otherwise agreed.</li>
              <li>Transport / freight charges are additional unless explicitly included in this quotation.</li>
              <li>Prices are subject to change without prior notice for delayed orders. E.&amp;O.E.</li>
            </ol>
          </div>

        </div>

        {/* ── Computer-generated line ──────────────────────────────── */}
        <div className="qp-cg-line">
          This is a Computer Generated Quotation
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="qp-footer">
          <span className="qp-footer-thanks">Thank you for your business!</span>
          <span>Page 1 of 1</span>
        </div>

      </div>{/* .qp-page */}
    </div>
  );
}

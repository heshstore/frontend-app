/** Shared formatters and helpers for order/quotation document templates. */

import { API_URL } from '../config';

/** Item photos are normally absolute (Shopify CDN or backend-resolved
 * /uploads path), but prefix defensively in case a relative path slips
 * through from stale cached data. */
export const resolveImageUrl = (url) => {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${API_URL}${url}`;
};

export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits:  2,
    maximumFractionDigits: 2,
  })}`;

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

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

export function amountInWords(amount) {
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

/** Shared CSS for both Quotation and Order document templates. */
export const DOC_TEMPLATE_CSS = `
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

.qp-rule      { border: none; border-top: 1.75pt solid #005fb8; margin: 5pt 0 7pt; }
.qp-rule-slim { border: none; border-top: 0.5pt solid #cbd5e1;  margin: 2pt 0; }
.ta-r { text-align: right; }
.ta-c { text-align: center; }
.ta-l { text-align: left; }

/* ── Header ────────────────────────────────────────────────────────────── */
.qp-hdr { display: flex; align-items: flex-start; gap: 6pt; margin-bottom: 3pt; }
.qp-co-block  { flex: 1 1 0; min-width: 0; }
.qp-co-name   { font-size: 15pt; font-weight: 700; color: #005fb8; line-height: 1.1; }
.qp-co-meta   { font-size: 7.5pt; color: #475569; margin-top: 3pt; line-height: 1.65; }
.qp-title-col {
  flex: 0 0 auto; display: flex; align-items: flex-start;
  justify-content: center; padding: 0 8pt;
}
.qp-doc-title {
  font-size: 12pt; font-weight: 700; letter-spacing: 1pt; color: #005fb8;
  text-transform: uppercase; border: 2pt solid #005fb8;
  padding: 5pt 14pt; white-space: nowrap;
}
.qp-right-col {
  flex: 0 0 80pt; display: flex; flex-direction: column;
  align-items: flex-end; gap: 5pt;
}
.qp-right-col img { max-width: 72pt; max-height: 48pt; object-fit: contain; }
.qp-pi-details { width: 100%; font-size: 7.5pt; }
.qp-pi-row { display: flex; justify-content: space-between; padding: 1.5pt 0; border-bottom: 0.4pt solid #e2e8f0; }
.qp-pi-key { color: #64748b; font-weight: 600; }
.qp-pi-val { font-weight: 700; color: #0f172a; text-align: right; }

/* ── Status badge ──────────────────────────────────────────────────────── */
.qp-status-badge {
  display: inline-block; font-size: 7pt; font-weight: 700;
  letter-spacing: 0.3pt; text-transform: uppercase;
  padding: 2pt 7pt; border-radius: 99pt; margin-top: 4pt;
}

/* ── 3-column billing block ─────────────────────────────────────────────── */
.qp-info-grid {
  display: grid; grid-template-columns: 5fr 5fr 4fr;
  border: 0.75pt solid #94a3b8; margin-bottom: 7pt;
}
.qp-info-col { padding: 6pt 8pt; }
.qp-info-col + .qp-info-col { border-left: 0.75pt solid #94a3b8; }
.qp-block-label {
  font-size: 7pt; font-weight: 700; letter-spacing: 0.4pt; color: #64748b;
  margin-bottom: 4pt; border-bottom: 0.5pt solid #e2e8f0;
  padding-bottom: 2pt; text-transform: uppercase;
}
.qp-cust-name { font-size: 9.5pt; font-weight: 700; color: #0f172a; }
.qp-addr-line { font-size: 7.5pt; color: #475569; line-height: 1.55; margin-top: 2pt; word-break: break-word; }
.qp-meta-row  { display: flex; justify-content: space-between; align-items: baseline; gap: 4pt; font-size: 8pt; padding: 2pt 0; }
.qp-meta-key  { color: #64748b; font-weight: 600; white-space: nowrap; }
.qp-meta-val  { font-weight: 600; text-align: right; }

/* ── Items table (9 cols) ───────────────────────────────────────────────── */
.qp-table {
  width: 100%; border-collapse: collapse; font-size: 8pt;
  margin-bottom: 4pt; table-layout: fixed;
}
.qp-table th {
  background: #005fb8; color: #fff; padding: 5pt 4pt;
  font-size: 7.5pt; font-weight: 600; white-space: nowrap;
  border-right: 0.5pt solid rgba(255,255,255,.15);
}
.qp-table th:last-child { border-right: none; }
.qp-th-sub { font-size: 5.5pt; font-weight: 400; font-style: italic; white-space: nowrap; margin-top: 1pt; }
.qp-table td {
  padding: 4pt 4pt; border-bottom: 0.5pt solid #e8ecf0;
  vertical-align: top; overflow-wrap: break-word; word-break: break-word;
}
.qp-table tbody tr:nth-child(even) td { background: #f8fafc; }
.qp-table tbody tr:last-child td { border-bottom: 1pt solid #94a3b8; }
.qp-item-name { font-weight: 600; color: #0f172a; }
.qp-item-sku  { font-size: 7pt; color: #94a3b8; margin-top: 1pt; }
.qp-photo-placeholder {
  width: 28pt; height: 28pt; background: #f1f5f9;
  border: 0.5pt solid #e2e8f0; border-radius: 2pt;
  display: flex; align-items: center; justify-content: center;
  font-size: 6pt; color: #cbd5e1;
}

/* ── Totals ─────────────────────────────────────────────────────────────── */
.qp-totals-section { display: flex; gap: 10pt; margin: 4pt 0 8pt; align-items: flex-start; }
.qp-words-box {
  flex: 1 1 0; min-width: 0;
  border: 0.75pt solid #e2e8f0; border-radius: 4pt;
  padding: 7pt 9pt; background: #f8fafc; font-size: 8pt;
}
.qp-words-label { font-size: 7pt; font-weight: 700; color: #64748b; letter-spacing: 0.3pt; text-transform: uppercase; margin-bottom: 4pt; }
.qp-words-text  { font-style: italic; color: #1a1a1a; font-size: 8.5pt; line-height: 1.5; }
.qp-totals-box  { min-width: 195pt; }
.qp-total-row   {
  display: flex; justify-content: space-between; align-items: center;
  padding: 2.5pt 5pt; border-bottom: 0.4pt solid #e8ecf0; font-size: 8.5pt;
}
.qp-total-key { color: #475569; }
.qp-total-val { text-align: right; min-width: 72pt; font-variant-numeric: tabular-nums; }
.qp-disc-val  { color: #dc2626; }
.qp-grand-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5pt 6pt; background: #005fb8; color: #fff;
  font-size: 11pt; font-weight: 700; margin-top: 2pt; letter-spacing: 0.2pt;
}

/* ── Payment Terms / Status Bar ─────────────────────────────────────────── */
.qp-terms-bar {
  border: 1.25pt solid #005fb8; border-radius: 3pt;
  padding: 6pt 12pt; margin: 6pt 0 8pt; text-align: center; color: #005fb8; font-size: 8.5pt;
}
.qp-terms-bar-label { font-size: 7pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; margin-bottom: 3pt; opacity: 0.75; }
.qp-terms-bar-text  { font-weight: 700; font-size: 9pt; }

/* ── Payment status row (orders) ────────────────────────────────────────── */
.qp-pay-status {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 6pt; margin: 0 0 8pt; border: 0.75pt solid #e2e8f0;
  border-radius: 4pt; overflow: hidden;
}
.qp-pay-cell { padding: 6pt 8pt; background: #f8fafc; text-align: center; }
.qp-pay-cell:not(:last-child) { border-right: 0.75pt solid #e2e8f0; }
.qp-pay-cell-label { font-size: 7pt; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3pt; margin-bottom: 3pt; }
.qp-pay-cell-val   { font-size: 10pt; font-weight: 700; }

/* ── Bottom 2-col grid ──────────────────────────────────────────────────── */
.qp-bottom-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12pt;
  border-top: 0.75pt solid #94a3b8; padding-top: 7pt; margin-top: 4pt;
}
.qp-section-label {
  font-size: 7pt; font-weight: 700; letter-spacing: 0.4pt; color: #64748b;
  text-transform: uppercase; margin-bottom: 5pt;
  border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 2pt;
}
.qp-bank-inner { display: flex; gap: 8pt; align-items: flex-start; }
.qp-bank-qr img { width: 60pt; height: 60pt; object-fit: contain; border: 0.5pt solid #e2e8f0; border-radius: 3pt; }
.qp-bank-rows { flex: 1 1 0; min-width: 0; }
.qp-bank-line { display: flex; gap: 5pt; font-size: 7.5pt; padding: 1.5pt 0; }
.qp-bank-key  { color: #64748b; font-weight: 600; min-width: 52pt; flex-shrink: 0; }
.qp-tc-list   { font-size: 7.5pt; color: #475569; line-height: 1.65; padding-left: 14pt; margin: 0; }
.qp-tc-list li { margin-bottom: 2pt; }

/* ── Computer-generated + footer ────────────────────────────────────────── */
.qp-cg-line {
  margin-top: 10pt; text-align: center;
  font-size: 7.5pt; color: #94a3b8; font-style: italic;
}
.qp-footer {
  margin-top: 8pt; padding-top: 5pt; border-top: 0.4pt solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7.5pt; color: #64748b;
}
.qp-footer-thanks { font-weight: 600; color: #005fb8; }

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 780px) {
  .qp-screen { padding: 0; background: #e2e5ea; }
  .qp-page { width: 100%; min-height: unset; padding: 14px; box-shadow: none; font-size: 8pt; }
  .qp-co-name   { font-size: 13pt; }
  .qp-doc-title { font-size: 10pt; padding: 4pt 10pt; }
  .qp-info-grid { grid-template-columns: 1fr; }
  .qp-info-col + .qp-info-col { border-left: none; border-top: 0.75pt solid #94a3b8; }
  .qp-totals-section { flex-direction: column; }
  .qp-totals-box { min-width: 100%; }
  .qp-bottom-grid { grid-template-columns: 1fr; }
  .qp-pay-status { grid-template-columns: 1fr; }
  .qp-pay-cell:not(:last-child) { border-right: none; border-bottom: 0.75pt solid #e2e8f0; }
  .qp-table { font-size: 7pt; }
  .qp-table th, .qp-table td { padding: 3pt 3pt; }
}
`;

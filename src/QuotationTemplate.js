/**
 * QuotationTemplate — single source of truth for View and Print layout.
 * Mirrors the server-side pdfmake template (backend/src/shared/pdf.service.ts
 * → quotationTemplate()) so the on-screen/print output matches the
 * downloadable PDF exactly.
 *
 * Props:
 *   data      Quotation record from API (with items[])
 *   wrapClass CSS class on the outer div:
 *               "qp-screen"  → centred A4 card on grey background (View page)
 *               ""           → flush, no wrapper padding (Print page)
 */
import React from 'react';
import { company, bank } from './config/company';
import { inr, fmtDate, resolveImageUrl } from './utils/docFormatters';

const BLUE = '#016bb2';

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
    padding: 5mm 13mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    page-break-inside: auto;
  }
  .qp-bottom-row,
  .qp-terms,
  .qp-cg-line { page-break-inside: avoid; }
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
  line-height: 1.4;
}

.ta-r { text-align: right; }
.ta-c { text-align: center; }
.ta-l { text-align: left; }

/* ── Title ───────────────────────────────────────────────────────────────── */
.qp-title {
  text-align: center;
  font-size: 16pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 5pt;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.qp-hdr {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10pt;
  margin-bottom: 5pt;
}
.qp-co-block { flex: 1 1 0; min-width: 0; }
.qp-co-name  { font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-bottom: 3pt; }
.qp-co-meta div { font-size: 7.5pt; color: #333; margin-bottom: 2pt; }
.qp-co-iso   { color: ${BLUE}; font-weight: 700; }
.qp-co-gstin { font-size: 8pt; }

.qp-hdr-logo { flex: 0 0 auto; }
.qp-hdr-logo img { max-width: 158pt; max-height: 97pt; object-fit: contain; }

/* ── 3-column billing block ─────────────────────────────────────────────── */
.qp-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border: 0.5pt solid #cbd5e1;
  margin-bottom: 5pt;
}
.qp-info-col { border-left: 0.5pt solid #cbd5e1; }
.qp-info-col:first-child { border-left: none; }
.qp-info-head {
  background: ${BLUE};
  color: #fff;
  font-size: 9pt;
  font-weight: 700;
  padding: 4pt 6pt;
}
.qp-info-body { padding: 6pt 8pt; }
.qp-info-name { font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 5pt; }
.qp-info-rule { border: none; border-top: 0.4pt solid #cbd5e1; margin: 5pt 0; }
.qp-info-addr { font-size: 8pt; color: #374151; line-height: 1.3; }
.qp-info-line { font-size: 8pt; color: #374151; margin-bottom: 3pt; }
.qp-info-line strong { color: #0f172a; }
.qp-info-row { display: flex; gap: 3pt; font-size: 8pt; margin-bottom: 5pt; }
.qp-info-row:last-child { margin-bottom: 0; }
.qp-info-row-label { font-weight: 700; color: #0f172a; white-space: nowrap; }
.qp-info-row-val   { color: #374151; }

/* ── Items table (10 cols) ──────────────────────────────────────────────── */
.qp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 5pt;
  table-layout: fixed;
}
.qp-table th {
  background: ${BLUE};
  color: #fff;
  padding: 5pt 5pt;
  font-size: 7.5pt;
  font-weight: 700;
  white-space: nowrap;
  border-right: 0.75pt solid rgba(255,255,255,.35);
}
.qp-table th:last-child { border-right: none; }
.qp-th-sub { font-size: 5.5pt; font-weight: 400; font-style: italic; white-space: nowrap; margin-top: 1pt; }
.qp-table td {
  padding: 3pt;
  border-bottom: 0.4pt solid #cbd5e1;
  vertical-align: top;
  overflow-wrap: break-word;
  word-break: break-word;
}
.qp-table tbody tr:nth-child(even) td { background: #f8fafc; }
.qp-table tbody tr:last-child td { border-bottom: 1pt solid ${BLUE}; }
.qp-item-sku  { font-size: 7pt; font-weight: 700; color: ${BLUE}; margin-bottom: 1pt; }
.qp-item-name { font-weight: 700; color: #0f172a; }
.qp-item-hsn  { font-size: 6.5pt; color: #64748b; margin-top: 1pt; }
.qp-instr     { font-size: 7pt; color: #64748b; }
.qp-gst-pct   { font-size: 7.5pt; font-weight: 700; }
.qp-gst-amt   { font-size: 5.5pt; color: #64748b; margin-top: 2pt; }
.qp-disc-main { font-size: 7pt; font-weight: 700; color: #0f172a; }
.qp-disc-sub  { font-size: 6pt; color: #64748b; margin-top: 3pt; }
.qp-disc-amt  {
  font-size: 7pt; font-weight: 700; color: #0f172a;
  margin-top: 3pt; padding-top: 3pt;
  border-top: 0.5pt solid #cbd5e1;
}
.qp-item-photo {
  width: 26pt; height: 26pt;
  object-fit: contain;
  border-radius: 3pt;
  display: block;
  margin: 0 auto;
  border: 0.5pt solid #e2e8f0;
}
.qp-photo-box {
  width: 26pt; height: 26pt;
  background: #e2e8f0;
  border-radius: 3pt;
  margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
}
.qp-photo-box::after { content: ''; width: 8pt; height: 8pt; border-radius: 50%; background: #94a3b8; }
.qp-photo-label { font-size: 6pt; color: #94a3b8; text-align: center; margin-top: 1pt; }

/* ── Bottom: QR | Account+Dispatch | divider | Totals ───────────────────── */
.qp-bottom-row {
  display: flex;
  align-items: flex-start;
  gap: 8pt;
  margin-bottom: 5pt;
}
.qp-qr-block { flex: 0 0 72pt; text-align: center; }
.qp-qr-label { font-size: 7.5pt; font-weight: 700; margin-bottom: 3pt; }
.qp-qr-block img { width: 64pt; height: 64pt; object-fit: contain; }
.qp-qr-caption { font-size: 6.5pt; color: #64748b; margin-top: 3pt; }

.qp-bd-block { flex: 1 1 0; min-width: 0; }
.qp-bd-heading { font-size: 9.5pt; font-weight: 700; color: ${BLUE}; margin-bottom: 5pt; }
.qp-bd-row { display: flex; gap: 4pt; font-size: 8pt; margin-bottom: 3pt; }
.qp-bd-key { font-weight: 700; color: #0f172a; width: 112pt; flex: 0 0 auto; }
.qp-bd-val { color: #374151; }
.qp-bd-rule { border: none; border-top: 0.5pt solid #cbd5e1; margin: 10pt 0 8pt; }

.qp-divider { flex: 0 0 auto; align-self: stretch; width: 0.75pt; background: #999; }

.qp-totals-block { flex: 0 0 40%; }
.qp-t-row { display: flex; justify-content: space-between; gap: 6pt; padding: 1.5pt 0; font-size: 8.5pt; color: #0f172a; }
.qp-t-row.lg { font-size: 10pt; font-weight: 700; color: ${BLUE}; padding: 2pt 0; }
.qp-t-rule { border: none; border-top: 0.5pt solid #999; margin: 3pt 0; }

/* ── Terms & Conditions ─────────────────────────────────────────────────── */
.qp-terms-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.3pt; margin-bottom: 2pt; }
.qp-terms { font-size: 6pt; color: #1a1a1a; line-height: 1.25; }

/* ── Computer-generated line ────────────────────────────────────────────── */
.qp-cg-line {
  margin-top: 1pt;
  text-align: center;
  font-size: 7.5pt;
  color: #64748b;
  font-style: italic;
}

/* ── Responsive (screen only — A4's print width is ~794px, dangerously close
   to this breakpoint, and a fixed-size printed page should never collapse
   into the mobile single-column layout) ──────────────────────────────────── */
@media screen and (max-width: 780px) {
  .qp-screen { padding: 0; background: #e2e5ea; }
  .qp-page {
    width: 100%;
    min-height: unset;
    padding: 14px;
    box-shadow: none;
    font-size: 8pt;
  }
  .qp-hdr { flex-direction: column; }
  .qp-hdr-logo img { max-width: 120pt; }
  .qp-info-grid { grid-template-columns: 1fr; }
  .qp-info-col { border-left: none; border-top: 0.5pt solid #cbd5e1; }
  .qp-info-col:first-child { border-top: none; }
  .qp-bottom-row { flex-direction: column; }
  .qp-divider { display: none; }
  .qp-totals-block { flex: 1 1 100%; width: 100%; }
  .qp-table { font-size: 7pt; }
  .qp-table th, .qp-table td { padding: 3pt; }
}
`;

/* ── Small helpers ─────────────────────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div className="qp-info-row">
      <span className="qp-info-row-label">{label}</span>
      <span className="qp-info-row-val">{value}</span>
    </div>
  );
}

function PartyBlock({ name, address, phone, gstin }) {
  return (
    <div className="qp-info-body">
      <div className="qp-info-name">{name || '—'}</div>
      <hr className="qp-info-rule" />
      <div className="qp-info-addr">{address || '—'}</div>
      {phone && (
        <div className="qp-info-line" style={{ marginTop: 5 }}>
          <strong>Mobile:</strong> {phone}
        </div>
      )}
      {gstin && (
        <>
          <hr className="qp-info-rule" />
          <div className="qp-info-line"><strong>GSTIN:</strong> {gstin}</div>
        </>
      )}
    </div>
  );
}

function BdRow({ label, value }) {
  return (
    <div className="qp-bd-row">
      <span className="qp-bd-key">{label}:</span>
      <span className="qp-bd-val">{value || '—'}</span>
    </div>
  );
}

const TERMS_TEXT = 'Prices are valid only for this quotation and are subject to change without '
  + 'prior notice. • Order confirmation is subject to receipt of the agreed advance payment. '
  + '• Delivery timelines commence only after advance payment and final order confirmation. '
  + '• Any change in order specifications may affect pricing and delivery schedules. '
  + '• Goods once sold will not be taken back except for approved manufacturing defects. '
  + '• Risk in transit passes to the buyer upon dispatch. Transit damage claims must be made '
  + 'with the transporter. • Delivery delays due to force majeure or unforeseen circumstances '
  + 'shall not be the responsibility of the company. • Refunds, if approved, will be processed '
  + 'within 10 working days after verification. • GST and other applicable taxes will be charged '
  + 'as per prevailing rates on the invoice date. • Product specifications, prices, and designs '
  + 'are subject to change without prior notice. • All disputes shall be subject to the exclusive '
  + 'jurisdiction of the courts in Chennai, Tamil Nadu.';

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function QuotationTemplate({ data, wrapClass = 'qp-screen' }) {
  if (!data) return null;

  const items = data.items || [];
  // The Disc column only appears at all if at least one line item actually
  // has a discount — the freed width is redistributed among the remaining
  // columns rather than left as a gap.
  const hasAnyDiscount = items.some((it) => Number(it.discount_value || 0) > 0);
  const colWidths = hasAnyDiscount
    ? { no: 4, photo: 6, name: 28, instr: 8, qty: 5, uom: 5, disc: 13, rate: 11.5, gst: 8, amt: 11.5 }
    : { no: 4, photo: 6, name: 34, instr: 11, qty: 5, uom: 5, rate: 13.5, gst: 9, amt: 12.5 };

  const subTotal   = Number(data.sub_total || 0);
  const chargePack = Number(data.charges_packing      || 0);
  const chargeCar  = Number(data.charges_cartage      || 0);
  const chargeFwd  = Number(data.charges_forwarding   || 0);
  const chargeInst = Number(data.charges_installation || 0);
  const chargeLoad = Number(data.charges_loading      || 0);
  const roundOff   = Number(data.round_off || data.roundoff || data.roundOff || 0);

  const totalBeforeGst = subTotal + chargePack + chargeCar + chargeFwd + chargeInst + chargeLoad;

  const gstByRate = new Map();
  items.forEach((it) => {
    const base = Number(it.amount || 0);
    const pct  = Number(it.gst_percent || 0);
    if (pct > 0) {
      const prev = gstByRate.get(pct) || { base: 0, gst: 0 };
      gstByRate.set(pct, { base: prev.base + base, gst: prev.gst + (base * pct) / 100 });
    }
  });
  const totalGst   = [...gstByRate.values()].reduce((s, v) => s + v.gst, 0);
  const grandTotal = totalBeforeGst + totalGst + roundOff;

  const custName = data.customer_name || '';
  const phone    = (data.customer_phone || '').replace(/^\+91/, '');
  const gstin    = data.gst_number || '';

  const validity = data.valid_till
    ? fmtDate(data.valid_till)
    : data.validity_days
      ? `${data.validity_days} days from date`
      : '30 days from date';

  const hasBank = Boolean(bank.accountName || bank.name || bank.account || bank.ifsc);

  return (
    <div className={wrapClass}>
      <style>{CSS}</style>

      <div className="qp-page">

        {/* ── Title ──────────────────────────────────────────────────── */}
        <div className="qp-title">Quotation</div>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="qp-hdr">
          <div className="qp-co-block">
            <div className="qp-co-name">{company.name}</div>
            <div className="qp-co-meta">
              {company.address && <div>{company.address}</div>}
              {(company.phone || company.email) && (
                <div>
                  {company.phone && <><strong>Mobile:</strong> {company.phone}</>}
                  {company.phone && company.email && '   ·   '}
                  {company.email && <><strong>Email:</strong> {company.email}</>}
                </div>
              )}
              {company.msmeRegNo && <div><strong>MSME Reg. No.:</strong> {company.msmeRegNo}</div>}
              {company.isoCert && (
                <div>
                  <span className="qp-co-iso">{company.isoCert}</span>
                  {company.qmsLabel && <>  |  {company.qmsLabel}</>}
                </div>
              )}
              {company.gstin && (
                <div className="qp-co-gstin"><strong>GSTIN:</strong> <strong>{company.gstin}</strong></div>
              )}
            </div>
          </div>

          {company.logoUrl && (
            <div className="qp-hdr-logo">
              <img
                src={company.logoUrl}
                alt="Logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* ── 3-col: Bill To | Ship To | Quotation Details ─────────── */}
        <div className="qp-info-grid">

          <div className="qp-info-col">
            <div className="qp-info-head">Bill To</div>
            <PartyBlock name={custName} address={data.billing_address} phone={phone} gstin={gstin} />
          </div>

          <div className="qp-info-col">
            <div className="qp-info-head">Ship To</div>
            <PartyBlock
              name={custName}
              address={data.shipping_address || data.billing_address}
              phone={phone}
              gstin={gstin}
            />
          </div>

          <div className="qp-info-col">
            <div className="qp-info-head">Quotation Details</div>
            <div className="qp-info-body">
              <InfoRow label="Date:" value={fmtDate(data.created_at)} />
              <InfoRow label="Quotation No:" value={data.quotation_no || '—'} />
              <InfoRow label="Salesman:" value={data.salesman_name || data.sales_person || '—'} />
              <InfoRow label="Validity:" value={validity} />
              <hr className="qp-info-rule" />
              <InfoRow label="Payment Terms:" value="Advance 70% & Before Dispatch 30%" />
              <InfoRow label="Delivery Type:" value={data.delivery_type || data.delivery_by || '—'} />
            </div>
          </div>

        </div>

        {/* ── Items table ───────────────────────────────────────────── */}
        <table className="qp-table">
          <colgroup>
            <col style={{ width: `${colWidths.no}%` }}    />
            <col style={{ width: `${colWidths.photo}%` }} />
            <col style={{ width: `${colWidths.name}%` }}  />
            <col style={{ width: `${colWidths.instr}%` }} />
            <col style={{ width: `${colWidths.qty}%` }}   />
            <col style={{ width: `${colWidths.uom}%` }}   />
            {hasAnyDiscount && <col style={{ width: `${colWidths.disc}%` }} />}
            <col style={{ width: `${colWidths.rate}%` }}  />
            <col style={{ width: `${colWidths.gst}%` }}   />
            <col style={{ width: `${colWidths.amt}%` }}   />
          </colgroup>
          <thead>
            <tr>
              <th className="ta-c">S.No</th>
              <th className="ta-c">Photo</th>
              <th className="ta-l">Item / Name / HSN</th>
              <th className="ta-l">Instruction</th>
              <th className="ta-c">Qty</th>
              <th className="ta-c">UOM</th>
              {hasAnyDiscount && <th className="ta-c">Disc</th>}
              <th className="ta-r">Rate (₹)</th>
              <th className="ta-c">GST Tax</th>
              <th className="ta-r" style={{ whiteSpace: 'normal' }}>Amount (₹)<div className="qp-th-sub">(Tax Extra)</div></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={hasAnyDiscount ? 10 : 9} style={{ textAlign: 'center', color: '#94a3b8', padding: '14pt' }}>
                  No items
                </td>
              </tr>
            ) : items.map((it, i) => {
              const base       = Number(it.amount || 0);
              const rate       = Number(it.rate || 0);
              const qty        = Number(it.qty || 0);
              const gstPct     = Number(it.gst_percent || 0);
              const gstAmt     = (base * gstPct) / 100;
              const discVal    = Number(it.discount_value || 0);
              // Only two values are ever saved by the form: 'percent' or
              // 'fixed'. Treat anything other than 'percent' as a flat
              // rupee discount, rather than matching specific strings the
              // form never actually sends.
              const discType   = String(it.discount_type || 'percent').toLowerCase();
              const isFlatDisc = discType !== 'percent';
              // Discount is always per piece — a % discount is a % of the
              // per-unit rate, a flat discount is a rupee amount off the
              // per-unit rate. Neither is computed against rate × qty.
              const perUnitDiscAmt = isFlatDisc ? discVal : (rate * discVal) / 100;
              const discountedRate = Math.max(0, rate - perUnitDiscAmt);

              return (
                <tr key={i}>
                  <td className="ta-c" style={{ color: '#64748b' }}>{i + 1}</td>
                  <td>
                    {it.image_url ? (
                      <img
                        src={resolveImageUrl(it.image_url)}
                        alt=""
                        className="qp-item-photo"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = ''; }}
                      />
                    ) : null}
                    <div className="qp-photo-box" style={it.image_url ? { display: 'none' } : undefined} />
                    <div className="qp-photo-label">Photo</div>
                  </td>
                  <td>
                    {it.sku && <div className="qp-item-sku">{it.sku}</div>}
                    <div className="qp-item-name">{it.item_name || `Item ${i + 1}`}</div>
                    {it.hsn_code && <div className="qp-item-hsn">HSN: {it.hsn_code}</div>}
                  </td>
                  <td className="qp-instr">{it.instruction || it.notes || ''}</td>
                  <td className="ta-c">{qty}</td>
                  <td className="ta-c">{it.uom || it.unit || ''}</td>
                  {hasAnyDiscount && (
                    <td className="ta-c">
                      {discVal > 0 && (
                        <>
                          <div className="qp-disc-main">{isFlatDisc ? inr(discVal) : `${discVal}%`}</div>
                          <div className="qp-disc-sub">on {inr(rate)}</div>
                          <div className="qp-disc-amt">= {inr(isFlatDisc ? discountedRate : perUnitDiscAmt)}</div>
                        </>
                      )}
                    </td>
                  )}
                  <td className="ta-r">{inr(discVal > 0 ? discountedRate : rate)}</td>
                  <td className="ta-c">
                    {gstPct > 0 && (
                      <>
                        <div className="qp-gst-pct">{gstPct}%</div>
                        <div className="qp-gst-amt">{inr(gstAmt)}</div>
                      </>
                    )}
                  </td>
                  <td className="ta-r" style={{ fontWeight: 700 }}>{inr(base)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── QR | Account + Dispatch | Totals ──────────────────────── */}
        <div className="qp-bottom-row">

          {bank.qrUrl && (
            <div className="qp-qr-block">
              <div className="qp-qr-label">Scan to Pay</div>
              <img
                src={bank.qrUrl}
                alt="QR"
                onError={(e) => { e.target.parentElement.style.display = 'none'; }}
              />
              <div className="qp-qr-caption">Google Pay / UPI</div>
            </div>
          )}

          <div className="qp-bd-block">
            <div className="qp-bd-heading">Account Details</div>
            {hasBank ? (
              <>
                <BdRow label="Account Holder's Name" value={bank.accountName} />
                <BdRow label="Account Number" value={bank.account} />
                <BdRow label="Bank Name" value={bank.name} />
                <BdRow label="Branch Name" value={bank.branch} />
                <BdRow label="IFSC Code" value={bank.ifsc} />
              </>
            ) : (
              <div style={{ fontSize: '7.5pt', color: '#94a3b8' }}>Bank details not configured.</div>
            )}

            <hr className="qp-bd-rule" />

            <div className="qp-bd-heading">Dispatch Details</div>
            <BdRow label="Booking At" value={data.booking_at} />
            <BdRow label="Goods Sent By" value={data.goods_sent_by || data.delivery_by} />
            <BdRow label="Transport Payment By" value={data.transport_payment_by || data.payment_type} />
            <BdRow label="Delivery Type" value={data.delivery_type} />
            <BdRow label="Delivery Instruction" value={data.delivery_instructions} />
          </div>

          <div className="qp-divider" />

          <div className="qp-totals-block">
            <div className="qp-t-row lg"><span>Sub Total</span><span>{inr(subTotal)}</span></div>
            {chargePack > 0 && <div className="qp-t-row"><span>(+) Wooden Packing Charges</span><span>{inr(chargePack)}</span></div>}
            {chargeCar  > 0 && <div className="qp-t-row"><span>(+) Cartage Charges</span><span>{inr(chargeCar)}</span></div>}
            {chargeFwd  > 0 && <div className="qp-t-row"><span>(+) Forwarding Charges</span><span>{inr(chargeFwd)}</span></div>}
            {chargeInst > 0 && <div className="qp-t-row"><span>(+) Onsite Installation Charges</span><span>{inr(chargeInst)}</span></div>}
            {chargeLoad > 0 && <div className="qp-t-row"><span>(+) Loading & Unloading Charges</span><span>{inr(chargeLoad)}</span></div>}
            <hr className="qp-t-rule" />
            <div className="qp-t-row lg"><span>Total</span><span>{inr(totalBeforeGst)}</span></div>
            <hr className="qp-t-rule" />
            {[...gstByRate.entries()].sort((a, b) => a[0] - b[0]).map(([pct, v]) => (
              <div className="qp-t-row" key={pct}>
                <span>(+) GST {pct}% on {inr(v.base)}</span><span>{inr(v.gst)}</span>
              </div>
            ))}
            <hr className="qp-t-rule" />
            <div className="qp-t-row"><span>Rounded Off</span><span>{inr(roundOff)}</span></div>
            <hr className="qp-t-rule" />
            <div className="qp-t-row lg"><span>Grand Total</span><span>{inr(grandTotal)}</span></div>
            <hr className="qp-t-rule" />
          </div>

        </div>

        {/* ── Terms & Conditions ─────────────────────────────────────── */}
        <div className="qp-terms-label">TERMS &amp; CONDITIONS</div>
        <div className="qp-terms">{TERMS_TEXT}</div>

        {/* ── Computer-generated line ──────────────────────────────── */}
        <div className="qp-cg-line">
          This is a Computer Generated Quotation, Signature &amp; Seal not required.
        </div>

      </div>{/* .qp-page */}
    </div>
  );
}

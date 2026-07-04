/**
 * OrderTemplate — single source of truth for Order View, Print, and PDF layout.
 * Shares the same design system as QuotationTemplate (docFormatters.js).
 *
 * Props:
 *   data      Order record from API (with items[])
 *   wrapClass CSS class on the outer div:
 *               "qp-screen"  → centred A4 card on grey background (View page)
 *               ""           → flush, no wrapper padding (Print page)
 */
import React from 'react';
import { company, bank, hasBankDetails } from './config/company';
import { inr, fmtDate, amountInWords, DOC_TEMPLATE_CSS, resolveImageUrl } from './utils/docFormatters';
import DocumentOwnershipPanel from './components/ownership/DocumentOwnershipPanel';

/* ── Order status display ──────────────────────────────────────────────── */
const STATUS_LABEL = {
  PENDING_APPROVAL:   'Pending Approval',
  APPROVED:           'Approved',
  REJECTED:           'Rejected',
  IN_PRODUCTION:      'In Production',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  DISPATCHED:         'Dispatched',
  COMPLETED:          'Completed',
  CANCELLED:          'Cancelled',
};

const STATUS_COLOR = {
  PENDING_APPROVAL:   { bg: '#fff7ed', text: '#c2410c' },
  APPROVED:           { bg: '#d1fae5', text: '#065f46' },
  REJECTED:           { bg: '#fee2e2', text: '#dc2626' },
  IN_PRODUCTION:      { bg: '#dbeafe', text: '#1d4ed8' },
  READY_FOR_DISPATCH: { bg: '#fef9c3', text: '#a16207' },
  DISPATCHED:         { bg: '#ede9fe', text: '#6d28d9' },
  COMPLETED:          { bg: '#dcfce7', text: '#15803d' },
  CANCELLED:          { bg: '#fee2e2', text: '#dc2626' },
};

/* ═══════════════════════════════════════════════════════════════════════ */
export default function OrderTemplate({ data, wrapClass = 'qp-screen' }) {
  if (!data) return null;

  const items      = data.items || [];
  // The Disc column only appears at all if at least one line item actually
  // has a discount — the freed width is redistributed among the remaining
  // columns rather than left as a gap.
  const hasAnyDiscount = items.some((it) => Number(it.discount_value || 0) > 0);
  const colWidths = hasAnyDiscount
    ? { no: 4, photo: 6, name: 28, instr: 17, qty: 6, disc: 7, rate: 12, gst: 6, amt: 14 }
    : { no: 4, photo: 6, name: 32, instr: 19, qty: 6, rate: 13, gst: 7, amt: 13 };
  // Order entity uses 'subtotal' not 'sub_total'
  const subTotal   = Number(data.subtotal || data.sub_total || 0);
  const discType   = data.discount_type  || 'PERCENT';
  const discValue  = Number(data.discount_value  || 0);
  const headerDisc = discType === 'FLAT' ? discValue : (subTotal * discValue) / 100;
  const taxable    = subTotal - headerDisc;

  const totalGst = items.reduce((s, it) => {
    const base = Number(it.amount || 0);
    const pct  = Number(it.gst_percent || 0);
    return s + (base * pct) / 100;
  }, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

  // Order entity uses different charge field names
  const chargePack = Number(data.packing_charges      || data.charges_packing      || 0);
  const chargeCar  = Number(data.cartage_charges      || data.charges_cartage      || 0);
  const chargeFwd  = Number(data.forwarding_charges   || data.charges_forwarding   || 0);
  const chargeInst = Number(data.installation_charges || data.charges_installation || 0);
  const chargeLoad = Number(data.loading_charges      || data.charges_loading      || 0);

  const grandTotal   = Number(data.total_amount || 0);
  const paidAmount   = Number(data.paid_amount   || 0);
  const pendingAmt   = Number(data.pending_amount ?? (grandTotal - paidAmount));

  const orderNo    = data.order_no || data.order_number || `#${data.id}`;
  const statusKey  = data.status   || '';
  const statusLabel = STATUS_LABEL[statusKey] || statusKey;
  const statusColor = STATUS_COLOR[statusKey] || { bg: '#f1f5f9', text: '#475569' };

  const payTerms = company.paymentTerms || '';
  const hasPayment = paidAmount > 0 || pendingAmt > 0;

  return (
    <div className={wrapClass}>
      <style>{DOC_TEMPLATE_CSS}</style>

      <div className="qp-page">

        {/* ── Header ────────────────────────────────────────────────── */}
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
            <div className="qp-doc-title">Order Confirmation</div>
          </div>

          {/* RIGHT: logo + order details */}
          <div className="qp-right-col">
            <img
              src={company.logoUrl}
              alt="Logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="qp-pi-details">
              <div className="qp-pi-row">
                <span className="qp-pi-key">Order No.</span>
                <span className="qp-pi-val">{orderNo}</span>
              </div>
              <div className="qp-pi-row">
                <span className="qp-pi-key">Order Date</span>
                <span className="qp-pi-val">{fmtDate(data.created_at)}</span>
              </div>
              {data.due_date && (
                <div className="qp-pi-row">
                  <span className="qp-pi-key">Exp. Delivery</span>
                  <span className="qp-pi-val">{fmtDate(data.due_date)}</span>
                </div>
              )}
              <DocumentOwnershipPanel data={data} docType="order" variant="print" />
              {statusLabel && (
                <div style={{ marginTop: 4, textAlign: 'right' }}>
                  <span
                    className="qp-status-badge"
                    style={{ background: statusColor.bg, color: statusColor.text }}
                  >
                    {statusLabel}
                  </span>
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
            {data.due_date && (
              <div className="qp-meta-row">
                <span className="qp-meta-key">Exp. Dispatch</span>
                <span className="qp-meta-val">{fmtDate(data.due_date)}</span>
              </div>
            )}
            {data.booking_at && <div className="qp-meta-row">
              <span className="qp-meta-key">Booking At</span>
              <span className="qp-meta-val">{data.booking_at}</span>
            </div>}
            {data.goods_sent_by && <div className="qp-meta-row">
              <span className="qp-meta-key">Goods Sent By</span>
              <span className="qp-meta-val">{data.goods_sent_by}</span>
            </div>}
            {data.transport_payment_by && <div className="qp-meta-row">
              <span className="qp-meta-key">Transport Payment By</span>
              <span className="qp-meta-val">{data.transport_payment_by}</span>
            </div>}
            {data.delivery_type && <div className="qp-meta-row">
              <span className="qp-meta-key">Delivery Location</span>
              <span className="qp-meta-val">{data.delivery_type}</span>
            </div>}
            {data.delivery_instructions && (
              <div style={{ marginTop: 4 }}>
                <div className="qp-meta-key" style={{ fontSize: '7pt', marginBottom: 2 }}>Delivery Instruction</div>
                <div style={{ fontSize: '7.5pt', color: '#475569', lineHeight: 1.5 }}>
                  {data.delivery_instructions}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Items table ──────────────────────────────────────────── */}
        <table className="qp-table">
          <colgroup>
            <col style={{ width: `${colWidths.no}%` }}    />
            <col style={{ width: `${colWidths.photo}%` }} />
            <col style={{ width: `${colWidths.name}%` }}  />
            <col style={{ width: `${colWidths.instr}%` }} />
            <col style={{ width: `${colWidths.qty}%` }}   />
            {hasAnyDiscount && <col style={{ width: `${colWidths.disc}%` }} />}
            <col style={{ width: `${colWidths.rate}%` }}  />
            <col style={{ width: `${colWidths.gst}%` }}   />
            <col style={{ width: `${colWidths.amt}%` }}   />
          </colgroup>
          <thead>
            <tr>
              <th className="ta-c">#</th>
              <th className="ta-c">Photo</th>
              <th className="ta-l">Item No / Name</th>
              <th className="ta-l">Instructions</th>
              <th className="ta-c">Qty</th>
              {hasAnyDiscount && <th className="ta-c">Disc</th>}
              <th className="ta-r">Rate (₹)</th>
              <th className="ta-c">GST Tax</th>
              <th className="ta-r" style={{ whiteSpace: 'normal' }}>Amount (₹)<div className="qp-th-sub">(Tax Extra)</div></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={hasAnyDiscount ? 9 : 8} style={{ textAlign: 'center', color: '#94a3b8', padding: '14pt' }}>
                  No items
                </td>
              </tr>
            ) : items.map((it, i) => {
              const base    = Number(it.amount || 0);
              const gstPct  = Number(it.gst_percent || 0);
              const gstAmt  = it.gst_amount != null
                ? Number(it.gst_amount)
                : (base * gstPct) / 100;
              const total   = base + gstAmt;
              const discVal = it.discount_value ? Number(it.discount_value) : 0;
              const disc    = discVal > 0
                ? (it.discount_type === 'percent' ? `${discVal}%` : inr(discVal))
                : '—';
              return (
                <tr key={it.id || i}>
                  <td className="ta-c" style={{ color: '#64748b' }}>{i + 1}</td>
                  <td className="ta-c">
                    {it.image_url ? (
                      <img
                        src={resolveImageUrl(it.image_url)}
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
                    {it.instruction || it.instructions || it.notes || '—'}
                  </td>
                  <td className="ta-c">{Number(it.qty || 0)}</td>
                  {hasAnyDiscount && <td className="ta-c">{disc}</td>}
                  <td className="ta-r">{inr(it.rate)}</td>
                  <td className="ta-c">{gstPct > 0 ? `${gstPct}%` : '—'}</td>
                  <td className="ta-r" style={{ fontWeight: 600 }}>{inr(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Totals: Amount in Words | Breakdown ─────────────────── */}
        <div className="qp-totals-section">

          <div className="qp-words-box">
            <div className="qp-words-label">Amount in Words</div>
            <div className="qp-words-text">{amountInWords(grandTotal)}</div>
          </div>

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

        {/* ── Payment Status (order-specific) ─────────────────────── */}
        {hasPayment && (
          <div className="qp-pay-status">
            <div className="qp-pay-cell">
              <div className="qp-pay-cell-label">Grand Total</div>
              <div className="qp-pay-cell-val" style={{ color: '#005fb8' }}>{inr(grandTotal)}</div>
            </div>
            <div className="qp-pay-cell">
              <div className="qp-pay-cell-label">Advance Received</div>
              <div className="qp-pay-cell-val" style={{ color: '#15803d' }}>{inr(paidAmount)}</div>
            </div>
            <div className="qp-pay-cell">
              <div className="qp-pay-cell-label">Balance Due</div>
              <div className="qp-pay-cell-val" style={{ color: pendingAmt > 0 ? '#dc2626' : '#15803d' }}>
                {inr(pendingAmt)}
              </div>
            </div>
          </div>
        )}

        {/* ── Payment Terms Bar (if configured) ───────────────────── */}
        {payTerms && (
          <div className="qp-terms-bar">
            <div className="qp-terms-bar-label">Payment Terms</div>
            <div className="qp-terms-bar-text">{payTerms}</div>
          </div>
        )}

        {/* ── Bottom: Bank Details | Terms & Conditions ────────────── */}
        <div className="qp-bottom-grid">

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
                {bank.accountName && <div className="qp-bank-line"><span className="qp-bank-key">Acc. Name</span><span>{bank.accountName}</span></div>}
                {bank.name        && <div className="qp-bank-line"><span className="qp-bank-key">Bank</span><span>{bank.name}</span></div>}
                {bank.branch      && <div className="qp-bank-line"><span className="qp-bank-key">Branch</span><span>{bank.branch}</span></div>}
                {bank.account     && <div className="qp-bank-line"><span className="qp-bank-key">A/C No.</span><span>{bank.account}</span></div>}
                {bank.ifsc        && <div className="qp-bank-line"><span className="qp-bank-key">IFSC</span><span>{bank.ifsc}</span></div>}
                {bank.upiId       && <div className="qp-bank-line"><span className="qp-bank-key">UPI</span><span>{bank.upiId}</span></div>}
                {!hasBankDetails  && <div style={{ fontSize: '7.5pt', color: '#94a3b8' }}>Bank details not configured.</div>}
              </div>
            </div>
          </div>

          <div>
            <div className="qp-section-label">Terms &amp; Conditions</div>
            <ol className="qp-tc-list">
              <li>All disputes are subject to Chennai jurisdiction only.</li>
              <li>Payment as per agreed terms. Goods remain property of seller until full payment received.</li>
              <li>Delivery charges and risks are borne by the buyer unless otherwise agreed.</li>
              <li>Transport / freight charges are additional unless explicitly included in this order.</li>
              <li>Prices are subject to change without prior notice for delayed orders. E.&amp;O.E.</li>
            </ol>
          </div>

        </div>

        {/* ── Computer-generated line ──────────────────────────────── */}
        <div className="qp-cg-line">
          This is a Computer Generated Order Confirmation
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="qp-footer">
          <span className="qp-footer-thanks">Thank you for your order!</span>
          <span>Page 1 of 1</span>
        </div>

      </div>{/* .qp-page */}
    </div>
  );
}

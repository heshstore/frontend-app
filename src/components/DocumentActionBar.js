/**
 * DocumentActionBar — unified action bar for Quotations, Orders, Invoices.
 *
 * Renders a sticky horizontal bar with consistent height, spacing, and icon sizing.
 * Handles: View, Edit, Print, PDF, WhatsApp, Email, Convert (all conditional).
 *
 * Props:
 *   type           'quotation' | 'order' | 'invoice'
 *   id             number
 *   docNo          string
 *   docDate        string   (ISO)
 *   amount         number
 *   status         string   ('DRAFT' | 'GENERATED' | … )
 *   customerMobile string
 *   customerName   string
 *   customerEmail  string
 *   publicPdfUrl   string
 *
 *   onBack         () => void   (navigate back)
 *   onEdit         () => void   (optional — shows Edit button)
 *   onConvert      () => void   (optional — shows Convert button)
 *   convertLabel   string       (default "Convert to order")
 *   isEditable     boolean
 *   isConvertible  boolean
 *
 *   sticky         boolean      (default true — position: sticky top-0)
 *   compact        boolean      (default false — smaller padding for embedded use)
 */
import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { theme, buttonStyle } from '../theme';
import { toast } from '../utils/toast';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { company } from '../config/company';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DocumentActionBar({
  type, id, docNo, docDate, amount, status,
  customerMobile, customerName, customerEmail, publicPdfUrl,
  onBack, onEdit, onConvert,
  convertLabel = 'Convert to order',
  isEditable    = false,
  isConvertible = false,
  sticky  = true,
  compact = false,
}) {
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo,    setEmailTo]    = useState(customerEmail || '');
  const [sending,    setSending]    = useState(false);

  /* ── Actions ────────────────────────────────────────────────────── */
  const handlePrint = () => {
    if (type === 'quotation') window.open(`/quotations/${id}/print`, '_blank');
    else window.print();
  };

  const handlePdf = async () => {
    try {
      const res = await apiFetch(`/${type}s/${id}/pdf`);
      if (!res.ok) {
        const ct  = res.headers.get('content-type') || '';
        let msg   = `PDF generation failed (${res.status})`;
        if (ct.includes('application/json')) {
          const body = await res.json().catch(() => ({}));
          msg = body?.message || msg;
        }
        toast.error(msg);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${docNo || type + '-' + id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF download failed: ' + err.message);
    }
  };

  const handleWhatsApp = () => {
    const name    = customerName || 'there';
    const refNo   = docNo || `#${id}`;
    const dateStr = fmtDate(docDate);
    const amtStr  = amount ? fmtAmt(amount) : '';
    const lines   = [
      `Hello ${name},`,
      '',
      `Please find your quotation.`,
      '',
      `Quotation No: ${refNo}`,
      dateStr ? `Date: ${dateStr}`   : null,
      amtStr  ? `Amount: ${amtStr}` : null,
      publicPdfUrl ? `\nDownload PDF:\n${publicPdfUrl}` : null,
      '',
      'Regards,',
      company.name,
    ].filter((l) => l !== null);
    const waPhone = normalizePhoneForWhatsApp(customerMobile);
    const url     = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(lines.join('\n'))}`
      : `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = async () => {
    if (!emailTo) { toast.error('Please enter an email address'); return; }
    setSending(true);
    try {
      const body = { to: emailTo };
      if (publicPdfUrl) body.publicUrl = publicPdfUrl;
      const res = await apiFetch(`/${type}s/${id}/email`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Email sent to ${emailTo}`);
        setEmailModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Email failed');
      }
    } catch (err) {
      toast.error('Email failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  /* ── Styling helpers ────────────────────────────────────────────── */
  const BAR_H  = compact ? 42 : 50;
  const BTN_H  = compact ? 28 : 32;
  const BTN_PX = compact ? '8px 12px' : '6px 14px';
  const BTN_FS = compact ? 11 : 12;

  const btn = (bg, color = '#fff', extra = {}) => ({
    ...buttonStyle,
    background: bg, color,
    padding: BTN_PX, fontSize: BTN_FS, fontWeight: 600,
    borderRadius: 5, height: BTN_H,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
    ...extra,
  });

  return (
    <>
      <div className="no-print" style={{
        position: sticky ? 'sticky' : 'relative',
        top: 0, zIndex: 100,
        background: theme.primary,
        color: '#fff',
        padding: `0 18px`,
        height: BAR_H,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,.2)',
        flexWrap: 'nowrap',
        overflowX: 'auto',
      }}>
        {/* Back */}
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.45)', color: '#fff', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
          >
            ← Back
          </button>
        )}

        {/* Document label */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, opacity: 0.95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {docNo || `${type} #${id}`}
          {status && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '.5pt' }}>
              · {status}
            </span>
          )}
        </span>

        {/* Edit */}
        {isEditable && onEdit && (
          <button onClick={onEdit} style={btn('#059669')}>✏ Edit</button>
        )}

        {/* Print */}
        <button onClick={handlePrint} style={btn('rgba(255,255,255,.18)', '#fff')}>🖨 Print</button>

        {/* PDF */}
        <button onClick={handlePdf}   style={btn('rgba(255,255,255,.18)', '#fff')}>⬇ PDF</button>

        {/* WhatsApp */}
        <button onClick={handleWhatsApp} style={btn('#25d366')}>💬 WhatsApp</button>

        {/* Email */}
        <button onClick={() => { setEmailTo(customerEmail || ''); setEmailModal(true); }} style={btn('#0d6efd')}>✉ Email</button>

        {/* Convert */}
        {isConvertible && onConvert && (
          <button onClick={onConvert} style={btn('#f59e0b', '#fff')}>🔄 {convertLabel}</button>
        )}
      </div>

      {/* Email modal */}
      {emailModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 24,
            width: '90%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,.25)',
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Send by email</h3>
            <input
              type="email"
              placeholder="recipient@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
              autoFocus
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid #dee2e6', borderRadius: 5,
                fontSize: 14, boxSizing: 'border-box', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setEmailModal(false); setEmailTo(''); }}
                style={btn('#6c757d')}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={btn(theme.primary, '#fff', { opacity: sending ? 0.7 : 1 })}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * DocActions — Print, PDF, WhatsApp, Email action buttons.
 * Used inline in list cards.  For the sticky view-page bar, use DocumentActionBar.
 *
 * Props:
 *   type           'quotation' | 'order' | 'invoice'
 *   id             number
 *   docNo          string   (e.g. "QUO0003")
 *   docDate        string   (ISO date, optional — shown in WhatsApp message)
 *   amount         number
 *   customerMobile string
 *   customerName   string
 *   customerEmail  string   (pre-fills email modal)
 *   publicPdfUrl   string   (included in WhatsApp/email)
 */
import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { theme, buttonStyle } from '../theme';
import { toast } from '../utils/toast';
import { normalizePhoneForWhatsApp } from '../utils/phone';
import { company } from '../config/company';

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DocActions({
  type, id, docNo, docDate, amount,
  customerMobile, customerName, customerEmail,
  publicPdfUrl,
}) {
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo,    setEmailTo]    = useState(customerEmail || '');
  const [sending,    setSending]    = useState(false);

  /* ── Print ────────────────────────────────────────────────────────── */
  const handlePrint = () => {
    if (type === 'quotation') {
      window.open(`/quotations/${id}/print`, '_blank');
    } else {
      window.print();
    }
  };

  /* ── PDF download ─────────────────────────────────────────────────── */
  const handleDownloadPdf = async () => {
    try {
      const res = await apiFetch(`/${type}s/${id}/pdf`);
      if (!res.ok) { toast.error('PDF generation failed'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${docNo || (type + '-' + id)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('PDF download failed: ' + err.message);
    }
  };

  /* ── WhatsApp ──────────────────────────────────────────────────────── */
  const handleWhatsApp = () => {
    const name    = customerName || 'there';
    const refNo   = docNo || `#${id}`;
    const dateStr = fmtDate(docDate);
    const amtStr  = amount ? fmtAmt(amount) : '';

    const lines = [
      `Hello ${name},`,
      ``,
      `Please find your quotation.`,
      ``,
      `Quotation No: ${refNo}`,
      dateStr ? `Date: ${dateStr}`    : null,
      amtStr  ? `Amount: ${amtStr}`  : null,
      publicPdfUrl ? `\nDownload PDF:\n${publicPdfUrl}` : null,
      ``,
      `Regards,`,
      company.name,
    ].filter((l) => l !== null);

    const msg     = lines.join('\n');
    const waPhone = normalizePhoneForWhatsApp(customerMobile);
    const waUrl   = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  /* ── Email ────────────────────────────────────────────────────────── */
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
        setEmailTo('');
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

  const btn = (extra = {}) => ({
    ...buttonStyle,
    padding: '6px 13px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 5,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    border: 'none',
    whiteSpace: 'nowrap',
    ...extra,
  });

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={handlePrint}        style={btn({ background: '#6c757d', color: '#fff' })}>🖨 Print</button>
        <button onClick={handleDownloadPdf}  style={btn({ background: theme.primary, color: '#fff' })}>⬇ PDF</button>
        <button onClick={handleWhatsApp}     style={btn({ background: '#25d366', color: '#fff' })}>💬 WhatsApp</button>
        <button onClick={() => { setEmailTo(customerEmail || ''); setEmailModal(true); }}
                                             style={btn({ background: '#0d6efd', color: '#fff' })}>✉ Email</button>
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
                style={btn({ background: '#6c757d', color: '#fff' })}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={btn({ background: theme.primary, color: '#fff', opacity: sending ? 0.7 : 1 })}
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

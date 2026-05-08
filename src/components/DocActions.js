import React, { useState } from "react";
import { apiFetch } from "../utils/api";
import { theme, buttonStyle } from "../theme";
import { toast } from "../utils/toast";

/**
 * Reusable document action buttons: Print, Download PDF, WhatsApp, Email
 * Props:
 *   type: 'quotation' | 'order' | 'invoice'
 *   id: number
 *   customerMobile: string (optional)
 *   customerName: string (optional)
 *   customerEmail: string (optional, pre-fills email modal)
 *   docNo: string
 *   amount: number
 *   publicPdfUrl: string (optional, used for WhatsApp/email link)
 */
export default function DocActions({
  type, id, customerMobile, customerName, customerEmail, docNo, amount, publicPdfUrl,
}) {
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo]       = useState(customerEmail || "");
  const [sending, setSending]       = useState(false);

  const handlePrint = () => {
    if (type === 'quotation') {
      window.open(`/quotations/${id}/print`, '_blank');
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await apiFetch(`/${type}s/${id}/pdf`);
      if (!res.ok) {
        toast.error("PDF generation failed");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${docNo || (type + '-' + id)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("PDF download failed: " + err.message);
    }
  };

  const handleWhatsApp = () => {
    const name    = customerName || 'there';
    const refNo   = docNo || ('#' + id);
    const amt     = amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '';
    const company = 'Hesh Store';

    const lines = [
      `Hello ${name},`,
      ``,
      `Please find your ${type}:`,
      `${refNo}`,
      amt ? `Total: ${amt}` : '',
      publicPdfUrl ? `\nView PDF:\n${publicPdfUrl}` : '',
      ``,
      `Regards,`,
      company,
    ].filter((l) => l !== null && l !== undefined);

    const msg    = lines.join('\n');
    const mobile = (customerMobile || '').replace(/\D/g, '');
    const waUrl  = mobile
      ? `https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank");
  };

  const handleSendEmail = async () => {
    if (!emailTo) {
      toast.error("Please enter an email address");
      return;
    }
    setSending(true);
    try {
      const body = { to: emailTo };
      if (publicPdfUrl) body.publicUrl = publicPdfUrl;

      const res = await apiFetch(`/${type}s/${id}/email`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Email sent to ${emailTo}`);
        setEmailModal(false);
        setEmailTo("");
      } else {
        const err = await res.json();
        toast.error(err.message || "Email failed");
      }
    } catch (err) {
      toast.error("Email failed: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const btnBase = {
    ...buttonStyle,
    padding: "7px 14px",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handlePrint} style={{ ...btnBase, background: "#6c757d" }}>
          🖨 Print
        </button>
        <button onClick={handleDownloadPdf} style={{ ...btnBase, background: theme.primary }}>
          ⬇ PDF
        </button>
        <button onClick={handleWhatsApp} style={{ ...btnBase, background: "#25d366" }}>
          💬 WhatsApp
        </button>
        <button onClick={() => setEmailModal(true)} style={{ ...btnBase, background: "#0d6efd" }}>
          ✉ Email
        </button>
      </div>

      {/* Email modal */}
      {emailModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 10,
            padding: 24,
            width: "90%",
            maxWidth: 400,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Send by Email</h3>
            <input
              type="email"
              placeholder="recipient@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid #dee2e6",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setEmailModal(false); setEmailTo(""); }}
                style={{ ...btnBase, background: "#6c757d" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={{ ...btnBase, opacity: sending ? 0.7 : 1 }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

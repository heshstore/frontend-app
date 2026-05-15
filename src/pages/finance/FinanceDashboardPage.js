import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "18px 20px",
  marginBottom: 16,
};

function fmt(n) {
  return `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, w] = await Promise.all([
        apiFetch("/finance-ops/dashboard").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/finance-ops/warnings").then((r) => (r.ok ? r.json() : [])),
      ]);
      setDash(d);
      setWarnings(Array.isArray(w) ? w : []);
    } catch {
      toast.error("Failed to load finance dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div style={{ padding: 24, color: "#64748b" }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Finance operations</h1>
      <p style={{ margin: "6px 0 20px", color: "#64748b", fontSize: 13 }}>
        Operational receivables, payables, and cashflow signals — not accounting or GST posting.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => navigate("/finance/customer-payments")}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            background: "#005fb8",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Customer payments
        </button>
        <button
          type="button"
          onClick={() => navigate("/finance/vendor-payments")}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Vendor payments
        </button>
        <button
          type="button"
          onClick={() => navigate("/accounts/outstanding")}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Order outstanding (legacy)
        </button>
      </div>

      {warnings.length > 0 && (
        <div style={{ ...card, borderColor: "#fcd34d", background: "#fffbeb" }}>
          <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 14 }}>Credit & collection warnings</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#92400e" }}>
            {warnings.map((w) => (
              <li key={w.code + (w.meta?.customerId || "") + w.message.slice(0, 40)}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total receivables (outstanding)", v: fmt(dash?.total_receivables_outstanding) },
          { label: "Total payables (outstanding)", v: fmt(dash?.total_payables_outstanding) },
          { label: "Overdue collections", v: fmt(dash?.overdue_receivables_amount), sub: `${dash?.overdue_receivables_count ?? 0} line(s)` },
          { label: "Overdue vendor payments", v: fmt(dash?.overdue_payables_amount), sub: `${dash?.overdue_payables_count ?? 0} line(s)` },
          { label: "Expected incoming (30d)", v: fmt(dash?.expected_incoming_30d) },
          { label: "Expected outgoing (30d)", v: fmt(dash?.expected_outgoing_30d) },
          { label: "Customer exposure", v: fmt(dash?.customer_exposure) },
          { label: "Vendor exposure", v: fmt(dash?.vendor_exposure) },
        ].map((x) => (
          <div key={x.label} style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{x.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{x.v}</div>
            {x.sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{x.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

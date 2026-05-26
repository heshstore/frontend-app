import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

function fmt(n) {
  const v = Number(n ?? 0);
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(2)}L`;
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function MetricCard({ label, value, sub, href, urgent, navigate }) {
  const [hov, setHov] = useState(false);
  const clickable = Boolean(href);

  return (
    <div
      onClick={clickable ? () => navigate(href) : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: urgent ? "#fff9f9" : "#fff",
        border: `1px solid ${urgent ? "#fca5a5" : "#e2e8f0"}`,
        borderLeft: urgent ? "4px solid #dc2626" : "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "18px 20px",
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.1s",
        boxShadow: hov && clickable ? "0 4px 16px rgba(0,0,0,0.09)" : "none",
        transform: hov && clickable ? "translateY(-1px)" : "none",
        flex: 1,
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: urgent ? "#dc2626" : "#0f172a", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
      {clickable && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, opacity: hov ? 1 : 0.5, transition: "opacity 0.1s" }}>View →</div>}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const resync = async () => {
    setResyncing(true);
    try {
      const r = await apiFetch("/finance-ops/admin/resync-open", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || `Error ${r.status}`);
      toast.success(`Resynced ${d.receivables ?? 0} receivables, ${d.payables ?? 0} payables`);
      await load();
    } catch (e) {
      toast.error(e.message || "Resync failed");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Finance Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Operational receivables, payables, and cashflow signals.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/invoices")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Invoices
          </button>
          <button
            onClick={() => navigate("/finance/customer-payments")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#005fb8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Customer Receipts
          </button>
          <button
            onClick={() => navigate("/finance/vendor-payments")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Vendor Payments
          </button>
          <button
            onClick={() => navigate("/accounts/outstanding")}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Outstanding
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading…" : "↻"}
          </button>
          <button
            onClick={resync}
            disabled={resyncing || loading}
            title="Recalculate all outstanding balances from payment records"
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 600, fontSize: 13, cursor: resyncing ? "not-allowed" : "pointer", color: "#64748b" }}
          >
            {resyncing ? "Resyncing…" : "Resync"}
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 8 }}>
            ⚠️ {warnings.length} Finance Warning{warnings.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {warnings.map((w, i) => (
              <div key={`${w.code}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#92400e" }}>{w.message}</span>
                {w.code === "OVERDUE_RECEIVABLES" && (
                  <button
                    onClick={() => navigate("/finance/customer-payments?status=OVERDUE")}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fcd34d", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    View Overdue →
                  </button>
                )}
                {w.code === "CREDIT_LIMIT_EXCEEDED" && w.meta?.customerId && (
                  <button
                    onClick={() => navigate(`/edit-customer/${w.meta.customerId}`)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fcd34d", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    View Customer →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && !dash ? (
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>Loading…</div>
      ) : (
        <>
          {/* Receivables row */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Customer Receivables
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <MetricCard
              label="Total Outstanding"
              value={fmt(dash?.total_receivables_outstanding)}
              href="/finance/customer-payments"
              navigate={navigate}
            />
            <MetricCard
              label="Overdue Collections"
              value={fmt(dash?.overdue_receivables_amount)}
              sub={`${dash?.overdue_receivables_count ?? 0} order(s) overdue`}
              href="/finance/customer-payments"
              urgent={(dash?.overdue_receivables_count ?? 0) > 0}
              navigate={navigate}
            />
            <MetricCard
              label="Expected Incoming (30d)"
              value={fmt(dash?.expected_incoming_30d)}
              sub="Due within 30 days"
              href="/finance/customer-payments"
              navigate={navigate}
            />
            <MetricCard
              label="Customer Exposure"
              value={fmt(dash?.customer_exposure)}
              navigate={navigate}
            />
          </div>

          {/* Payables row */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Vendor Payables
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <MetricCard
              label="Total Outstanding"
              value={fmt(dash?.total_payables_outstanding)}
              href="/finance/vendor-payments"
              navigate={navigate}
            />
            <MetricCard
              label="Overdue Vendor Payments"
              value={fmt(dash?.overdue_payables_amount)}
              sub={`${dash?.overdue_payables_count ?? 0} PO(s) overdue`}
              href="/finance/vendor-payments"
              urgent={(dash?.overdue_payables_count ?? 0) > 0}
              navigate={navigate}
            />
            <MetricCard
              label="Expected Outgoing (30d)"
              value={fmt(dash?.expected_outgoing_30d)}
              sub="Due within 30 days"
              href="/finance/vendor-payments"
              navigate={navigate}
            />
            <MetricCard
              label="Vendor Exposure"
              value={fmt(dash?.vendor_exposure)}
              navigate={navigate}
            />
          </div>

          {/* Workflow shortcuts */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 12 }}>Finance Workflow</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: "#64748b" }}>
              <button onClick={() => navigate("/quotations")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151" }}>Quotations</button>
              <span style={{ color: "#94a3b8" }}>→</span>
              <button onClick={() => navigate("/orders")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151" }}>Orders</button>
              <span style={{ color: "#94a3b8" }}>→</span>
              <button onClick={() => navigate("/invoices")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>Invoices 🧾</button>
              <span style={{ color: "#94a3b8" }}>→</span>
              <button onClick={() => navigate("/finance/customer-payments")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #bbf7d0", background: "#f0fdf4", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#15803d" }}>Collections 💵</button>
              <span style={{ color: "#94a3b8" }}>→</span>
              <button onClick={() => navigate("/dispatch")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151" }}>Dispatch</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 14,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
};

const th = {
  padding: "10px 12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  textAlign: "left",
  fontWeight: 600,
  color: "#475569",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const td = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };

const MODES = ["CASH", "BANK", "UPI", "CHEQUE", "OTHER"];

const STATUS_BADGE = {
  PENDING: { bg: "#fff7ed", color: "#c2410c" },
  PARTIAL: { bg: "#eff6ff", color: "#1d4ed8" },
  PAID:    { bg: "#f0fdf4", color: "#15803d" },
  OVERDUE: { bg: "#fff1f2", color: "#be123c" },
};

function StatusBadge({ status }) {
  const s = (status || "PENDING").toUpperCase();
  const m = STATUS_BADGE[s] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ background: m.bg, color: m.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
      {s}
    </span>
  );
}

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function CustomerPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initStatus = (searchParams.get("status") || "").toUpperCase();

  const [receivables, setReceivables] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initStatus);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({
    orderId: "",
    amount: "",
    paymentMode: "UPI",
    paymentReference: "",
    remarks: "",
  });

  // Sync URL param changes into filter (e.g. from Finance Dashboard link)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const p = (searchParams.get("status") || "").toUpperCase();
    setStatusFilter(p);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set("status", statusFilter);
      const entQ = new URLSearchParams({ paymentType: "CUSTOMER_RECEIPT" });
      if (dateFrom) entQ.set("from", dateFrom);
      if (dateTo)   entQ.set("to", dateTo);
      const [r1, r2] = await Promise.all([
        apiFetch(`/finance-ops/receivables?${q}`).then((x) => (x.ok ? x.json() : [])),
        apiFetch(`/finance-ops/payment-entries?${entQ}`).then((x) => (x.ok ? x.json() : [])),
      ]);
      setReceivables(Array.isArray(r1) ? r1 : []);
      setEntries(Array.isArray(r2) ? r2 : []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const orderId = Number(form.orderId);
    const amount  = Number(form.amount);
    if (!orderId || !amount) { toast.error("Order ID and amount required"); return; }
    try {
      const res = await apiFetch("/finance-ops/customer-receipts", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          amount,
          paymentMode: form.paymentMode,
          paymentReference: form.paymentReference || undefined,
          remarks: form.remarks || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message || "Payment failed"); return; }
      toast.success("Receipt recorded");
      setForm({ orderId: "", amount: "", paymentMode: "UPI", paymentReference: "", remarks: "" });
      load();
    } catch {
      toast.error("Server error");
    }
  };

  const filteredReceivables = receivables.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(r.order_id).includes(q) ||
      (r.order_no || "").toLowerCase().includes(q) ||
      (r.customer_name || "").toLowerCase().includes(q)
    );
  });

  const overdueCount = receivables.filter((r) => (r.status || "").toUpperCase() === "OVERDUE").length;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Customer Receipts</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Receivables status and incoming payment log.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/finance")}
            style={{ padding: "7px 13px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            ← Finance Dashboard
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loading…" : "↻"}
          </button>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && !statusFilter && (
        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#be123c" }}>
            ⚠ {overdueCount} overdue receivable{overdueCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setStatusFilter("OVERDUE"); setSearchParams({ status: "OVERDUE" }); }}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecdd3", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Filter Overdue
          </button>
        </div>
      )}

      {/* Record receipt form */}
      <form onSubmit={submit} style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, color: "#374151" }}>Record Receipt</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <label>
            <span style={{ fontSize: 11, color: "#64748b" }}>Order ID</span>
            <input style={inputStyle} value={form.orderId} onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))} />
          </label>
          <label>
            <span style={{ fontSize: 11, color: "#64748b" }}>Amount (₹)</span>
            <input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          </label>
          <label>
            <span style={{ fontSize: 11, color: "#64748b" }}>Mode</span>
            <select style={inputStyle} value={form.paymentMode} onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Reference (UTR / cheque no.)</span>
            <input style={inputStyle} value={form.paymentReference} onChange={(e) => setForm((p) => ({ ...p, paymentReference: e.target.value }))} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Remarks</span>
            <input style={inputStyle} value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
          </label>
        </div>
        <button
          type="submit"
          style={{ marginTop: 12, padding: "9px 18px", border: "none", borderRadius: 8, background: "#005fb8", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
        >
          Save Receipt
        </button>
      </form>

      {/* Receivables section */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        Open Receivables
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search customer name, order no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setSearchParams(e.target.value ? { status: e.target.value } : {}); }}
          style={{ ...inputStyle, width: 150 }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="PAID">PAID</option>
        </select>
        {statusFilter && (
          <button
            onClick={() => { setStatusFilter(""); setSearchParams({}); }}
            style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Clear filter ✕
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
          {filteredReceivables.length} row{filteredReceivables.length !== 1 ? "s" : ""}
          {filteredReceivables.length !== receivables.length ? ` of ${receivables.length}` : ""}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Order</th>
                <th style={th}>Customer</th>
                <th style={th}>Order Status</th>
                <th style={th}>Receivable</th>
                <th style={th}>Total Value</th>
                <th style={th}>Received</th>
                <th style={th}>Outstanding</th>
                <th style={th}>Due Date</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 24 }}>
                    {receivables.length === 0 ? "No receivables found." : "No rows match your filter."}
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((r) => {
                  const isOverdue = (r.status || "").toUpperCase() === "OVERDUE";
                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: isOverdue ? "#fff9f9" : "#fff",
                        borderLeft: isOverdue ? "3px solid #dc2626" : "3px solid transparent",
                      }}
                    >
                      <td style={td}>
                        <button
                          onClick={() => navigate(`/orders/${r.order_id}`)}
                          style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          #{r.order_id} {r.order_no ? `· ${r.order_no}` : ""}
                        </button>
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: "#111827" }}>
                        {r.customer_name || "—"}
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>
                          {r.order_status || "—"}
                        </span>
                      </td>
                      <td style={td}><StatusBadge status={r.status} /></td>
                      <td style={td}>{fmt(r.total_order_value)}</td>
                      <td style={{ ...td, color: "#15803d" }}>{fmt(r.received_amount)}</td>
                      <td style={{ ...td, fontWeight: 700, color: isOverdue ? "#dc2626" : "#0f172a" }}>
                        {fmt(r.outstanding_amount)}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: isOverdue ? "#dc2626" : "#64748b" }}>
                        {r.due_date ? new Date(r.due_date).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={td}>
                        <button
                          onClick={() => navigate(`/accounts/payment/${r.order_id}`)}
                          style={{ background: "#005fb8", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment log section */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 24 }}>
        Payment Log
      </div>

      {/* Date range filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ ...inputStyle, width: 150 }}
          />
        </label>
        <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ ...inputStyle, width: 150 }}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Clear ✕
          </button>
        )}
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Order</th>
                <th style={th}>Mode</th>
                <th style={th}>Reference</th>
                <th style={th}>Amount</th>
                <th style={th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 24 }}>
                    No payment entries found.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...td, fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                      {e.payment_date ? new Date(e.payment_date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => navigate(`/orders/${e.reference_id}`)}
                        style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        #{e.reference_id}{e.order_no ? ` · ${e.order_no}` : ""}
                      </button>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>
                        {e.payment_mode || "—"}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                      {e.payment_reference || "—"}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#15803d" }}>{fmt(e.amount)}</td>
                    <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{e.remarks || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

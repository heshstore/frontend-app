import React, { useCallback, useEffect, useState } from "react";
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

const MODES = ["CASH", "BANK", "UPI", "CHEQUE", "OTHER"];

export default function CustomerPaymentsPage() {
  const [receivables, setReceivables] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    orderId: "",
    amount: "",
    paymentMode: "UPI",
    paymentReference: "",
    remarks: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set("status", statusFilter);
      const [r1, r2] = await Promise.all([
        apiFetch(`/finance-ops/receivables?${q}`).then((x) => (x.ok ? x.json() : [])),
        apiFetch("/finance-ops/payment-entries?paymentType=CUSTOMER_RECEIPT").then((x) => (x.ok ? x.json() : [])),
      ]);
      setReceivables(Array.isArray(r1) ? r1 : []);
      setEntries(Array.isArray(r2) ? r2 : []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const orderId = Number(form.orderId);
    const amount = Number(form.amount);
    if (!orderId || !amount) {
      toast.error("Order ID and amount required");
      return;
    }
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
      if (!res.ok) {
        toast.error(d.message || "Payment failed");
        return;
      }
      toast.success("Receipt recorded");
      setForm({ orderId: "", amount: "", paymentMode: "UPI", paymentReference: "", remarks: "" });
      load();
    } catch {
      toast.error("Server error");
    }
  };

  if (loading && !receivables.length) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Customer payments</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Receipts update order balances and operational receivables.</p>

      <form onSubmit={submit} style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Record receipt</div>
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
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
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
          style={{
            marginTop: 12,
            padding: "9px 18px",
            border: "none",
            borderRadius: 8,
            background: "#005fb8",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save receipt
        </button>
      </form>

      <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Receivable status</span>
        <select style={{ ...inputStyle, width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING">PENDING</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Open receivables</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Order</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Recv. row</th>
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Received</th>
                <th style={{ padding: 8 }}>Outstanding</th>
                <th style={{ padding: 8 }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>
                    #{r.order_id} {r.order_no || ""}
                  </td>
                  <td style={{ padding: 8 }}>{r.order_status}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                  <td style={{ padding: 8 }}>₹{Number(r.total_order_value).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8 }}>₹{Number(r.received_amount).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>₹{Number(r.outstanding_amount).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8 }}>{r.due_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!receivables.length && <div style={{ color: "#94a3b8", padding: 8 }}>No rows (or filter empty).</div>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Payment log (customer)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Order</th>
                <th style={{ padding: 8 }}>Mode</th>
                <th style={{ padding: 8 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{e.payment_date}</td>
                  <td style={{ padding: 8 }}>#{e.reference_id} {e.order_no || ""}</td>
                  <td style={{ padding: 8 }}>{e.payment_mode}</td>
                  <td style={{ padding: 8 }}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

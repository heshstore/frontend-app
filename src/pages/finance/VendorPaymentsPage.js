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

export default function VendorPaymentsPage() {
  const [payables, setPayables] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    purchaseOrderId: "",
    amount: "",
    paymentMode: "BANK",
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set("status", statusFilter);
      const [r1, r2] = await Promise.all([
        apiFetch(`/finance-ops/payables?${q}`).then((x) => (x.ok ? x.json() : [])),
        apiFetch("/finance-ops/payment-entries?paymentType=VENDOR_PAYMENT").then((x) => (x.ok ? x.json() : [])),
      ]);
      setPayables(Array.isArray(r1) ? r1 : []);
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
    const purchaseOrderId = Number(form.purchaseOrderId);
    const amount = Number(form.amount);
    if (!purchaseOrderId || !amount) {
      toast.error("PO ID and amount required");
      return;
    }
    try {
      const res = await apiFetch("/finance-ops/vendor-payments", {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderId,
          amount,
          paymentMode: form.paymentMode,
          paymentDate: form.paymentDate || undefined,
          remarks: form.remarks || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(Array.isArray(d.message) ? d.message.join(", ") : d.message || "Payment failed");
        return;
      }
      toast.success("Vendor payment recorded");
      setForm({
        purchaseOrderId: "",
        amount: "",
        paymentMode: "BANK",
        paymentDate: new Date().toISOString().slice(0, 10),
        remarks: "",
      });
      load();
    } catch {
      toast.error("Server error");
    }
  };

  if (loading && !payables.length) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Vendor payments</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Operational vendor exposure — tied to purchase orders.</p>

      <form onSubmit={submit} style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Record vendor payment</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          <label>
            <span style={{ fontSize: 11, color: "#64748b" }}>Purchase order ID</span>
            <input
              style={inputStyle}
              value={form.purchaseOrderId}
              onChange={(e) => setForm((p) => ({ ...p, purchaseOrderId: e.target.value }))}
            />
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
          <label>
            <span style={{ fontSize: 11, color: "#64748b" }}>Payment date</span>
            <input style={inputStyle} type="date" value={form.paymentDate} onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))} />
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
            background: "#0f766e",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save payment
        </button>
      </form>

      <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Payable status</span>
        <select style={{ ...inputStyle, width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING">PENDING</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Open payables</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>PO</th>
                <th style={{ padding: 8 }}>PO status</th>
                <th style={{ padding: 8 }}>Payable</th>
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Paid</th>
                <th style={{ padding: 8 }}>Outstanding</th>
                <th style={{ padding: 8 }}>Due</th>
              </tr>
            </thead>
            <tbody>
              {payables.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>
                    #{r.purchase_order_id} {r.po_number || ""}
                  </td>
                  <td style={{ padding: 8 }}>{r.po_status}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                  <td style={{ padding: 8 }}>₹{Number(r.total_po_value).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8 }}>₹{Number(r.paid_amount).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>₹{Number(r.outstanding_amount).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 8 }}>{r.due_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payables.length && <div style={{ color: "#94a3b8", padding: 8 }}>No rows.</div>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Payment log (vendor)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>PO #</th>
                <th style={{ padding: 8 }}>Mode</th>
                <th style={{ padding: 8 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{e.payment_date}</td>
                  <td style={{ padding: 8 }}>#{e.reference_id}</td>
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

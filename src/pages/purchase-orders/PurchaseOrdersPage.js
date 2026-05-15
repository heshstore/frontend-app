import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const btn = (bg, color = "#fff") => ({
  background: bg, color, border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});

const STATUS_COLOR = {
  DRAFT:              { bg: "#f1f5f9", color: "#475569" },
  SENT:               { bg: "#dbeafe", color: "#1d4ed8" },
  PARTIAL_RECEIVED:   { bg: "#fef3c7", color: "#92400e" },
  RECEIVED:           { bg: "#dcfce7", color: "#15803d" },
  CANCELLED:          { bg: "#fee2e2", color: "#b91c1c" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 99,
    }}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = fStatus ? `?status=${encodeURIComponent(fStatus)}` : "";
      const r = await apiFetch(`/purchase-orders${q}`);
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [fStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Purchase orders</h1>
      <p style={{ margin: "4px 0 16px", color: "#64748b", fontSize: 13 }}>
        Raised from purchase requirements — receive material to post stock in.
      </p>

      <div style={{
        display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
        padding: "12px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      }}>
        <select
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["DRAFT", "SENT", "PARTIAL_RECEIVED", "RECEIVED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button style={btn("#005fb8")} onClick={load}>Refresh</button>
      </div>

      {loading ? <p style={{ color: "#94a3b8" }}>Loading…</p> : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 12 }}>PO #</th>
                <th style={{ padding: 12 }}>Vendor</th>
                <th style={{ padding: 12 }}>Expected</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12, textAlign: "right" }}>Amount</th>
                <th style={{ padding: 12, textAlign: "right" }}>Lines</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => (
                <tr
                  key={po.id}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
                >
                  <td style={{ padding: 12, fontWeight: 700, color: "#005fb8" }}>{po.po_number}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{po.vendor_name ?? po.vendorName}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{po.vendor_code ?? po.vendorCode}</div>
                  </td>
                  <td style={{ padding: 12, color: "#64748b" }}>
                    {(po.expected_date ?? po.expectedDate)
                      ? new Date(po.expected_date ?? po.expectedDate).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td style={{ padding: 12 }}><Badge status={po.status} /></td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>
                    ₹{Number(po.total_amount ?? po.totalAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", color: "#64748b" }}>{po.item_count ?? po.itemCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No purchase orders yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

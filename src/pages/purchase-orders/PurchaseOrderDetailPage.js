import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

const btn = (bg, color = "#fff") => ({
  background: bg, color, border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});
const inputStyle = {
  padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 100, boxSizing: "border-box",
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recvQty, setRecvQty] = useState({});
  const [warehouseId, setWarehouseId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, wh] = await Promise.all([
        apiFetch(`/purchase-orders/${id}`),
        apiFetch("/inventory/warehouses"),
      ]);
      if (!pr.ok) throw new Error();
      setPo(await pr.json());
      if (wh.ok) {
        const w = await wh.json();
        setWarehouses(Array.isArray(w) ? w : []);
      }
    } catch {
      toast.error("Failed to load PO");
      setPo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const wid = po?.warehouse_id ?? po?.warehouseId;
    if (wid) setWarehouseId(String(wid));
    else if (warehouses[0]) setWarehouseId(String(warehouses[0].id));
  }, [po, warehouses]);

  const setLineQty = (lineId, v) => {
    setRecvQty((p) => ({ ...p, [lineId]: v }));
  };

  const receive = async () => {
    const lines = (po.items || [])
      .map((it) => {
        const q = Number(recvQty[it.id] || 0);
        if (q <= 0) return null;
        return { purchaseOrderItemId: it.id, qty: q };
      })
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Enter receive qty on at least one line");
      return;
    }
    if (!warehouseId) {
      toast.error("Select warehouse");
      return;
    }
    try {
      const res = await apiFetch(`/purchase-orders/${id}/receive`, {
        method: "POST",
        body: JSON.stringify({ warehouseId: +warehouseId, lines }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Receive failed");
      }
      toast.success("Stock updated");
      setRecvQty({});
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!po) return <div style={{ padding: 24 }}>Not found</div>;

  const canReceive = !["RECEIVED", "CANCELLED", "DRAFT"].includes(po.status);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
      <button style={{ ...btn("#e2e8f0", "#374151"), marginBottom: 12 }} onClick={() => navigate("/purchase-orders")}>
        ← Back
      </button>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{po.po_number ?? po.poNumber}</h1>
      <p style={{ margin: "4px 0 16px", color: "#64748b", fontSize: 14 }}>
        {po.vendor_name ?? po.vendorName} · {po.status?.replace(/_/g, " ")}
        {(po.expected_date ?? po.expectedDate) &&
          ` · Expected ${new Date(po.expected_date ?? po.expectedDate).toLocaleDateString("en-IN")}`}
      </p>

      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20,
        padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Subtotal</div>
          <div style={{ fontWeight: 700 }}>₹{Number(po.subtotal ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>GST</div>
          <div style={{ fontWeight: 700 }}>₹{Number(po.gst_amount ?? po.gstAmount ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Total</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>₹{Number(po.total_amount ?? po.totalAmount ?? 0).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {canReceive && (
        <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Into warehouse</div>
            <select
              style={{ ...inputStyle, minWidth: 200 }}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </label>
          <button style={btn("#15803d")} onClick={receive}>Receive material</button>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: 12 }}>Item</th>
              <th style={{ padding: 12, textAlign: "right" }}>Qty</th>
              <th style={{ padding: 12, textAlign: "right" }}>Received</th>
              <th style={{ padding: 12, textAlign: "right" }}>Pending</th>
              <th style={{ padding: 12, textAlign: "right" }}>Rate</th>
              <th style={{ padding: 12, textAlign: "right" }}>GST %</th>
              <th style={{ padding: 12, textAlign: "right" }}>Line total</th>
              {canReceive && <th style={{ padding: 12 }}>Receive now</th>}
            </tr>
          </thead>
          <tbody>
            {(po.items || []).map((it) => {
              const qty = Number(it.qty ?? 0);
              const rec = Number(it.received_qty ?? it.receivedQty ?? 0);
              const pend = Math.max(0, qty - rec);
              const name = it.item_name ?? it.itemName;
              const src = it.item_source ?? it.itemSource;
              const gstp = it.gst_percent ?? it.gstPercent;
              const lt = it.line_total ?? it.lineTotal;
              return (
                <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{name || `Item #${it.item_id ?? it.itemId}`}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{src}</div>
                  </td>
                  <td style={{ padding: 12, textAlign: "right" }}>{qty.toLocaleString("en-IN")}</td>
                  <td style={{ padding: 12, textAlign: "right", color: "#15803d" }}>
                    {rec.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: pend ? "#b91c1c" : "#64748b" }}>
                    {pend.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: 12, textAlign: "right" }}>₹{Number(it.rate).toLocaleString("en-IN")}</td>
                  <td style={{ padding: 12, textAlign: "right" }}>{gstp}%</td>
                  <td style={{ padding: 12, textAlign: "right" }}>₹{Number(lt).toLocaleString("en-IN")}</td>
                  {canReceive && (
                    <td style={{ padding: 12 }}>
                      {pend > 0 ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max={pend}
                          style={inputStyle}
                          placeholder="0"
                          value={recvQty[it.id] ?? ""}
                          onChange={(e) => setLineQty(it.id, e.target.value)}
                        />
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

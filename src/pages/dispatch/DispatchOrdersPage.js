import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

function fmtQty(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const ST = {
  DRAFT: "#64748b",
  READY: "#1d4ed8",
  PARTIAL_DISPATCHED: "#c2410c",
  DISPATCHED: "#7c3aed",
  PARTIAL_DELIVERED: "#ca8a04",
  DELIVERED: "#15803d",
  CANCELLED: "#b91c1c",
};

function DispatchOrderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/dispatch/orders")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Could not load dispatch orders"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <button type="button" onClick={() => navigate("/dispatch")} style={{
          background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer",
        }}>← Ready orders</button>
        <h2 style={{ margin: 0, flex: 1, fontSize: 20 }}>Dispatch orders</h2>
        <button type="button" onClick={load} style={{
          background: "#005fb8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer",
        }}>Refresh</button>
      </div>
      {loading ? <div style={{ color: "#94a3b8", padding: 40 }}>Loading…</div> : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Dispatch #</th>
                <th style={{ padding: 12 }}>Order</th>
                <th style={{ padding: 12 }}>Customer</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 28, color: "#94a3b8", textAlign: "center" }}>No dispatch orders yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.dispatch_number ?? r.dispatchNumber}</td>
                  <td style={{ padding: 12 }}>{r.orderNo ?? r.order_no}</td>
                  <td style={{ padding: 12 }}>{r.customerName ?? r.customer_name}</td>
                  <td style={{ padding: 12, color: ST[r.status] ?? "#64748b", fontWeight: 700 }}>{r.status?.replace(/_/g, " ")}</td>
                  <td style={{ padding: 12 }}>
                    <Link to={`/dispatch/orders/${r.id}`} style={{ color: "#005fb8", fontWeight: 700 }}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DispatchOrderDetail({ id }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packDraft, setPackDraft] = useState({});

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/dispatch/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDoc(d);
        const pd = {};
        (d.lines ?? []).forEach((L) => {
          pd[L.id] = {
            packed: String(L.packed_qty ?? L.packedQty ?? ""),
            remarks: L.packing_remarks ?? L.packingRemarks ?? "",
            cartons: L.carton_count ?? L.cartonCount ?? "",
            delivered: String(L.delivered_qty ?? L.deliveredQty ?? ""),
          };
        });
        setPackDraft(pd);
      })
      .catch(() => toast.error("Failed to load dispatch"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patchPack = async (lineId) => {
    const p = packDraft[lineId];
    if (!p) return;
    const res = await apiFetch(`/dispatch/orders/${id}/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify({
        packedQty: Number(p.packed),
        packingRemarks: p.remarks || undefined,
        cartonCount: p.cartons === "" ? undefined : Number(p.cartons),
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message ?? "Pack failed");
    }
    toast.success("Packing saved");
    load();
  };

  const confirmDispatch = async () => {
    try {
      const res = await apiFetch(`/dispatch/orders/${id}/confirm-dispatch`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Confirm failed");
      }
      toast.success("Dispatch confirmed — stock OUT posted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const inTransit = async () => {
    try {
      const res = await apiFetch(`/dispatch/orders/${id}/in-transit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Failed");
      }
      toast.success("Marked in transit");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveDelivery = async () => {
    try {
      const lines = (doc?.lines ?? []).map((L) => ({
        id: L.id,
        deliveredQty: Number(packDraft[L.id]?.delivered ?? 0),
      }));
      const res = await apiFetch(`/dispatch/orders/${id}/delivery`, {
        method: "POST",
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Delivery update failed");
      }
      toast.success("Delivery saved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelDraft = async () => {
    if (!window.confirm("Cancel this draft dispatch?")) return;
    try {
      const res = await apiFetch(`/dispatch/orders/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Cancel failed");
      }
      toast.success("Cancelled");
      navigate("/dispatch/orders");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "#94a3b8", textAlign: "center" }}>Loading…</div>;
  if (!doc) return <div style={{ padding: 40 }}>Not found</div>;

  const status = doc.status;
  const canPack = status === "DRAFT" || status === "READY";
  const canConfirm = status === "DRAFT" || status === "READY";
  const canTransit = status === "DISPATCHED" || status === "PARTIAL_DISPATCHED";
  const canDeliver = ["DISPATCHED", "PARTIAL_DISPATCHED", "PARTIAL_DELIVERED"].includes(status);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={() => navigate("/dispatch/orders")} style={{
          background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer",
        }}>← List</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>DISPATCH</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{doc.dispatch_number ?? doc.dispatchNumber}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{doc.orderNo ?? doc.order_no} · {doc.customerName ?? doc.customer_name}</div>
        </div>
        <span style={{ fontWeight: 800, color: ST[status] ?? "#64748b" }}>{status?.replace(/_/g, " ")}</span>
      </div>

      {/* Pick list */}
      <div style={{ marginBottom: 22, background: "#f8fafc", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 10 }}>PICK LIST</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "6px 0" }}>Item</th>
              <th>SKU</th>
              <th>Ordered</th>
              <th>FG available</th>
              <th>Pending (line)</th>
            </tr>
          </thead>
          <tbody>
            {(doc.lines ?? []).map((L) => (
              <tr key={L.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>{L.orderItemName ?? L.item_name}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{L.orderSku ?? L.sku}</td>
                <td>{fmtQty(L.ordered_qty ?? L.orderedQty)}</td>
                <td style={{ fontWeight: 800, color: (L.fgStockAvailable ?? 0) > 0 ? "#15803d" : "#b91c1c" }}>
                  {fmtQty(L.fgStockAvailable)}
                </td>
                <td>{fmtQty(L.pending_qty ?? L.pendingQty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Packing */}
      {canPack && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 10 }}>PACKING</div>
          {(doc.lines ?? []).map((L) => (
            <div key={L.id} style={{
              border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10, background: "#fff",
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{L.orderItemName}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Packed qty</div>
                  <input
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    value={packDraft[L.id]?.packed ?? ""}
                    onChange={(e) => setPackDraft((s) => ({ ...s, [L.id]: { ...s[L.id], packed: e.target.value } }))}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Cartons (opt.)</div>
                  <input
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    value={packDraft[L.id]?.cartons ?? ""}
                    onChange={(e) => setPackDraft((s) => ({ ...s, [L.id]: { ...s[L.id], cartons: e.target.value } }))}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Packing notes</div>
                  <input
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", boxSizing: "border-box" }}
                    value={packDraft[L.id]?.remarks ?? ""}
                    onChange={(e) => setPackDraft((s) => ({ ...s, [L.id]: { ...s[L.id], remarks: e.target.value } }))}
                  />
                </label>
              </div>
              <button type="button" onClick={() => patchPack(L.id).catch((e) => toast.error(e.message))} style={{
                marginTop: 10, background: "#005fb8", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 14px", fontWeight: 700, cursor: "pointer",
              }}>Save packing</button>
            </div>
          ))}
        </div>
      )}

      {/* Logistics header */}
      <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <input placeholder="Transporter" style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          defaultValue={doc.transporter_name ?? doc.transporterName ?? ""}
          onBlur={async (e) => {
            await apiFetch(`/dispatch/orders/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ transporterName: e.target.value || undefined }),
            });
          }}
        />
        <input placeholder="LR number" style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          defaultValue={doc.lr_number ?? doc.lrNumber ?? ""}
          onBlur={async (e) => {
            await apiFetch(`/dispatch/orders/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ lrNumber: e.target.value || undefined }),
            });
          }}
        />
        <input placeholder="Tracking #" style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          defaultValue={doc.tracking_number ?? doc.trackingNumber ?? ""}
          onBlur={async (e) => {
            await apiFetch(`/dispatch/orders/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ trackingNumber: e.target.value || undefined }),
            });
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 1, marginBottom: 8 }}>
          DISPATCH COSTS (₹) — operational only
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Packing"
            disabled={!canPack}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db", opacity: canPack ? 1 : 0.7 }}
            defaultValue={doc.packing_cost ?? doc.packingCost ?? ""}
            onBlur={async (e) => {
              if (!canPack) return;
              const v = Number(e.target.value);
              await apiFetch(`/dispatch/orders/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ packingCost: Number.isFinite(v) ? v : 0 }),
              });
            }}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Logistics"
            disabled={!canPack}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db", opacity: canPack ? 1 : 0.7 }}
            defaultValue={doc.logistics_cost ?? doc.logisticsCost ?? ""}
            onBlur={async (e) => {
              if (!canPack) return;
              const v = Number(e.target.value);
              await apiFetch(`/dispatch/orders/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ logisticsCost: Number.isFinite(v) ? v : 0 }),
              });
            }}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Misc"
            disabled={!canPack}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db", opacity: canPack ? 1 : 0.7 }}
            defaultValue={doc.misc_cost ?? doc.miscCost ?? ""}
            onBlur={async (e) => {
              if (!canPack) return;
              const v = Number(e.target.value);
              await apiFetch(`/dispatch/orders/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ miscCost: Number.isFinite(v) ? v : 0 }),
              });
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {canConfirm && (
          <button type="button" onClick={confirmDispatch} style={{
            background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "12px 18px", fontWeight: 800, cursor: "pointer",
          }}>Confirm dispatch (stock OUT)</button>
        )}
        {canTransit && (
          <button type="button" onClick={inTransit} style={{
            background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "12px 18px", fontWeight: 800, cursor: "pointer",
          }}>Mark in transit</button>
        )}
        {canDeliver && (
          <button type="button" onClick={saveDelivery} style={{
            background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 18px", fontWeight: 800, cursor: "pointer",
          }}>Save delivery qty</button>
        )}
        {canConfirm && (
          <button type="button" onClick={cancelDraft} style={{
            background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, padding: "12px 18px", fontWeight: 700, cursor: "pointer",
          }}>Cancel draft</button>
        )}
      </div>

      {/* Delivery per line */}
      {canDeliver && (
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", letterSpacing: 1, marginBottom: 10 }}>DELIVERY</div>
          {(doc.lines ?? []).map((L) => (
            <div key={`d-${L.id}`} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{L.orderItemName}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>Dispatched {fmtQty(L.dispatched_qty ?? L.dispatchedQty)}</span>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                Delivered
                <input
                  type="number" min="0" step="0.01"
                  style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}
                  value={packDraft[L.id]?.delivered ?? ""}
                  onChange={(e) => setPackDraft((s) => ({ ...s, [L.id]: { ...s[L.id], delivered: e.target.value } }))}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DispatchOrdersPage() {
  const { id } = useParams();
  if (id) return <DispatchOrderDetail id={id} />;
  return <DispatchOrderList />;
}

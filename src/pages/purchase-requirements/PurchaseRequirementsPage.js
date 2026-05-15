import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";
import { hasAnyPermission } from "../../utils/usePermission";

// ── Styles ────────────────────────────────────────────────────────────────────

const card = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
  padding: "20px 24px", marginBottom: 20,
};

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = {
  padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
  textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap",
};
const td = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

const inputStyle = {
  padding: "8px 10px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 13, boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };

const btn = (bg, color = "#fff") => ({
  background: bg, color, border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap",
});

// ── Badge helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  PENDING:   { bg: "#fef9c3", color: "#854d0e" },
  APPROVED:  { bg: "#dbeafe", color: "#1d4ed8" },
  ORDERED:   { bg: "#dcfce7", color: "#15803d" },
  CANCELLED: { bg: "#f1f5f9", color: "#64748b" },
};

const PRIORITY_STYLE = {
  LOW:    { bg: "#f1f5f9", color: "#64748b" },
  MEDIUM: { bg: "#dbeafe", color: "#1d4ed8" },
  HIGH:   { bg: "#ffedd5", color: "#c2410c" },
  URGENT: { bg: "#fee2e2", color: "#b91c1c" },
};

function Badge({ text, map }) {
  const s = map[text] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({ req, onClose, onSaved }) {
  const [status,   setStatus]   = useState(req.status   ?? "PENDING");
  const [priority, setPriority] = useState(req.priority ?? "MEDIUM");
  const [notes,    setNotes]    = useState(req.notes    ?? "");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/purchase-requirements/${req.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, priority, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to save");
      }
      toast.success("Requirement updated");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 28,
        width: 440, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18, color: "#0f172a" }}>
          Update Requirement #{req.id}
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
          {req.itemName} — shortage {fmt(req.shortage_qty)} {req.unit}
        </div>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Status</span>
          <select style={{ ...selectStyle, width: "100%" }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["PENDING", "APPROVED", "ORDERED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Priority</span>
          <select style={{ ...selectStyle, width: "100%" }} value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Notes</span>
          <textarea
            style={{ ...inputStyle, width: "100%", minHeight: 72, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
          />
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={btn("#e2e8f0", "#374151")} onClick={onClose}>Cancel</button>
          <button style={btn("#005fb8")} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create PO from selected requirements ───────────────────────────────────────

function CreatePoModal({ requirementIds, requirements, onClose, onDone }) {
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [preview, setPreview] = useState([]);
  const [loadingPv, setLoadingPv] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const [v, w] = await Promise.all([
        apiFetch("/vendors?active=true"),
        apiFetch("/inventory/warehouses"),
      ]);
      if (c) return;
      if (v.ok) setVendors(await v.json());
      if (w.ok) {
        const arr = await w.json();
        setWarehouses(Array.isArray(arr) ? arr : []);
        if (arr[0]) setWarehouseId(String(arr[0].id));
      }
    })();
    return () => { c = true; };
  }, []);

  useEffect(() => {
    if (!vendorId || !requirementIds.length) {
      setPreview([]);
      setLoadingPv(false);
      return;
    }
    let c = false;
    (async () => {
      setLoadingPv(true);
      const sel = requirements.filter((r) => requirementIds.includes(r.id));
      const byItem = new Map();
      for (const r of sel) {
        const k = r.item_id ?? r.itemId;
        if (!byItem.has(k)) byItem.set(k, { prIds: [], shortage: 0, name: r.itemName });
        const g = byItem.get(k);
        g.prIds.push(r.id);
        g.shortage += Number(r.shortage_qty ?? r.shortageQty ?? 0);
      }
      const lines = [];
      for (const [itemId, g] of byItem) {
        const mRes = await apiFetch(`/vendor-item-mappings?itemId=${itemId}&itemSource=SERVICE`);
        if (!mRes.ok) continue;
        const maps = await mRes.json();
        const m = (maps || []).find((x) => Number(x.vendorId ?? x.vendor_id) === +vendorId);
        if (!m) {
          lines.push({
            itemId, itemName: g.name, ok: false, msg: "No price list for this vendor",
          });
          continue;
        }
        const moq = Number(m.minimumOrderQty ?? m.minimum_order_qty ?? 0);
        let qty = g.shortage;
        if (moq > 0 && qty < moq) qty = moq;
        const rate = Number(m.purchaseRate ?? m.purchase_rate ?? 0);
        const gstRes = await apiFetch(`/service-items/${itemId}`);
        let gst = 0;
        if (gstRes.ok) {
          const it = await gstRes.json();
          gst = Number(it.gst ?? 0);
        }
        const net = qty * rate;
        const lineTotal = net + net * (gst / 100);
        lines.push({
          itemId, itemName: g.name, qty, rate, gst, lineTotal, prIds: g.prIds, ok: true,
          moq, vendorSku: m.vendorSku ?? m.vendor_sku,
        });
      }
      if (!c) {
        setPreview(lines);
      }
      if (!c) setLoadingPv(false);
    })();
    return () => { c = true; };
  }, [vendorId, requirementIds, requirements]);

  const submit = async () => {
    if (!vendorId) { toast.error("Select a vendor"); return; }
    const okLines = preview.filter((l) => l.ok);
    if (!okLines.length) {
      toast.error("No order lines — add vendor mappings for these items");
      return;
    }
    if (preview.some((l) => !l.ok)) {
      toast.error("Fix missing vendor mappings (red lines) before creating the PO");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/purchase-orders/from-requirements", {
        method: "POST",
        body: JSON.stringify({
          vendorId: +vendorId,
          warehouseId: warehouseId ? +warehouseId : null,
          expectedDate: expectedDate || null,
          purchaseRequirementIds: requirementIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create PO");
      }
      const po = await res.json();
      toast.success(`Created ${po.po_number ?? po.poNumber ?? "PO"}`);
      onDone(po);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 24, width: 560, maxWidth: "95vw",
        maxHeight: "92vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: 17 }}>Create purchase order</h3>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          {requirementIds.length} requirement{requirementIds.length !== 1 ? "s" : ""} selected — lines merge by item.
        </p>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Vendor *</span>
          <select
            style={{ ...selectStyle, width: "100%" }}
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">— Select —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorCode ?? v.vendor_code} — {v.vendorName ?? v.vendor_name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Receive into warehouse</span>
          <select
            style={{ ...selectStyle, width: "100%" }}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Expected date</span>
          <input
            type="date"
            style={{ ...inputStyle, width: "100%" }}
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </label>

        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Preview</div>
        {loadingPv ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading lines…</p>
        ) : (
          <table style={{ ...tableStyle, fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={th}>Item</th>
                <th style={{ ...th, textAlign: "right" }}>Qty</th>
                <th style={{ ...th, textAlign: "right" }}>Rate</th>
                <th style={{ ...th, textAlign: "right" }}>GST%</th>
                <th style={{ ...th, textAlign: "right" }}>Line</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((l) => (
                <tr key={l.itemId}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{l.itemName}</div>
                    {!l.ok && <div style={{ color: "#b91c1c", fontSize: 11 }}>{l.msg}</div>}
                    {l.ok && l.moq > 0 && (
                      <div style={{ fontSize: 10, color: "#64748b" }}>MOQ {l.moq}</div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{l.ok ? fmt(l.qty) : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.ok ? `₹${fmt(l.rate)}` : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.ok ? `${l.gst}%` : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.ok ? `₹${fmt(l.lineTotal)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={btn("#e2e8f0", "#374151")} onClick={onClose}>Cancel</button>
          <button style={btn("#005fb8")} onClick={submit} disabled={saving || loadingPv}>
            {saving ? "Creating…" : "Create PO"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  if (!stats.length) return null;

  const totals = { PENDING: 0, APPROVED: 0, ORDERED: 0, CANCELLED: 0 };
  for (const r of stats) {
    if (totals[r.status] !== undefined) totals[r.status] += Number(r.count);
  }

  const chips = [
    { label: "Pending",   value: totals.PENDING,   ...STATUS_STYLE.PENDING   },
    { label: "Approved",  value: totals.APPROVED,  ...STATUS_STYLE.APPROVED  },
    { label: "Ordered",   value: totals.ORDERED,   ...STATUS_STYLE.ORDERED   },
    { label: "Cancelled", value: totals.CANCELLED, ...STATUS_STYLE.CANCELLED },
  ].filter((c) => c.value > 0);

  if (!chips.length) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
      {chips.map((c) => (
        <div key={c.label} style={{
          background: c.bg, color: c.color,
          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        }}>
          {c.label}: {c.value}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PurchaseRequirementsPage() {
  const navigate = useNavigate();
  const [rows,    setRows]    = useState([]);
  const [stats,   setStats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState({});
  const [poModal, setPoModal] = useState(false);

  // Filters
  const [search,   setSearch]   = useState("");
  const [fStatus,  setFStatus]  = useState("");
  const [fPriority, setFPriority] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fStatus)   params.set("status",   fStatus);
      if (fPriority) params.set("priority", fPriority);

      const [rowsRes, statsRes] = await Promise.all([
        apiFetch(`/purchase-requirements?${params}`),
        apiFetch("/purchase-requirements/stats"),
      ]);

      const rowsData  = await rowsRes.json();
      const statsData = await statsRes.json();
      setRows(Array.isArray(rowsData)  ? rowsData  : []);
      setStats(Array.isArray(statsData) ? statsData : []);
    } catch {
      toast.error("Failed to load purchase requirements");
    } finally {
      setLoading(false);
    }
  }, [fStatus, fPriority]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.itemName    ?? "").toLowerCase().includes(q) ||
      (r.itemCode    ?? "").toLowerCase().includes(q) ||
      (r.itemSku     ?? "").toLowerCase().includes(q) ||
      (r.orderNo     ?? "").toLowerCase().includes(q) ||
      (r.customerName ?? "").toLowerCase().includes(q) ||
      String(r.po_number ?? r.poNumber ?? "").toLowerCase().includes(q)
    );
  });

  const selectable = (r) =>
    ["PENDING", "APPROVED"].includes(r.status) && !(r.purchase_order_id ?? r.purchaseOrderId);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]).map(Number);

  const toggleRow = (id) => {
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  };

  const toggleAllVisible = () => {
    const vis = filtered.filter(selectable);
    const allOn = vis.length && vis.every((r) => selected[r.id]);
    const next = { ...selected };
    for (const r of vis) next[r.id] = !allOn;
    setSelected(next);
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
          Purchase Requirements
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Shortage detection — auto-generated from manufacturing order explosion.
          Only MANUFACTURING items with active BOQ appear here.
        </p>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div style={{ ...card, padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{ ...inputStyle, minWidth: 220 }}
            placeholder="Search item / order / customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={selectStyle} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["PENDING", "APPROVED", "ORDERED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select style={selectStyle} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="">All priorities</option>
            {["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button style={btn("#e2e8f0", "#374151")} onClick={() => { setSearch(""); setFStatus(""); setFPriority(""); }}>
            Clear
          </button>
          <button style={{ ...btn("#005fb8"), marginLeft: "auto" }} onClick={load}>
            Refresh
          </button>
          {hasAnyPermission("inventory.manage") && (
            <button
              style={{
                ...btn(selectedIds.length ? "#0f172a" : "#cbd5e1"),
                opacity: selectedIds.length ? 1 : 0.65,
              }}
              disabled={!selectedIds.length}
              onClick={() => setPoModal(true)}
            >
              Create PO
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No purchase requirements</div>
          <div style={{ fontSize: 12 }}>
            Requirements are auto-generated when a MANUFACTURING order with an active BOQ has a stock shortage.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
            {filtered.length} requirement{filtered.length !== 1 ? "s" : ""}
            {rows.length !== filtered.length ? ` (filtered from ${rows.length})` : ""}
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                {hasAnyPermission("inventory.manage") && (
                  <th style={{ ...th, width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all visible"
                      checked={
                        !!filtered.filter(selectable).length &&
                        filtered.filter(selectable).every((r) => selected[r.id])
                      }
                      onChange={toggleAllVisible}
                    />
                  </th>
                )}
                <th style={th}>Priority</th>
                <th style={th}>Item</th>
                <th style={{ ...th, textAlign: "right" }}>Required</th>
                <th style={{ ...th, textAlign: "right" }}>In Stock</th>
                <th style={{ ...th, textAlign: "right", color: "#b91c1c" }}>Shortage</th>
                <th style={th}>Unit</th>
                <th style={th}>Source</th>
                <th style={th}>PO</th>
                <th style={th}>Status</th>
                <th style={th}>Notes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ background: r.priority === "URGENT" ? "#fff5f5" : undefined }}>
                  {hasAnyPermission("inventory.manage") && (
                    <td style={td}>
                      {selectable(r) ? (
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={() => toggleRow(r.id)}
                        />
                      ) : (
                        <span style={{ color: "#e2e8f0" }}>·</span>
                      )}
                    </td>
                  )}
                  <td style={td}>
                    <Badge text={r.priority} map={PRIORITY_STYLE} />
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.itemName || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {r.itemCode}{r.itemSku ? ` · ${r.itemSku}` : ""}
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    {fmt(r.required_qty)}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: Number(r.available_qty) > 0 ? "#15803d" : "#94a3b8" }}>
                    {fmt(r.available_qty)}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <span style={{
                      background: "#fee2e2", color: "#b91c1c",
                      fontSize: 12, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 6,
                    }}>
                      {fmt(r.shortage_qty)}
                    </span>
                  </td>
                  <td style={{ ...td, color: "#64748b" }}>{r.unit}</td>
                  <td style={td}>
                    <div style={{ fontSize: 12 }}>
                      {r.source_type === "ORDER" && r.orderNo ? (
                        <>
                          <span style={{ fontWeight: 600, color: "#005fb8" }}>{r.orderNo}</span>
                          {r.customerName && (
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.customerName}</div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#64748b" }}>{r.source_type}#{r.source_id ?? "—"}</span>
                      )}
                    </div>
                  </td>
                  <td style={td}>
                    {(r.po_number ?? r.poNumber) ? (
                      <span style={{ fontWeight: 700, color: "#15803d", fontSize: 12 }}>
                        {r.po_number ?? r.poNumber}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    <Badge text={r.status} map={STATUS_STYLE} />
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "#64748b", maxWidth: 140 }}>
                    {r.notes || <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={td}>
                    <button
                      style={btn("#e2e8f0", "#374151")}
                      onClick={() => setEditing(r)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          req={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {poModal && (
        <CreatePoModal
          requirementIds={selectedIds}
          requirements={rows}
          onClose={() => setPoModal(false)}
          onDone={(po) => {
            setPoModal(false);
            setSelected({});
            load();
            if (po?.id) navigate(`/purchase-orders/${po.id}`);
          }}
        />
      )}
    </div>
  );
}

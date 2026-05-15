import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { toast } from "../../utils/toast";

// ── Shared styles ─────────────────────────────────────────────────────────────

const card = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
  padding: "20px 24px", marginBottom: 20,
};

const tableStyle = {
  width: "100%", borderCollapse: "collapse", fontSize: 13,
};

const th = {
  padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
  textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap",
};

const td = {
  padding: "10px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};

const inputStyle = {
  width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 13, boxSizing: "border-box",
};

const selectStyle = { ...inputStyle };

const btn = (bg, color = "#fff") => ({
  background: bg, color, border: "none", borderRadius: 7,
  padding: "9px 18px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap",
});

function Badge({ text, bg, color }) {
  return (
    <span style={{
      background: bg, color, fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

const CATEGORY_BADGE = {
  TRADING:       { bg: "#dbeafe", color: "#1d4ed8" },
  MANUFACTURING: { bg: "#ffedd5", color: "#c2410c" },
  SERVICE:       { bg: "#dcfce7", color: "#15803d" },
};

const DIR_BADGE = {
  IN:         { bg: "#dcfce7", color: "#15803d" },
  OUT:        { bg: "#fee2e2", color: "#b91c1c" },
  ADJUSTMENT: { bg: "#f1f5f9", color: "#475569" },
};

const STOCK_BADGE = (qty) => qty > 0
  ? { bg: "#dcfce7", color: "#15803d" }
  : qty === 0
    ? { bg: "#f1f5f9", color: "#64748b" }
    : { bg: "#fee2e2", color: "#b91c1c" };

const UNITS = ["PCS", "SQFT", "SHEET", "KG", "METER", "LITER"];

const TX_TYPES = [
  "OPENING_STOCK", "PURCHASE_RECEIPT", "SALES_DISPATCH",
  "MATERIAL_ISSUE", "PRODUCTION_RECEIPT", "SCRAP", "MANUAL_ADJUSTMENT",
];

const WH_TYPES = ["GENERAL", "RAW_MATERIAL_STORE", "FINISHED_GOODS", "SERVICE_PARTS", "SCRAP_STORE"];

function fmt(n) {
  return Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Tab: Summary ──────────────────────────────────────────────────────────────

function SummaryTab({ onSelectItem }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/inventory/summary")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load summary"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q
      || (r.itemName ?? "").toLowerCase().includes(q)
      || (r.itemCode ?? "").toLowerCase().includes(q)
      || (r.categoryType ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search item name / code / category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={btn("#e2e8f0", "#374151")} onClick={load}>Refresh</button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 40 }}>
          No stock transactions yet. Use "Opening Stock Entry" to record initial stock.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Category</th>
                <th style={th}>Unit</th>
                <th style={{ ...th, textAlign: "right" }}>Total IN</th>
                <th style={{ ...th, textAlign: "right" }}>Total OUT</th>
                <th style={{ ...th, textAlign: "right" }}>Stock</th>
                <th style={th}>Warehouses</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const catStyle = CATEGORY_BADGE[row.categoryType] ?? { bg: "#f1f5f9", color: "#475569" };
                const stStyle  = STOCK_BADGE(row.currentStock);
                return (
                  <tr key={row.itemId}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.itemName || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.itemCode}</div>
                    </td>
                    <td style={td}>
                      {row.categoryType
                        ? <Badge text={row.categoryType} bg={catStyle.bg} color={catStyle.color} />
                        : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...td, color: "#64748b" }}>{row.unit}</td>
                    <td style={{ ...td, textAlign: "right", color: "#15803d", fontWeight: 600 }}>{fmt(row.totalIn)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#b91c1c", fontWeight: 600 }}>{fmt(row.totalOut)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Badge text={fmt(row.currentStock)} bg={stStyle.bg} color={stStyle.color} />
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(row.warehouses ?? []).map((w) => (
                          <span key={w.warehouseId} style={{
                            background: "#f1f5f9", color: "#475569",
                            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                          }}>
                            {w.warehouseCode}: {fmt(w.currentStock)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={td}>
                      <button
                        style={btn("#e0f2fe", "#0369a1")}
                        onClick={() => onSelectItem(row.itemId, row.itemName)}
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Item Ledger ──────────────────────────────────────────────────────────

function LedgerTab({ initialItemId, initialItemName }) {
  const [itemId, setItemId]     = useState(initialItemId ?? "");
  const [ledger, setLedger]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const load = useCallback((id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    apiFetch(`/inventory/item/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.statusCode >= 400) throw new Error(d.message ?? "Not found");
        setLedger(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialItemId) { setItemId(String(initialItemId)); load(initialItemId); }
  }, [initialItemId, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load(itemId);
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          style={{ ...inputStyle, maxWidth: 220 }}
          placeholder="Item ID"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          type="number"
          min="1"
        />
        <button type="submit" style={btn("#005fb8")}>Load Ledger</button>
      </form>

      {loading && <p style={{ color: "#94a3b8" }}>Loading…</p>}
      {error   && <p style={{ color: "#dc2626" }}>{error}</p>}

      {ledger && !loading && (
        <>
          {/* Item header */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{ledger.item?.itemName}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{ledger.item?.itemCode} · {ledger.item?.unit}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>Total Stock</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: ledger.totalStock > 0 ? "#15803d" : "#b91c1c" }}>
                  {fmt(ledger.totalStock)} {ledger.item?.unit}
                </div>
              </div>
            </div>
          </div>

          {/* Warehouse balances */}
          {ledger.warehouses?.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: "#374151" }}>Warehouse Balances</div>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={th}>Warehouse</th>
                      <th style={th}>Type</th>
                      <th style={{ ...th, textAlign: "right" }}>IN</th>
                      <th style={{ ...th, textAlign: "right" }}>OUT</th>
                      <th style={{ ...th, textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.warehouses.map((w) => {
                      const stStyle = STOCK_BADGE(w.currentStock);
                      return (
                        <tr key={w.warehouseId}>
                          <td style={td}><strong>{w.warehouseName}</strong> <span style={{ color: "#94a3b8", fontSize: 11 }}>({w.warehouseCode})</span></td>
                          <td style={td}><span style={{ color: "#64748b", fontSize: 11 }}>{w.warehouseType}</span></td>
                          <td style={{ ...td, textAlign: "right", color: "#15803d" }}>{fmt(w.totalIn)}</td>
                          <td style={{ ...td, textAlign: "right", color: "#b91c1c" }}>{fmt(w.totalOut)}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <Badge text={fmt(w.currentStock)} bg={stStyle.bg} color={stStyle.color} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transaction history */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#374151" }}>
              Transaction History ({ledger.transactions?.length ?? 0})
            </div>
            {!ledger.transactions?.length ? (
              <p style={{ color: "#94a3b8", textAlign: "center" }}>No transactions</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Type</th>
                      <th style={th}>Dir</th>
                      <th style={{ ...th, textAlign: "right" }}>Qty</th>
                      <th style={th}>Unit</th>
                      <th style={th}>Warehouse</th>
                      <th style={th}>Ref</th>
                      <th style={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.transactions.map((tx) => {
                      const dStyle = DIR_BADGE[tx.direction] ?? DIR_BADGE.ADJUSTMENT;
                      return (
                        <tr key={tx.id}>
                          <td style={{ ...td, whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(tx.createdAt)}</td>
                          <td style={{ ...td, fontSize: 12 }}>{(tx.transactionType ?? "").replace(/_/g, " ")}</td>
                          <td style={td}>
                            <Badge text={tx.direction} bg={dStyle.bg} color={dStyle.color} />
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmt(tx.qty)}</td>
                          <td style={{ ...td, color: "#64748b" }}>{tx.unit}</td>
                          <td style={{ ...td, fontSize: 12 }}>{tx.warehouseName} <span style={{ color: "#94a3b8" }}>({tx.warehouseCode})</span></td>
                          <td style={{ ...td, fontSize: 12, color: "#64748b" }}>
                            {tx.referenceType ? `${tx.referenceType}${tx.referenceId ? ` #${tx.referenceId}` : ""}` : "—"}
                          </td>
                          <td style={{ ...td, fontSize: 12, color: "#64748b", maxWidth: 160 }}>{tx.notes ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Opening Stock ────────────────────────────────────────────────────────

function OpeningStockTab({ warehouses, onDone }) {
  const EMPTY = {
    itemId: "", warehouseId: "", qty: "", unit: "PCS",
    rate: "", transactionType: "OPENING_STOCK", direction: "IN", notes: "",
  };
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemId)      { toast.error("Item ID is required"); return; }
    if (!form.warehouseId) { toast.error("Warehouse is required"); return; }
    if (!form.qty || Number(form.qty) <= 0) { toast.error("Qty must be > 0"); return; }

    setSaving(true);
    try {
      const res = await apiFetch("/inventory/transaction", {
        method: "POST",
        body: JSON.stringify({
          itemId:          Number(form.itemId),
          warehouseId:     Number(form.warehouseId),
          transactionType: form.transactionType,
          direction:       form.direction,
          qty:             Number(form.qty),
          unit:            form.unit,
          rate:            form.rate ? Number(form.rate) : null,
          notes:           form.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed");
      }
      toast.success("Transaction recorded");
      setForm(EMPTY);
      onDone?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isAdjustment = form.transactionType === "MANUAL_ADJUSTMENT";

  return (
    <div>
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: "#0f172a" }}>
          Record Stock Transaction
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Transaction Type *</span>
              <select style={selectStyle} value={form.transactionType}
                onChange={(e) => {
                  const t = e.target.value;
                  setF("transactionType", t);
                  // Auto-set direction based on type
                  if (["OPENING_STOCK", "PURCHASE_RECEIPT", "PRODUCTION_RECEIPT"].includes(t)) setF("direction", "IN");
                  else if (["SALES_DISPATCH", "MATERIAL_ISSUE", "SCRAP"].includes(t)) setF("direction", "OUT");
                  else setF("direction", "ADJUSTMENT");
                }}
              >
                {TX_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Direction *</span>
              <select style={selectStyle} value={form.direction} onChange={(e) => setF("direction", e.target.value)}>
                <option value="IN">IN (Stock received)</option>
                <option value="OUT">OUT (Stock dispatched)</option>
                {isAdjustment && <option value="ADJUSTMENT">ADJUSTMENT</option>}
              </select>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Item ID *</span>
              <input style={inputStyle} type="number" min="1" placeholder="e.g. 42"
                value={form.itemId} onChange={(e) => setF("itemId", e.target.value)} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Find in Items list</span>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Warehouse *</span>
              <select style={selectStyle} value={form.warehouseId} onChange={(e) => setF("warehouseId", e.target.value)}>
                <option value="">— Select —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Qty *</span>
              <input style={inputStyle} type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.qty} onChange={(e) => setF("qty", e.target.value)} />
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Unit</span>
              <select style={selectStyle} value={form.unit} onChange={(e) => setF("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Rate / Unit (₹)</span>
              <input style={inputStyle} type="number" step="0.01" min="0" placeholder="Optional cost"
                value={form.rate} onChange={(e) => setF("rate", e.target.value)} />
            </label>

            <label style={{ display: "block", gridColumn: "span 2" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Notes</span>
              <input style={inputStyle} type="text" placeholder="Optional notes"
                value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
            </label>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button type="submit" style={btn("#005fb8")} disabled={saving}>
              {saving ? "Saving…" : "Record Transaction"}
            </button>
            <button type="button" style={btn("#e2e8f0", "#374151")} onClick={() => setForm(EMPTY)}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Warehouses ───────────────────────────────────────────────────────────

function WarehousesTab({ warehouses, onRefresh }) {
  const EMPTY_WH = { name: "", code: "", type: "GENERAL", active: true };
  const [addForm, setAddForm]   = useState(EMPTY_WH);
  const [addSaving, setAddSaving] = useState(false);
  const [editForms, setEditForms] = useState({});
  const [editSaving, setEditSaving] = useState({});

  const setA = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));
  const setE = (id, k, v) => setEditForms((f) => ({ ...f, [id]: { ...f[id], [k]: v } }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error("Name is required"); return; }
    if (!addForm.code.trim()) { toast.error("Code is required"); return; }
    setAddSaving(true);
    try {
      const res = await apiFetch("/inventory/warehouses", {
        method: "POST", body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed");
      }
      toast.success("Warehouse created");
      setAddForm(EMPTY_WH);
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (wh) => {
    setEditForms((f) => ({ ...f, [wh.id]: { name: wh.name, code: wh.code, type: wh.type, active: wh.active } }));
  };

  const cancelEdit = (id) => {
    setEditForms((f) => { const n = { ...f }; delete n[id]; return n; });
  };

  const handleSave = async (id) => {
    setEditSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await apiFetch(`/inventory/warehouses/${id}`, {
        method: "PATCH", body: JSON.stringify(editForms[id]),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed");
      }
      toast.success("Saved");
      cancelEdit(id);
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditSaving((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div>
      {/* Add form */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#0f172a" }}>Add Warehouse</div>
        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Name *</span>
              <input style={inputStyle} placeholder="Main Store" value={addForm.name}
                onChange={(e) => setA("name", e.target.value)} />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Code *</span>
              <input style={inputStyle} placeholder="MAIN-STORE" value={addForm.code}
                onChange={(e) => setA("code", e.target.value)} />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Type</span>
              <select style={selectStyle} value={addForm.type} onChange={(e) => setA("type", e.target.value)}>
                {WH_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" style={btn("#005fb8")} disabled={addSaving}>
            {addSaving ? "Adding…" : "+ Add Warehouse"}
          </button>
        </form>
      </div>

      {/* List */}
      {warehouses.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#94a3b8" }}>No warehouses yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Code</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => {
                const editing = !!editForms[wh.id];
                const ef      = editForms[wh.id] ?? {};
                return (
                  <tr key={wh.id}>
                    <td style={td}>
                      {editing
                        ? <input style={inputStyle} value={ef.name} onChange={(e) => setE(wh.id, "name", e.target.value)} />
                        : <strong>{wh.name}</strong>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <input style={inputStyle} value={ef.code} onChange={(e) => setE(wh.id, "code", e.target.value)} />
                        : <code style={{ fontSize: 12 }}>{wh.code}</code>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <select style={selectStyle} value={ef.type} onChange={(e) => setE(wh.id, "type", e.target.value)}>
                            {WH_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                          </select>
                        : <span style={{ fontSize: 12, color: "#64748b" }}>{wh.type.replace(/_/g, " ")}</span>}
                    </td>
                    <td style={td}>
                      {editing
                        ? <select style={{ ...selectStyle, width: "auto" }} value={ef.active ? "true" : "false"}
                            onChange={(e) => setE(wh.id, "active", e.target.value === "true")}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        : wh.active
                          ? <Badge text="Active" bg="#dcfce7" color="#15803d" />
                          : <Badge text="Inactive" bg="#f1f5f9" color="#64748b" />}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {editing ? (
                        <>
                          <button style={{ ...btn("#005fb8"), marginRight: 6 }} onClick={() => handleSave(wh.id)} disabled={editSaving[wh.id]}>
                            {editSaving[wh.id] ? "…" : "Save"}
                          </button>
                          <button style={btn("#e2e8f0", "#374151")} onClick={() => cancelEdit(wh.id)}>Cancel</button>
                        </>
                      ) : (
                        <button style={btn("#e2e8f0", "#374151")} onClick={() => startEdit(wh)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ["Summary", "Ledger", "Opening Stock", "Warehouses"];

export default function InventoryPage() {
  const [tab, setTab]             = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [ledgerItemId, setLedgerItemId] = useState(null);
  const [ledgerItemName, setLedgerItemName] = useState(null);

  const loadWarehouses = useCallback(() => {
    apiFetch("/inventory/warehouses")
      .then((r) => r.json())
      .then((d) => setWarehouses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);

  const handleSelectItem = (itemId, itemName) => {
    setLedgerItemId(itemId);
    setLedgerItemName(itemName);
    setTab(1);
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Inventory</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Stock visibility — transaction-based. All stock = SUM(IN) − SUM(OUT).
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              color: tab === i ? "#005fb8" : "#64748b",
              borderBottom: tab === i ? "2px solid #005fb8" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <SummaryTab onSelectItem={handleSelectItem} />}
      {tab === 1 && <LedgerTab initialItemId={ledgerItemId} initialItemName={ledgerItemName} />}
      {tab === 2 && <OpeningStockTab warehouses={warehouses} onDone={() => setTab(0)} />}
      {tab === 3 && <WarehousesTab warehouses={warehouses} onRefresh={loadWarehouses} />}
    </div>
  );
}

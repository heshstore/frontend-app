/**
 * DocumentForm — shared form UI for Quotation and Order creation/editing.
 *
 * Props:
 *   pageTitle   {string}            — displayed in the PageLayout header
 *   editId      {string|null}       — if set, loads existing document for editing
 *   loadData    {async (id)=>data}  — fetches the document for editId and returns
 *                                     { billTo, shipTo, shipSameAsBill, form, rows }
 *   onSubmit    {async (payload)=>{ok,message}} — called with the full form payload
 *   submitLabel {string}            — label for the create button
 *   updateLabel {string}            — label for the update button
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { theme } from "../../theme";
import PageLayout from "../layout/PageLayout";

// ── Constants ────────────────────────────────────────────────────────────────
const DELIVERY_TYPES = ["Courier", "Transport", "Bus", "Railways", "Air", "Porter", "Self-Pickup", "Hesh Vehicle"];
const PAYMENT_TYPES  = ["Paid at Booking", "Payable at Pickup"];

// ── Shared styles ────────────────────────────────────────────────────────────
const inp = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  fontSize: 15,
  boxSizing: "border-box",
  background: "#fff",
  color: theme.text,
};
const lbl = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: theme.textMuted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const sectionDivider = (title) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 12px" }}>
    <div style={{ flex: 1, height: 1, background: theme.border }} />
    <span style={{ fontSize: 11, fontWeight: 700, color: theme.primary, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {title}
    </span>
    <div style={{ flex: 1, height: 1, background: theme.border }} />
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
export const emptyRow = () => ({
  sku: "", item_name: "", qty: 1, rate: "",
  discount_type: "percent", discount_value: "",
  gst_percent: 0, hsn_code: "", instruction: "",
  _floor_price: 0, _image: "",
});

export const defaultForm = () => ({
  salesman_id: "",
  validity_days: 15,
  delivery_by: "",
  delivery_type: "Road",
  payment_type: "Credit",
  delivery_instructions: "",
  charges_packing: "",
  charges_cartage: "",
  charges_forwarding: "",
  charges_installation: "",
  charges_loading: "",
});

function formatCustomer(c) {
  if (!c) return "";
  return [c.companyName, c.tag && `[${c.tag}]`, c.city].filter(Boolean).join(" — ");
}

// ── CustomerSearchField ───────────────────────────────────────────────────────
function CustomerSearchField({ label, value, onSelect, onClear, placeholder }) {
  const [search, setSearch]     = useState(value ? formatCustomer(value) : "");
  const [results, setResults]   = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    setSearch(value ? formatCustomer(value) : "");
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChange = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    if (!val || val.length < 2) { setResults([]); setShowDrop(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await apiFetch(`/customers/search?q=${encodeURIComponent(val)}`);
        const d = await r.json();
        setResults(Array.isArray(d) ? d : []);
        setShowDrop(true);
      } catch (e) { console.error(e); }
    }, 300);
  };

  const select = (c) => {
    setSearch(formatCustomer(c));
    setShowDrop(false);
    setResults([]);
    onSelect(c);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <label style={lbl}>{label}</label>
      <input
        placeholder={placeholder || "Search customer…"}
        value={search}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDrop(true)}
        autoComplete="off"
        style={{ ...inp, borderColor: value ? "#16a34a" : theme.border, background: value ? "#f0fdf4" : "#fff" }}
      />
      {value && (
        <div style={{ marginTop: 4, fontSize: 12, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>✓ {value.companyName}{value.city ? ` · ${value.city}` : ""}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8,
            background: value.isWholesaler ? "#fef9c3" : "#dbeafe",
            color: value.isWholesaler ? "#a16207" : "#1e40af",
          }}>
            {value.isWholesaler ? "WHOLESALER" : "RETAILER"}
          </span>
          <button type="button" onClick={() => { setSearch(""); onClear(); }}
            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 12, padding: 0 }}>
            Change
          </button>
        </div>
      )}
      {showDrop && (
        <div style={{ position: "absolute", zIndex: 9999, width: "100%", background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 8, maxHeight: 180, overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}>
          {results.length === 0
            ? <div style={{ padding: 12, color: theme.textMuted, fontSize: 13 }}>No customer found</div>
            : results.map(c => (
                <div key={c.id} onMouseDown={() => select(c)}
                  style={{ padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${theme.border}`, fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.primaryLight}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>{c.companyName}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                      background: c.isWholesaler ? "#fef9c3" : "#dbeafe",
                      color: c.isWholesaler ? "#a16207" : "#1e40af",
                    }}>
                      {c.isWholesaler ? "WHOLESALER" : "RETAILER"}
                    </span>
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: 11 }}>
                    {[c.tag && `[${c.tag}]`, c.city, c.mobile1].filter(Boolean).join(" · ")}
                  </div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── ItemRow ───────────────────────────────────────────────────────────────────
function ItemRow({ row, index, items, canRemove, onChange, onRemove, isWholesaler }) {
  const [search, setSearch] = useState(
    row.sku && row.item_name ? `${row.sku}  ·  ${row.item_name}` : (row.item_name || "")
  );
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef(null);

  const filtered = search.length >= 1
    ? items
        .filter(it =>
          it.itemName.toLowerCase().includes(search.toLowerCase()) ||
          it.sku.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (a.sku || "").localeCompare(b.sku || ""))
        .slice(0, 10)
    : [];

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (item) => {
    setSearch(`${item.sku}  ·  ${item.itemName}`);
    setShowDrop(false);
    // Use wholesale price when customer is a wholesaler and price is set
    const wholesalePrice = Number(item.wholesale_price) || 0;
    const retailPrice    = Number(item.retail_price) || Number(item.sellingPrice) || 0;
    const rate = (isWholesaler && wholesalePrice > 0) ? wholesalePrice : retailPrice;
    onChange(index, {
      sku: item.sku,
      item_name: item.itemName,
      rate,
      gst_percent: item.gst || 0,
      hsn_code: item.hsnCode || "",
      _floor_price: rate,   // floor = auto-filled price; user can increase but not go below
      _image: item.image || "",
    });
  };

  const base      = Number(row.qty) * Number(row.rate || 0);
  const disc      = row.discount_type === "percent"
    ? (base * Number(row.discount_value)) / 100
    : Number(row.discount_value);
  const amount    = Math.max(0, base - disc);
  const gstAmount = amount * Number(row.gst_percent || 0) / 100;

  const discLabel = Number(row.discount_value) > 0
    ? (row.discount_type === "percent"
        ? `- ${row.discount_value}% disc`
        : `- ₹${Number(row.discount_value).toLocaleString("en-IN")} disc`)
    : "";

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: "#fff", marginBottom: 12, overflow: "visible", position: "relative" }}>

      {/* Image + item search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 0" }}>
        {row._image
          ? <img src={row._image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 44, height: 44, borderRadius: 6, background: theme.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
        }
        <div style={{ flex: 1, position: "relative" }} ref={dropRef}>
          <input
            placeholder="Search item by name or SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDrop(true); onChange(index, { item_name: e.target.value }); }}
            onFocus={() => search.length >= 1 && setShowDrop(true)}
            style={{ ...inp, paddingRight: 36 }}
          />
          {search && (
            <button type="button"
              onClick={() => { setSearch(""); onChange(index, { sku: "", item_name: "", rate: "", gst_percent: 0, hsn_code: "", _floor_price: 0, _image: "" }); setShowDrop(false); }}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.textMuted }}>
              ×
            </button>
          )}
          {showDrop && filtered.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 200, overflowY: "auto" }}>
              {filtered.map(it => (
                <div key={it.id}
                  onMouseDown={() => select(it)}
                  style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.primaryLight}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, background: "#e0eeff", color: "#0066b3", borderRadius: 4, padding: "1px 6px" }}>{it.sku}</span>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>GST {it.gst}%</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{it.itemName}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.primary }}>₹{Number(it.sellingPrice).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)}
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        )}
      </div>

      {/* SKU + HSN chips */}
      {(row.sku || row.hsn_code) && (
        <div style={{ display: "flex", gap: 6, padding: "6px 12px 0", flexWrap: "wrap" }}>
          {row.sku     && <span style={{ fontSize: 11, background: theme.primaryLight, color: theme.primary, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>SKU: {row.sku}</span>}
          {row.hsn_code && <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>HSN: {row.hsn_code}</span>}
        </div>
      )}

      {/* Qty / Rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 12px 0" }}>
        <div>
          <label style={lbl}>Qty</label>
          <input type="number" min="0.01" step="0.01" value={row.qty}
            onChange={(e) => onChange(index, { qty: e.target.value })} style={inp} />
        </div>
        <div>
          <label style={lbl}>
            Rate (₹)
            {row._floor_price > 0 && (
              <span style={{ fontWeight: 400, color: theme.primary, marginLeft: 6, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>
                min ₹{Number(row._floor_price).toLocaleString("en-IN")}
              </span>
            )}
          </label>
          <input
            type="number" min={row._floor_price > 0 ? row._floor_price : 0} step="0.01"
            value={row.rate === "" ? "" : row.rate}
            placeholder="Enter rate"
            onChange={(e) => {
              const val = Number(e.target.value);
              if (row._floor_price > 0 && val < row._floor_price) {
                onChange(index, { rate: row._floor_price });
                return;
              }
              onChange(index, { rate: e.target.value });
            }}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (row._floor_price > 0 && (isNaN(val) || val < row._floor_price)) {
                onChange(index, { rate: row._floor_price });
              }
            }}
            style={{
              ...inp,
              borderColor: row._floor_price > 0 && Number(row.rate) > row._floor_price ? "#16a34a" : inp.borderColor,
              background: row._floor_price > 0 && Number(row.rate) > row._floor_price ? "#f0fdf4" : "#fff",
            }}
          />
          {row._floor_price > 0 && Number(row.rate) > row._floor_price && (
            <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>
              +₹{(Number(row.rate) - row._floor_price).toLocaleString("en-IN")} above base price
            </div>
          )}
        </div>
      </div>

      {/* Discount */}
      <div style={{ padding: "10px 12px 0" }}>
        <label style={lbl}>Discount</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", borderRadius: 8, border: `1.5px solid ${theme.border}`, overflow: "hidden", flexShrink: 0 }}>
            {["percent", "fixed"].map(t => (
              <button key={t} type="button"
                onClick={() => onChange(index, { discount_type: t })}
                style={{
                  padding: "0 14px", height: 42, border: "none", cursor: "pointer",
                  background: row.discount_type === t ? theme.primary : "#fff",
                  color: row.discount_type === t ? "#fff" : theme.textMuted,
                  fontWeight: 700, fontSize: 15, transition: "background 0.15s",
                }}>
                {t === "percent" ? "%" : "₹"}
              </button>
            ))}
          </div>
          <input type="number" min="0" step="0.01"
            value={row.discount_value}
            placeholder={row.discount_type === "percent" ? "0" : "0.00"}
            onChange={(e) => onChange(index, { discount_value: e.target.value })}
            style={{ ...inp, flex: 1 }} />
        </div>
      </div>

      {/* GST — read-only */}
      <div style={{ padding: "10px 12px 0" }}>
        <label style={lbl}>GST (auto)</label>
        <div style={{ ...inp, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", color: theme.textMuted, cursor: "default", borderStyle: "dashed" }}>
          <span>{row.gst_percent > 0 ? `${row.gst_percent}%` : "—"}</span>
          {amount > 0 && row.gst_percent > 0 && (
            <span style={{ fontSize: 13, color: theme.primary, fontWeight: 600 }}>
              + ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Special instruction */}
      <div style={{ padding: "10px 12px 12px" }}>
        <input placeholder="Special instruction (optional)…" value={row.instruction}
          onChange={(e) => onChange(index, { instruction: e.target.value })}
          style={{ ...inp, fontSize: 13, color: theme.textMuted }} />
      </div>

      {/* Row footer — amount */}
      <div style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "0 0 10px 10px" }}>
        <span style={{ fontSize: 12, color: theme.textMuted }}>
          {row.qty} × ₹{row.rate || 0} {discLabel}{row.gst_percent > 0 ? ` + GST ${row.gst_percent}%` : ""}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: theme.primary }}>
          ₹{(amount + gstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

// ── DocumentForm ──────────────────────────────────────────────────────────────
export default function DocumentForm({ pageTitle, editId, loadData, onSubmit, submitLabel, updateLabel }) {
  const navigate = useNavigate();

  const [billTo, setBillTo]                 = useState(null);
  const [shipTo, setShipTo]                 = useState(null);
  const [shipSameAsBill, setShipSameAsBill] = useState(true);

  const [rows, setRows]   = useState([emptyRow()]);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm]   = useState(defaultForm());

  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load master data
  useEffect(() => {
    fetch(`${API_URL}/items?master=1`).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_URL}/users/dropdown`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  // Load edit data via the caller-supplied loader
  useEffect(() => {
    if (!editId || !loadData) return;
    setLoading(true);
    loadData(editId)
      .then(data => {
        if (!data) return;
        if (data.billTo)         setBillTo(data.billTo);
        if (data.shipTo)         setShipTo(data.shipTo);
        if (data.shipSameAsBill !== undefined) setShipSameAsBill(data.shipSameAsBill);
        if (data.form)           setForm(prev => ({ ...prev, ...data.form }));
        if (data.rows?.length)   setRows(data.rows);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [editId, loadData]);

  // Row helpers
  const updateRow = (index, patch) =>
    setRows(prev => { const next = [...prev]; next[index] = { ...next[index], ...patch }; return next; });
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));
  const addRow    = () => setRows([...rows, emptyRow()]);

  // Totals
  const calcAmount = (row) => {
    const base = Number(row.qty) * Number(row.rate || 0);
    const disc = row.discount_type === "percent"
      ? (base * Number(row.discount_value)) / 100
      : Number(row.discount_value);
    return Math.max(0, base - disc);
  };
  const calcGst = (row) => calcAmount(row) * Number(row.gst_percent || 0) / 100;

  const subTotal = rows.reduce((s, r) => s + calcAmount(r), 0);
  const gstByRate = rows.reduce((acc, r) => {
    const rate = Number(r.gst_percent || 0);
    if (rate > 0) acc[rate] = (acc[rate] || 0) + calcGst(r);
    return acc;
  }, {});
  const totalGst     = Object.values(gstByRate).reduce((s, v) => s + v, 0);
  const extraCharges = ["charges_packing","charges_cartage","charges_forwarding","charges_installation","charges_loading"]
    .reduce((s, k) => s + Number(form[k] || 0), 0);
  const grandTotal = subTotal + totalGst + extraCharges;

  // Submit — build standard payload and delegate to caller
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!billTo) { alert("Please select a Bill To customer"); return; }
    const validRows = rows.filter(r => r.item_name || r.sku);
    if (validRows.length === 0) { alert("Please add at least one item"); return; }

    setSubmitting(true);
    const payload = {
      customer_id:   billTo.id,
      customer_name: billTo.companyName,
      bill_to_id:    billTo.id,
      ship_to_id:    shipSameAsBill ? billTo.id : (shipTo?.id || billTo.id),
      is_wholesaler: !!billTo.isWholesaler,
      salesman_id:       form.salesman_id || null,
      validity_days:     Number(form.validity_days) || 15,
      delivery_by:       form.delivery_by,
      delivery_type:     form.delivery_type,
      payment_type:      form.payment_type,
      delivery_instructions: form.delivery_instructions,
      charges_packing:      Number(form.charges_packing)      || 0,
      charges_cartage:      Number(form.charges_cartage)      || 0,
      charges_forwarding:   Number(form.charges_forwarding)   || 0,
      charges_installation: Number(form.charges_installation) || 0,
      charges_loading:      Number(form.charges_loading)      || 0,
      items: validRows.map(r => ({
        sku:            r.sku,
        item_name:      r.item_name,
        instruction:    r.instruction,
        qty:            Number(r.qty),
        rate:           Number(r.rate || 0),
        discount_type:  r.discount_type,
        discount_value: Number(r.discount_value),
        gst_percent:    Number(r.gst_percent),
        hsn_code:       r.hsn_code,
        amount:         calcAmount(r),
        gst_amount:     calcGst(r),
      })),
    };

    try {
      const result = await onSubmit(payload, editId);
      if (result?.ok) {
        alert(result.message || "Saved ✅");
        navigate(result.redirect || -1);
      } else {
        alert(result?.message || "Failed to save");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <PageLayout title={pageTitle}>
      <div style={{ padding: 32, textAlign: "center", color: theme.textMuted }}>Loading…</div>
    </PageLayout>
  );

  return (
    <PageLayout title={pageTitle}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>

        {/* ── Customer ── */}
        {sectionDivider("Customer")}

        <div style={{ marginBottom: 14 }}>
          <CustomerSearchField
            label="Bill To *"
            value={billTo}
            placeholder="Search customer by name, mobile, tag…"
            onSelect={(c) => { setBillTo(c); if (shipSameAsBill) setShipTo(c); }}
            onClear={() => { setBillTo(null); if (shipSameAsBill) setShipTo(null); }}
          />
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => { const next = !shipSameAsBill; setShipSameAsBill(next); if (next) setShipTo(billTo); else setShipTo(null); }}
              style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${shipSameAsBill ? theme.primary : theme.border}`, background: shipSameAsBill ? theme.primary : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", cursor: "pointer", flexShrink: 0 }}
            >
              {shipSameAsBill && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>
              Ship To — <span style={{ color: theme.textMuted, fontWeight: 400 }}>Same as Bill To</span>
            </span>
          </label>

          {!shipSameAsBill && (
            <CustomerSearchField label="Ship To *" value={shipTo} placeholder="Search shipping address customer…"
              onSelect={(c) => setShipTo(c)} onClear={() => setShipTo(null)} />
          )}

          {shipSameAsBill && billTo && (
            <div style={{ background: theme.surface, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: theme.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>📦 Ships to: <strong style={{ color: theme.text }}>{billTo.companyName}</strong>{billTo.city ? ` · ${billTo.city}` : ""}</span>
              {billTo.isWholesaler && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#a16207", borderRadius: 10, padding: "2px 8px" }}>
                  Wholesale Pricing Active
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Items ── */}
        {sectionDivider("Items")}
        {rows.map((row, i) => (
          <ItemRow key={i} row={row} index={i} items={items}
            canRemove={rows.length > 1}
            onChange={updateRow}
            onRemove={removeRow}
            isWholesaler={!!billTo?.isWholesaler}
          />
        ))}
        <button type="button" onClick={addRow}
          style={{ width: "100%", padding: "12px", borderRadius: 8, background: theme.primaryLight, color: theme.primary, border: `1.5px dashed ${theme.primary}`, cursor: "pointer", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          + Add Item
        </button>

        {/* ── Extra Charges ── */}
        {sectionDivider("Extra Charges")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { key: "charges_packing",      label: "Wooden Packing" },
            { key: "charges_cartage",       label: "Cartage" },
            { key: "charges_forwarding",    label: "Forwarding" },
            { key: "charges_installation",  label: "Onsite Installation" },
            { key: "charges_loading",       label: "Unloading" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={lbl}>{label} (₹)</label>
              <input type="number" min="0" step="0.01" value={form[key]} placeholder="—"
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
            </div>
          ))}
        </div>

        {/* ── Delivery & Payment ── */}
        {sectionDivider("Delivery & Payment")}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}>Salesman</label>
            <select value={form.salesman_id} onChange={e => setForm(f => ({ ...f, salesman_id: e.target.value }))} style={inp}>
              <option value="">Select Salesman</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Validity (days)</label>
              <input type="number" min="1" value={form.validity_days}
                onChange={e => setForm(f => ({ ...f, validity_days: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Booking At</label>
              <input type="text" placeholder="e.g. Transport Name" value={form.delivery_by}
                onChange={e => setForm(f => ({ ...f, delivery_by: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Goods Sent By</label>
              <select value={form.delivery_type} onChange={e => setForm(f => ({ ...f, delivery_type: e.target.value }))} style={inp}>
                {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Payment Mode</label>
              <select value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))} style={inp}>
                {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Delivery Instructions</label>
            <textarea rows={2} placeholder="Any special delivery note…" value={form.delivery_instructions}
              onChange={e => setForm(f => ({ ...f, delivery_instructions: e.target.value }))}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* ── Summary ── */}
        {sectionDivider("Summary")}
        <div style={{ background: theme.surface, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: theme.textMuted }}>
            <span>Sub Total (before GST)</span>
            <span>₹{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>

          {Object.keys(gstByRate).sort((a, b) => Number(a) - Number(b)).map(rate => (
            <div key={rate} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: theme.textMuted }}>
                GST @{rate}%
                <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>
                  on ₹{(gstByRate[rate] / (Number(rate) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </span>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>
                + ₹{gstByRate[rate].toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}

          {totalGst > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, borderTop: `1px dashed ${theme.border}`, paddingTop: 6 }}>
              <span style={{ color: theme.textMuted }}>Total GST</span>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {extraCharges > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: theme.textMuted }}>
              <span>Extra Charges</span>
              <span>₹{extraCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, borderTop: `1px solid ${theme.border}`, paddingTop: 10, marginTop: 4 }}>
            <span>Grand Total</span>
            <span style={{ color: theme.primary }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ position: "sticky", bottom: 0, background: "#fff", padding: "12px 0 4px", borderTop: `1px solid ${theme.border}`, marginTop: 8 }}>
          <button type="submit" disabled={submitting}
            style={{ width: "100%", padding: "14px", borderRadius: 10, background: submitting ? "#93c5fd" : theme.primary, color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, letterSpacing: "0.02em" }}>
            {submitting ? "Saving…" : editId ? (updateLabel || "Update ✓") : (submitLabel || "Save ✓")}
          </button>
        </div>

      </form>
    </PageLayout>
  );
}

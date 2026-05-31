import React, { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";
import { GST_OPTIONS } from "./config/gstOptions";

// ── helpers ──────────────────────────────────────────────────────────────────

function isSalesReady(item) {
  return item.hsnCode && item.hsnCode.trim() !== "" && Number(item.costPrice) > 0;
}

const calcWholesalePrice = (data, retailPrice) => {
  if (!data || !data.wholesale || Number(data.wholesale) <= 0) return 0;
  if (data.wholesaleMode === "percent") {
    const pct = Math.min(Number(data.wholesale), 100);
    return Math.max(0, retailPrice - (retailPrice * pct / 100));
  }
  return Math.max(0, retailPrice - Number(data.wholesale));
};

const deriveProductSku = (variantSkus) => {
  if (!variantSkus || variantSkus.length === 0) return "";
  if (variantSkus.length === 1) {
    const idx = variantSkus[0].lastIndexOf(" - ");
    return idx !== -1 ? variantSkus[0].slice(0, idx).trim() : variantSkus[0];
  }
  const parts = variantSkus.map(s => s.split(" - ")[0].trim());
  const first = parts[0];
  return parts.every(p => p === first) ? first : variantSkus[0];
};

function groupItems(items) {
  const map = {};
  for (const item of items) {
    const key = item.itemName;
    if (!map[key]) {
      map[key] = { sku: item.sku, title: item.itemName, variants: [] };
    }
    map[key].variants.push(item);
  }
  return Object.values(map)
    .map(g => ({
      ...g,
      productSku: deriveProductSku(g.variants.map(v => v.sku)),
      variants: [...g.variants].sort((a, b) => (a.sku || "").localeCompare(b.sku || "")),
    }))
    .sort((a, b) => {
      const c = (a.productSku || a.title || "").localeCompare(b.productSku || b.title || "");
      return c !== 0 ? c : (a.title || "").localeCompare(b.title || "");
    });
}

// ── Catalog health strip ──────────────────────────────────────────────────────

const HEALTH_CARDS = [
  { key: 'syncTotal',      label: 'Active Catalog',   color: '#2563eb', bg: '#eff6ff' },
  { key: 'quotationReady', label: 'Quotation Ready',  color: '#16a34a', bg: '#f0fdf4' },
  { key: 'boqReady',       label: 'BOQ Ready',        color: '#7c3aed', bg: '#faf5ff' },
  { key: 'wholesaleReady', label: 'Wholesale Ready',  color: '#d97706', bg: '#fffbeb' },
  { key: 'hiddenVariants', label: 'Hidden Variants',  color: '#6b7280', bg: '#f9fafb' },
];

const PHASE_LABELS = {
  starting:  'Starting sync…',
  fetching:  'Fetching Shopify products…',
  saving:    'Saving variants…',
};

function CatalogHealth({ stats, onSync, syncing, syncPhase }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {HEALTH_CARDS.map(c => {
          const data = stats[c.key];
          const isScalar = c.key === 'hiddenVariants';
          const items    = isScalar ? null : (data?.items    ?? '…');
          const variants = isScalar ? (data ?? '…') : (data?.variants ?? '…');
          return (
            <div key={c.key} style={{
              flex: '1 1 130px', minWidth: 110,
              background: c.bg, border: `1px solid ${c.color}30`,
              borderRadius: 10, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                {c.label}
              </div>
              {items !== null && (
                <div style={{ fontSize: 17, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>
                  {typeof items === 'number' ? items.toLocaleString() : items}
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', marginLeft: 3 }}>items</span>
                </div>
              )}
              <div style={{
                fontSize: items !== null ? 12 : 20,
                fontWeight: items !== null ? 500 : 800,
                color: items !== null ? '#64748b' : c.color,
                marginTop: items !== null ? 1 : 0,
              }}>
                {typeof variants === 'number' ? variants.toLocaleString() : variants}
                <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', marginLeft: 3 }}>variants</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {syncing && syncPhase && (
          <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            {PHASE_LABELS[syncPhase] ?? 'Sync Running…'}
          </span>
        )}
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            padding: '6px 16px', borderRadius: 6, border: 'none',
            cursor: syncing ? 'not-allowed' : 'pointer',
            background: syncing ? '#94a3b8' : '#0f172a',
            color: '#fff', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {syncing && (
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              display: 'inline-block',
              animation: 'spinLoader 0.8s linear infinite',
            }} />
          )}
          {syncing ? 'Sync Running…' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}

// ── Inline config form (pending = configure, ready = re-edit) ─────────────────

function InlineConfigForm({ item, mainData, selectedItems, selectedVariants,
  setMainData, setSelectedItems, setSelectedVariants, onSaved, onHide, isEditMode }) {

  const data = mainData[item.sku] || {};

  // In edit mode all fields are always enabled; in pending mode gated by checkbox
  const fieldsEnabled = isEditMode || (selectedItems[item.sku] || false);

  // Auto-select all variants when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      const upd = {};
      item.variants.forEach(v => { upd[v.sku] = true; });
      setSelectedVariants(prev => ({ ...prev, ...upd }));
    }
  }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldsReady =
    data.hsn && data.hsn.trim() !== "" &&
    data.gst !== "" && data.gst !== undefined && data.gst !== null &&
    !isNaN(Number(data.cost)) && Number(data.cost) > 0;

  const btnEnabled = fieldsEnabled && fieldsReady;

  const handleSave = async (e) => {
    e.stopPropagation();
    const missing = [];
    if (!data.hsn || data.hsn.trim() === "") missing.push("HSN Code");
    if (data.gst === "" || data.gst === undefined) missing.push("GST %");
    if (!data.cost || Number(data.cost) <= 0) missing.push("Cost Price");
    if (missing.length) { toast.error(`Fill: ${missing.join(", ")}`); return; }

    const variantsToSave = isEditMode
      ? item.variants
      : item.variants.filter(v => selectedVariants[v.sku]);

    if (!isEditMode && variantsToSave.length === 0) {
      toast.error("Select at least one variant"); return;
    }

    const gstValue  = Number(data.gst);
    const costValue = Number(data.cost);

    if (data.wholesale && Number(data.wholesale) > 0 && (data.wholesaleMode || "rs") === "rs") {
      const bad = variantsToSave.filter(v => Number(data.wholesale) >= Number(v.sellingPrice || 0));
      if (bad.length) {
        toast.warn(`Discount ₹${data.wholesale} exceeds selling price for: ${bad.map(v => v.sku).join(", ")}`);
        return;
      }
    }

    const payload = variantsToSave.map(v => {
      const retail = Number(v.sellingPrice || 0);
      return {
        sku: v.sku, hsnCode: data.hsn,
        gst: gstValue, costPrice: costValue,
        wholesalePrice: calcWholesalePrice(data, retail),
        unit: "Nos",
        mainCategoryType: data.categoryType  || null,
        serviceSubtype:   data.categoryType === "SERVICE" ? (data.serviceSubtype || null) : null,
      };
    });

    try {
      const res = await apiFetch(`/shopify-catalog/bulk-configure`, { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(isEditMode ? "Configuration updated" : "Saved — item is now ready for quotations");
      if (!isEditMode) {
        setSelectedItems(prev => ({ ...prev, [item.sku]: false }));
        const cleared = {};
        item.variants.forEach(v => { cleared[v.sku] = false; });
        setSelectedVariants(prev => ({ ...prev, ...cleared }));
      }
      onSaved();
    } catch { toast.error("Save failed"); }
  };

  return (
    <div style={{ marginTop: 12, paddingLeft: isEditMode ? 0 : 60 }}>
      {isEditMode && (
        <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Edit Configuration
        </div>
      )}
      <div style={{ padding: 10, background: "#f5f5f5", borderRadius: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            placeholder="HSN Code"
            maxLength={8}
            inputMode="numeric"
            value={data.hsn || ""}
            onClick={e => e.stopPropagation()}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, "");
              setMainData(p => ({ ...p, [item.sku]: { ...(p[item.sku] || {}), hsn: v } }));
            }}
            disabled={!fieldsEnabled}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <select
            value={String(data.gst ?? "")}
            onClick={e => e.stopPropagation()}
            onChange={e => setMainData(p => ({ ...p, [item.sku]: { ...(p[item.sku] || {}), gst: e.target.value } }))}
            disabled={!fieldsEnabled}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          >
            {GST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            placeholder="Cost Price (₹)"
            value={data.cost || ""}
            onClick={e => e.stopPropagation()}
            onChange={e => setMainData(p => ({ ...p, [item.sku]: { ...(p[item.sku] || {}), cost: e.target.value } }))}
            disabled={!fieldsEnabled}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />

          {/* Category classification */}
          <div onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: "#5b21b6", fontWeight: 600, marginBottom: 4 }}>
              ERP Classification (optional — set after sync)
            </div>
            <select
              value={data.categoryType || ""}
              onClick={e => e.stopPropagation()}
              onChange={e => setMainData(p => ({
                ...p,
                [item.sku]: { ...(p[item.sku] || {}), categoryType: e.target.value, serviceSubtype: "" },
              }))}
              disabled={!fieldsEnabled}
              style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
            >
              <option value="">— Main Category Type (optional) —</option>
              <option value="TRADING">Trading</option>
              <option value="MANUFACTURING">Manufacturing</option>
              <option value="SERVICE">Service</option>
            </select>
            {data.categoryType === "SERVICE" && (
              <select
                value={data.serviceSubtype || ""}
                onClick={e => e.stopPropagation()}
                onChange={e => setMainData(p => ({
                  ...p,
                  [item.sku]: { ...(p[item.sku] || {}), serviceSubtype: e.target.value },
                }))}
                disabled={!fieldsEnabled}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: "100%", marginTop: 6 }}
              >
                <option value="">— Service Subtype (optional) —</option>
                <option value="AMC">AMC</option>
                <option value="REPAIR">Repair</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="SPARE_PART">Spare part</option>
              </select>
            )}
          </div>

          {/* Wholesale */}
          <div onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, color: "#a16207", fontWeight: 600, marginBottom: 4 }}>
              Wholesale Price (per variant)
            </div>
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #ca8a04" }}>
              {["percent", "rs"].map(mode => (
                <button key={mode} type="button" disabled={!fieldsEnabled}
                  onClick={() => setMainData(p => ({ ...p, [item.sku]: { ...(p[item.sku] || {}), wholesaleMode: mode, wholesale: "" } }))}
                  style={{
                    padding: "6px 12px", border: "none",
                    borderRight: mode === "percent" ? "1px solid #ca8a04" : "none",
                    background: (data.wholesaleMode || "rs") === mode ? "#ca8a04" : "#fefce8",
                    color: (data.wholesaleMode || "rs") === mode ? "#fff" : "#a16207",
                    fontWeight: 700, fontSize: 12, cursor: fieldsEnabled ? "pointer" : "not-allowed",
                    opacity: fieldsEnabled ? 1 : 0.5,
                  }}>{mode === "percent" ? "%" : "₹"}</button>
              ))}
              <input
                value={data.wholesale || ""}
                placeholder={(data.wholesaleMode || "rs") === "percent" ? "Discount %" : "Discount ₹"}
                onChange={e => setMainData(p => ({ ...p, [item.sku]: { ...(p[item.sku] || {}), wholesale: e.target.value } }))}
                disabled={!fieldsEnabled}
                style={{ flex: 1, padding: "6px 8px", border: "none", background: fieldsEnabled ? "#fefce8" : "#fafafa", outline: "none" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={!btnEnabled}
          style={{
            flex: 1, padding: "10px 14px",
            background: btnEnabled ? (isEditMode ? "#2563eb" : "#16a34a") : "#d1d5db",
            color: "#fff", border: "none", borderRadius: 6,
            cursor: btnEnabled ? "pointer" : "not-allowed",
            fontWeight: 600, fontSize: 14,
          }}
        >
          {isEditMode
            ? (btnEnabled ? "✓ Update Configuration" : "Fill HSN + GST + Cost to Update")
            : (btnEnabled ? "✓ Configure & Make Ready" : "Fill HSN + GST + Cost to Enable")}
        </button>
        {!isEditMode && onHide && (
          <button
            onClick={e => { e.stopPropagation(); onHide(); }}
            style={{
              padding: "10px 14px", background: "#fee2e2", color: "#dc2626",
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
            title="Hide this item — it won't reappear on future syncs"
          >
            Hide
          </button>
        )}
      </div>

      {/* Variants */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", margin: "10px 0 4px", textTransform: "uppercase" }}>
        Variants ({item.variants.length})
      </div>
      {item.variants.map((v, i) => {
        const retail    = Number(v.sellingPrice || 0);
        const cost      = Number(data.cost || 0);
        const wholesale = calcWholesalePrice(data, retail);
        const profit    = cost > 0 && retail > 0 ? retail - cost : null;
        const markup    = profit !== null && cost > 0 ? ((profit / cost) * 100).toFixed(1) : null;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0",
            borderBottom: i < item.variants.length - 1 ? "1px solid #f0f0f0" : "none",
          }}>
            {!isEditMode && (
              <input type="checkbox"
                checked={selectedVariants[v.sku] || false}
                onClick={e => e.stopPropagation()}
                onChange={e => setSelectedVariants(p => ({ ...p, [v.sku]: e.target.checked }))}
                style={{ marginTop: 4 }}
              />
            )}
            <img src={v.image || "https://via.placeholder.com/40"} alt=""
              style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, background: "#e0eeff", color: "#0066b3",
                borderRadius: 4, padding: "2px 7px", display: "inline-block", marginBottom: 3 }}>
                {v.sku || "N/A"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{v.itemName || item.title}</div>
              <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>
                Retail: <strong>₹{retail}</strong>
                {wholesale > 0 && <span style={{ marginLeft: 10 }}>Wholesale: <strong>₹{wholesale.toFixed(2)}</strong></span>}
                {profit !== null && (
                  <span style={{ marginLeft: 10, color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                    Margin: ₹{profit.toFixed(2)} ({markup}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Product card (collapsible, used in both tabs) ─────────────────────────────

function ProductCard({ item, tab, mainData, selectedItems, selectedVariants,
  setMainData, setSelectedItems, setSelectedVariants, openSku, setOpenSku, onSaved, onHide, onRestore }) {

  const isOpen  = openSku === item.sku;
  const ready   = item.variants.every(v => isSalesReady(v));

  return (
    <div
      onClick={e => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
        setOpenSku(isOpen ? null : item.sku);
      }}
      style={{
        padding: 12, borderRadius: 12, background: '#fff', marginBottom: 12,
        cursor: "pointer", transition: "all 0.2s",
        boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.05)",
        borderLeft: tab === "ready" ? "4px solid #22c55e" : tab === "hidden" ? "4px solid #9ca3af" : "4px solid #ef4444",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <img src={item.variants[0]?.image || "https://via.placeholder.com/60"} alt=""
          style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }} />

        {tab === "pending" && (
          <input type="checkbox"
            checked={selectedItems[item.sku] || false}
            onClick={e => e.stopPropagation()}
            onChange={e => {
              const checked = e.target.checked;
              setSelectedItems(p => ({ ...p, [item.sku]: checked }));
              const upd = {};
              item.variants.forEach(v => { upd[v.sku] = checked; });
              setSelectedVariants(p => ({ ...p, ...upd }));
            }}
          />
        )}

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, background: "#e0eeff", color: "#0066b3",
              borderRadius: 4, padding: "2px 8px" }}>
              {item.productSku || item.sku}
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>
              {item.variants.length} variant{item.variants.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{item.title}</div>
          {tab === "ready" && item.variants[0] && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              HSN: {item.variants[0].hsnCode} | GST: {item.variants[0].gst}% | Cost: ₹{item.variants[0].costPrice}
              {item.variants[0].mainCategoryType && (
                <span style={{ marginLeft: 8, fontWeight: 600, color: '#5b21b6' }}>
                  · {item.variants[0].mainCategoryType}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Ready badge — always visible for non-hidden items */}
          {tab !== "hidden" && (
            <div style={{
              padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: ready ? "#dcfce7" : "#fee2e2",
              color: ready ? "#16a34a" : "#dc2626",
            }}>
              {ready ? "✓ Ready" : "✕ Pending"}
            </div>
          )}

          {/* Edit button — visible on ALL tabs except hidden */}
          {tab !== "hidden" && (
            <button
              onClick={e => { e.stopPropagation(); setOpenSku(isOpen ? null : item.sku); }}
              style={{
                padding: "4px 10px", borderRadius: 5, border: "1px solid #cbd5e1",
                cursor: "pointer", background: isOpen ? "#f1f5f9" : "#fff",
                color: "#374151", fontSize: 12, fontWeight: 600,
              }}
            >
              {isOpen ? "Close" : "Edit"}
            </button>
          )}

          {/* Restore button for hidden items */}
          {tab === "hidden" && (
            <button
              onClick={e => { e.stopPropagation(); onRestore(item.variants.map(v => v.id)); }}
              style={{ padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600 }}
            >Restore</button>
          )}

          <div style={{ fontSize: 18 }}>{isOpen ? "▲" : "▼"}</div>
        </div>
      </div>

      {/* Expand */}
      {isOpen && (
        <div>
          {/* Pending: config form with checkbox + Hide button */}
          {tab === "pending" && (
            <InlineConfigForm
              item={item}
              mainData={mainData}
              selectedItems={selectedItems}
              selectedVariants={selectedVariants}
              setMainData={setMainData}
              setSelectedItems={setSelectedItems}
              setSelectedVariants={setSelectedVariants}
              onSaved={onSaved}
              onHide={() => onHide(item.variants.map(v => v.id))}
              isEditMode={false}
            />
          )}

          {/* Ready: config form in edit mode (always enabled, no checkbox) + per-variant hide */}
          {tab === "ready" && (
            <div style={{ marginTop: 10 }}>
              <InlineConfigForm
                item={item}
                mainData={mainData}
                selectedItems={selectedItems}
                selectedVariants={selectedVariants}
                setMainData={setMainData}
                setSelectedItems={setSelectedItems}
                setSelectedVariants={setSelectedVariants}
                onSaved={onSaved}
                isEditMode={true}
              />
              <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase" }}>
                  Hide individual variants
                </div>
                {item.variants.map((v, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                    borderBottom: i < item.variants.length - 1 ? "1px solid #f9f9f9" : "none",
                  }}>
                    <img src={v.image || "https://via.placeholder.com/32"} alt=""
                      style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                    <span style={{ flex: 1, fontSize: 12 }}>
                      <strong>{v.sku}</strong> — ₹{v.sellingPrice}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onHide([v.id]); }}
                      style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                        background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600 }}
                    >Hide</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden: read-only variant list */}
          {tab === "hidden" && (
            <div style={{ marginTop: 10, paddingLeft: 60 }}>
              {item.variants.map((v, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                  borderBottom: i < item.variants.length - 1 ? "1px solid #f0f0f0" : "none",
                }}>
                  <img src={v.image || "https://via.placeholder.com/40"} alt=""
                    style={{ width: 36, height: 36, borderRadius: 5, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, background: "#e0eeff", color: "#0066b3",
                      borderRadius: 4, padding: "1px 6px", marginRight: 6 }}>{v.sku}</span>
                    <span style={{ fontSize: 13 }}>{v.itemName || item.title}</span>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Cost: ₹{v.costPrice} | Retail: ₹{v.sellingPrice}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sync status panel (persistent history) ────────────────────────────────────

function syncAbsTime(iso) {
  if (!iso) return null;
  const d   = new Date(iso);
  const now = new Date();
  const yest = new Date(now - 86400000);
  const t   = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString())  return `Today ${t}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${t}`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
}

function syncSummary(rec) {
  if (!rec) return { text: 'No record this session', color: '#9ca3af' };
  const isFatal = !!rec.error && rec.fetchedProducts === 0;
  if (isFatal) return { text: rec.error, color: '#dc2626' };
  const parts = [];
  if (rec.inserted) parts.push(`+${rec.inserted} added`);
  if (rec.changed)  parts.push(`${rec.changed} changed`);
  if (rec.errors)   parts.push(`${rec.errors} error${rec.errors > 1 ? 's' : ''}`);
  if (parts.length === 0) return { text: 'Verified — no changes', color: '#6b7280' };
  return { text: parts.join(' · '), color: rec.errors > 0 ? '#d97706' : '#16a34a' };
}

function SyncHistoryCard({ label, icon, record }) {
  const ts  = record ? syncAbsTime(record.completedAt) : null;
  const sum = syncSummary(record);
  return (
    <div style={{
      flex: '1 1 160px', minWidth: 140,
      background: '#f9fafb', border: '1px solid #e5e7eb',
      borderRadius: 10, padding: '9px 12px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
        {icon} {label}
      </div>
      {ts
        ? <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{ts}</div>
        : <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>—</div>}
      <div style={{ fontSize: 11, color: sum.color, fontWeight: 500, lineHeight: 1.3 }}>{sum.text}</div>
    </div>
  );
}

function FreshnessCard({ lastSuccessfulSyncAt, running }) {
  if (running) return (
    <div style={{ flex: '1 1 160px', minWidth: 140, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>Catalog health</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Sync in progress…</div>
    </div>
  );

  const mins = lastSuccessfulSyncAt
    ? Math.round((Date.now() - new Date(lastSuccessfulSyncAt).getTime()) / 60000)
    : null;

  let color, bg, bd, title, detail;
  if (mins === null) {
    color = '#9ca3af'; bg = '#f9fafb'; bd = '#e5e7eb';
    title = 'Never verified'; detail = 'Run a sync to verify catalog';
  } else if (mins < 1560) {  // < 26 h — daily sync is healthy
    color = '#16a34a'; bg = '#f0fdf4'; bd = '#bbf7d0';
    title = 'Catalog verified';
    detail = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
  } else if (mins < 4320) {  // < 72 h
    color = '#d97706'; bg = '#fffbeb'; bd = '#fde68a';
    title = 'Sync stale';
    detail = `${Math.round(mins / 60)}h since last sync`;
  } else {
    color = '#dc2626'; bg = '#fff1f2'; bd = '#fecaca';
    title = 'Sync overdue';
    detail = `${Math.round(mins / 1440)}d since last sync`;
  }

  return (
    <div style={{ flex: '1 1 160px', minWidth: 140, background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>Catalog health</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{detail}</div>
    </div>
  );
}

function SyncStatusPanel({ data }) {
  if (!data) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SyncHistoryCard label="Auto Sync" icon="🔄" record={data.autoSync} />
        <SyncHistoryCard label="Manual Sync" icon="▶" record={data.manualSync} />
        <FreshnessCard lastSuccessfulSyncAt={data.lastSuccessfulSyncAt} running={data.status === 'running'} />
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
        Deleted-product tracking not yet implemented — removed count is not shown.
      </div>
    </div>
  );
}

// ── Sync result panel ─────────────────────────────────────────────────────────

function SyncResultPanel({ result, onDismiss }) {
  if (!result) return null;

  const isFatal   = !!result.error && result.fetched === 0;
  const hasErrors = result.errors > 0;
  const noChanges = !isFatal && result.inserted === 0 && result.changed === 0 && result.errors === 0;
  const durationS = result.durationMs != null ? (result.durationMs / 1000).toFixed(1) : null;
  const verifiedAt = result.verifiedAt
    ? new Date(result.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bg    = isFatal ? '#fff1f2' : hasErrors ? '#fffbeb' : '#f0fdf4';
  const bd    = isFatal ? '#fecaca' : hasErrors ? '#fde68a' : '#bbf7d0';
  const hd    = isFatal ? '#dc2626' : hasErrors ? '#d97706' : '#16a34a';
  const title = isFatal
    ? 'Sync Failed'
    : hasErrors
    ? 'Sync Completed — Partial Failures'
    : noChanges
    ? 'Verified — No catalog changes detected'
    : 'Sync Complete';

  return (
    <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: hd, marginBottom: 6 }}>{title}</div>
        <button onClick={onDismiss} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {isFatal ? (
        <div style={{ fontSize: 12, color: '#dc2626' }}>{result.error}</div>
      ) : (
        <div style={{ fontSize: 12, color: '#374151' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
            {result.fetched != null && (
              <span style={{ color: '#64748b' }}>Shopify: <strong>{result.fetched}</strong> products · <strong>{result.rawVariants ?? result.variants}</strong> variants</span>
            )}
            {result.inserted > 0 && <span>Added: <strong style={{ color: '#16a34a' }}>{result.inserted}</strong></span>}
            {result.changed > 0  && <span>Changed: <strong style={{ color: '#2563eb' }}>{result.changed}</strong></span>}
            {result.verified > 0 && <span style={{ color: '#9ca3af' }}>Verified unchanged: <strong>{result.verified}</strong></span>}
            {result.skippedSyncIgnored > 0 && <span style={{ color: '#9ca3af' }}>Hidden (ignored): <strong>{result.skippedSyncIgnored}</strong></span>}
            {hasErrors && <span style={{ color: '#dc2626' }}>Errors: <strong>{result.errors}</strong></span>}
            {durationS && <span>Duration: <strong>{durationS}s</strong></span>}
            <span>Last verified: <strong>{verifiedAt}</strong></span>
          </div>
          {(result.skippedMissingSku > 0 || result.skippedMissingPrice > 0 || result.skippedInactive > 0 || result.skippedDuplicateSku > 0 || result.skippedInvalid > 0) && (
            <div style={{ marginTop: 5, fontSize: 11, color: '#92400e', background: '#fef3c7', borderRadius: 5, padding: '3px 8px' }}>
              Shopify exclusions —{result.skippedMissingSku > 0 ? ` missing SKU: ${result.skippedMissingSku}` : ''}{result.skippedMissingPrice > 0 ? ` · price=0: ${result.skippedMissingPrice}` : ''}{result.skippedInactive > 0 ? ` · inactive: ${result.skippedInactive}` : ''}{result.skippedDuplicateSku > 0 ? ` · duplicate SKU: ${result.skippedDuplicateSku}` : ''}{result.skippedInvalid > 0 ? ` · invalid: ${result.skippedInvalid}` : ''}
            </div>
          )}
          {result.rawVariants != null && (
            <div style={{ marginTop: 4, fontSize: 11, color: result.reconciled === false ? '#dc2626' : '#94a3b8', fontFamily: 'monospace', letterSpacing: 0.2 }}>
              {result.rawVariants} raw = {result.inserted} added + {result.changed} changed + {result.verified} verified + {result.skipped} skipped + {result.errors} failed
              {result.reconciled === true ? ' ✓' : result.reconciled === false ? ' ⚠ MISMATCH' : ''}
            </div>
          )}
        </div>
      )}
      {hasErrors && result.error && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#92400e', background: '#fef3c7', borderRadius: 5, padding: '4px 8px' }}>
          {result.error}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShopifyItems() {
  const [tab, setTab] = useState("pending");
  const [allItems, setAllItems] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [openSku, setOpenSku] = useState(null);
  const [mainData, setMainData] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [syncing,        setSyncing]        = useState(false);
  const [syncPhase,      setSyncPhase]      = useState(null);
  const [syncResult,     setSyncResult]     = useState(null);
  const [syncHistory,    setSyncHistory]    = useState(null);
  const pollRef = useRef(null);

  const loadSyncHistory = useCallback(async () => {
    try {
      const r = await apiFetch("/shopify/sync-status");
      if (r.ok) setSyncHistory(await r.json());
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const r = await apiFetch("/shopify-catalog/stats");
      setStats(await r.json());
    } catch {}
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const res = await apiFetch("/shopify-catalog");
      const data = await res.json();
      const shopify = Array.isArray(data) ? data : [];
      setAllItems(shopify);

      // Seed mainData from existing DB values so already-configured items show their data
      const md = {};
      shopify.forEach(item => {
        const sku = item.sku?.trim();
        if (sku) {
          md[sku] = {
            hsn: item.hsnCode || "",
            gst: item.gst ? String(item.gst) : "",
            cost: item.costPrice || "",
            wholesale: item.wholesalePrice > 0 ? String(item.wholesalePrice) : "",
            wholesaleMode: "rs",
            categoryType: item.mainCategoryType || "",
            serviceSubtype: item.serviceSubtype || "",
          };
        }
      });
      setMainData(md);
    } catch (e) { console.error("Load error:", e); }
  }, []);

  useEffect(() => {
    loadItems();
    loadStats();
    loadSyncHistory();
  }, [loadItems, loadStats, loadSyncHistory]);

  // Clear polling interval on unmount to prevent memory leaks / stale state updates
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const refresh = useCallback(() => { loadItems(); loadStats(); loadSyncHistory(); }, [loadItems, loadStats, loadSyncHistory]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setSyncing(false);
    setSyncPhase(null);
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      try {
        const res    = await apiFetch("/shopify/sync-status");
        const status = await res.json();

        // Update live phase label while running
        if (status.status === 'running') {
          setSyncPhase(status.phase === 'saving' ? 'saving' : 'fetching');
          return;
        }

        // Sync finished
        stopPolling();
        setSyncHistory(status);  // update history panel from final status

        const result = {
          fetched:              status.fetchedProducts      ?? 0,
          rawVariants:          status.rawVariants          ?? null,
          variants:             status.total                ?? 0,
          inserted:             status.inserted             ?? 0,
          changed:              status.changed              ?? 0,
          verified:             status.verified             ?? 0,
          skipped:              status.skipped              ?? 0,  // total all reasons
          skippedSyncIgnored:   status.skippedSyncIgnored   ?? 0,
          skippedMissingSku:    status.skippedMissingSku    ?? 0,
          skippedMissingPrice:  status.skippedMissingPrice  ?? 0,
          skippedInactive:      status.skippedInactive      ?? 0,
          skippedInvalid:       status.skippedInvalid       ?? 0,
          skippedDuplicateSku:  status.skippedDuplicateSku  ?? 0,
          errors:               status.errors               ?? 0,
          reconciled:           status.reconciled            ?? null,
          durationMs:           status.durationMs           ?? null,
          error:                status.lastError || undefined,
          verifiedAt:           status.lastSuccessfulSyncAt || null,
        };
        setSyncResult(result);

        const isFatal = !!result.error && result.fetched === 0;
        if (isFatal) {
          toast.error(`Sync failed: ${result.error}`);
        } else if (result.errors > 0) {
          toast.warn(`Sync completed with ${result.errors} error${result.errors > 1 ? 's' : ''} — see result panel`);
        } else if (result.inserted === 0 && result.changed === 0) {
          toast.success("Verified — no catalog changes detected");
        } else {
          const parts = [];
          if (result.inserted) parts.push(`${result.inserted} added`);
          if (result.changed)  parts.push(`${result.changed} changed`);
          toast.success(`Sync complete: ${parts.join(", ")}`);
        }
        refresh();
      } catch {
        // Poll failures are transient — keep polling until sync finishes or timeout
      }
    }, 2500);
  }, [stopPolling, refresh]);

  const handleSync = useCallback(async () => {
    if (syncing) {
      toast.warn("Sync already in progress");
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setSyncPhase('starting');

    try {
      const res  = await apiFetch("/shopify/sync/start", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        stopPolling();
        const msg = body?.message ?? body?.error ?? `Server error (HTTP ${res.status})`;
        setSyncResult({ fetched: 0, rawVariants: 0, variants: 0, inserted: 0, changed: 0, verified: 0, skipped: 0, skippedSyncIgnored: 0, skippedMissingSku: 0, skippedMissingPrice: 0, skippedInactive: 0, skippedInvalid: 0, skippedDuplicateSku: 0, errors: 1, reconciled: false, durationMs: 0, error: msg });
        toast.error(`Could not start sync: ${msg}`);
        return;
      }

      // Backend returned 200 but sync was rejected (not configured, already running, etc.)
      if (body.started === false && body.reason && body.reason.toLowerCase().includes('not configured')) {
        stopPolling();
        const msg = body.reason;
        setSyncResult({ fetched: 0, rawVariants: 0, variants: 0, inserted: 0, changed: 0, verified: 0, skipped: 0, skippedSyncIgnored: 0, skippedMissingSku: 0, skippedMissingPrice: 0, skippedInactive: 0, skippedInvalid: 0, skippedDuplicateSku: 0, errors: 1, reconciled: false, durationMs: 0, error: msg });
        toast.error(msg);
        return;
      }

      if (body.started === false) {
        // Sync was already running — attach to it
        toast.info("Sync already running — tracking progress");
        setSyncPhase('fetching');
      } else {
        setSyncPhase('fetching');
      }

      // Start polling for progress and completion
      startPolling();

    } catch (err) {
      stopPolling();
      const msg = err?.message ?? "Network error — could not reach server";
      setSyncResult({ fetched: 0, rawVariants: 0, variants: 0, inserted: 0, changed: 0, verified: 0, skipped: 0, skippedSyncIgnored: 0, skippedMissingSku: 0, skippedMissingPrice: 0, skippedInactive: 0, skippedInvalid: 0, skippedDuplicateSku: 0, errors: 1, reconciled: false, durationMs: 0, error: msg });
      toast.error(`Could not start sync: ${msg}`);
    }
  }, [syncing, startPolling, stopPolling]);

  const handleHide = async (ids) => {
    try {
      await Promise.all(ids.map(id => apiFetch(`/shopify-catalog/${id}/ignore`, { method: "PATCH" })));
      toast.success("Item hidden — won't reappear on future syncs");
      setOpenSku(null);
      refresh();
    } catch { toast.error("Failed to hide item"); }
  };

  const handleRestore = async (ids) => {
    try {
      await Promise.all(ids.map(id => apiFetch(`/shopify-catalog/${id}/restore`, { method: "PATCH" })));
      toast.success("Item restored");
      setOpenSku(null);
      refresh();
    } catch { toast.error("Failed to restore item"); }
  };

  // Filter allItems into three buckets
  const pending = allItems.filter(i => !isSalesReady(i) && !i.syncIgnored);
  const ready   = allItems.filter(i => isSalesReady(i) && !i.syncIgnored);
  const hidden  = allItems.filter(i => i.syncIgnored);

  const sourceItems = tab === "pending" ? pending : tab === "ready" ? ready : hidden;
  const grouped = groupItems(sourceItems);

  const filtered = grouped.filter(g => {
    const q = search.toLowerCase();
    return !q ||
      (g.title || "").toLowerCase().includes(q) ||
      (g.productSku || "").toLowerCase().includes(q) ||
      g.variants.some(v => (v.sku || "").toLowerCase().includes(q));
  });

  const TABS = [
    { key: "pending", label: "Pending Config", count: pending.length, color: "#dc2626" },
    { key: "ready",   label: "Ready Products", count: ready.length,   color: "#16a34a" },
    { key: "hidden",  label: "Hidden",          count: hidden.length,  color: "#9ca3af" },
  ];

  return (
    <div>
      <style>{`@keyframes spinLoader { to { transform: rotate(360deg); } }`}</style>

      {/* Page title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Shopify catalog</h1>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Synced products requiring configuration</div>
        </div>
      </div>

      {/* Sync history */}
      <SyncStatusPanel data={syncHistory} />

      {/* Catalog health */}
      <CatalogHealth stats={stats} onSync={handleSync} syncing={syncing} syncPhase={syncPhase} />

      {/* Sync result */}
      <SyncResultPanel result={syncResult} onDismiss={() => setSyncResult(null)} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setOpenSku(null); }}
            style={{
              padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              background: tab === t.key ? '#0f172a' : '#e5e7eb',
              color: tab === t.key ? '#fff' : '#374151',
              fontWeight: tab === t.key ? 700 : 500,
            }}>
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: 11,
              color: tab === t.key ? 'rgba(255,255,255,0.7)' : t.color,
              fontWeight: 800,
            }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab banner */}
      {tab === 'pending' && (
        <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 12, border: '1px solid #fde68a' }}>
          These products need HSN code, cost price and GST before they appear in quotations/orders.
        </div>
      )}
      {tab === 'ready' && (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#15803d', marginBottom: 12, border: '1px solid #bbf7d0' }}>
          Fully configured — available in quotation, order and invoice search.
        </div>
      )}
      {tab === 'hidden' && (
        <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 12, color: '#475569', marginBottom: 12, border: '1px solid #e2e8f0' }}>
          Hidden items are excluded from all searches. Restore to bring them back.
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 520, padding: '8px 12px',
            borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 14, background: '#fff',
          }}
        />
      </div>

      {/* List */}
      <div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
            {tab === 'pending' ? 'All Shopify products are configured.' :
             tab === 'ready'   ? 'No ready products yet. Configure items in the Pending tab.' :
             'No hidden items.'}
          </div>
        ) : (
          filtered.map((item, i) => (
            <ProductCard
              key={i}
              item={item}
              tab={tab}
              mainData={mainData}
              selectedItems={selectedItems}
              selectedVariants={selectedVariants}
              setMainData={setMainData}
              setSelectedItems={setSelectedItems}
              setSelectedVariants={setSelectedVariants}
              openSku={openSku}
              setOpenSku={setOpenSku}
              onSaved={refresh}
              onHide={handleHide}
              onRestore={handleRestore}
            />
          ))
        )}
      </div>
    </div>
  );
}

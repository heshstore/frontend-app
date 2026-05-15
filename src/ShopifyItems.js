import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";

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

// ── Sync status banner ────────────────────────────────────────────────────────

function StatsBanner({ stats, onSync, syncing }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
      padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
    }}>
      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        <Stat label="Pending Config" value={stats.shopifyPending} color="#dc2626" />
        <Stat label="Ready" value={stats.shopifyReady} color="#16a34a" />
        <Stat label="Hidden" value={stats.shopifyIgnored} color="#9ca3af" />
      </div>
      <button
        onClick={onSync}
        disabled={syncing}
        style={{
          padding: "7px 16px", borderRadius: 6, border: "none", cursor: syncing ? "not-allowed" : "pointer",
          background: syncing ? "#94a3b8" : "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13,
        }}
      >
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value ?? "…"}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{label}</div>
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
            <option value="">Select GST %</option>
            <option value="5">5%</option>
            <option value="18">18%</option>
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
  const [syncing, setSyncing] = useState(false);

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
  }, [loadItems, loadStats]);

  const refresh = useCallback(() => { loadItems(); loadStats(); }, [loadItems, loadStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/shopify/sync-products", { method: "POST" });
      const result = await res.json();
      const { inserted = 0, updated = 0, skipped = 0, errors = 0 } = result;
      const parts = [];
      if (inserted) parts.push(`${inserted} new`);
      if (updated) parts.push(`${updated} updated`);
      if (skipped) parts.push(`${skipped} skipped`);
      if (errors) parts.push(`${errors} errors`);
      if (errors) toast.warn(`Sync done: ${parts.join(" · ")}`);
      else toast.success(`Sync done: ${parts.join(" · ") || "no changes"}`);
      refresh();
    } catch { toast.error("Sync failed"); }
    setSyncing(false);
  };

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
      {/* Page title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Shopify catalog</h1>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Synced products requiring configuration</div>
        </div>
      </div>

      {/* Stats + Sync */}
      <StatsBanner stats={stats} onSync={handleSync} syncing={syncing} />

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

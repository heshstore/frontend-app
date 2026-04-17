import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";

export default function ShopifyItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [openSku, setOpenSku] = useState(null);
  const [mainData, setMainData] = useState({});
  const [updatedSku, setUpdatedSku] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  

  useEffect(() => {
    loadItems();
  }, []);

  /**
   * Compute the actual wholesale price in Rs from the stored entry.
   * data.wholesaleMode: "percent" → price = retailPrice * (1 - pct/100)
   * data.wholesaleMode: "rs"      → price = retailPrice - discount (discount off selling price)
   */
  const calcWholesalePrice = (data, retailPrice) => {
    if (!data || !data.wholesale || Number(data.wholesale) <= 0) return 0;
    if (data.wholesaleMode === "percent") {
      const pct = Math.min(Number(data.wholesale), 100);
      return Math.max(0, retailPrice - (retailPrice * pct / 100));
    }
    // Rs mode: treat entered value as a discount off selling price
    return Math.max(0, retailPrice - Number(data.wholesale));
  };

  const saveItem = async (item) => {
    const data = mainData[item.sku];
    const gstValue = Number(data && data.gst !== "" ? data.gst : null);
    const costValue = Number(data && data.cost) || 0;

    // All 3 fields must be filled before sending to Item Master
    const missing = [];
    if (!data || !data.hsn || data.hsn.trim() === "") missing.push("HSN Code");
    if (!data || data.gst === "" || data.gst === undefined || data.gst === null) missing.push("GST %");
    if (!data || isNaN(Number(data.cost)) || Number(data.cost) <= 0) missing.push("Cost Price");

    if (missing.length > 0) {
      alert(`Please fill: ${missing.join(", ")} before adding to Item Master`);
      return;
    }

    const anySelected = Object.values(selectedVariants).some(v => v);
    if (!anySelected) {
      alert("Please select at least one variant to update");
      return;
    }

    // Validate: discount amount cannot exceed selling price of any variant (Rs mode)
    if (data && data.wholesale && Number(data.wholesale) > 0 && (data.wholesaleMode || "rs") === "rs") {
      const badVariants = item.variants
        .filter(v => selectedVariants[v.sku])
        .filter(v => Number(data.wholesale) >= Number(v.sellingPrice || 0));
      if (badVariants.length > 0) {
        const names = badVariants.map(v => `${v.sku} (₹${v.sellingPrice})`).join(", ");
        alert(`⚠ Discount ₹${data.wholesale} is equal to or exceeds the selling price for: ${names}\nPlease reduce the discount amount.`);
        return;
      }
    }

    try {
      // Collect selected variants — compute per-variant wholesale price
      const selectedData = item.variants
        .filter(v => selectedVariants[v.sku])
        .map(v => {
          const variantRetail = Number(v.sellingPrice || 0);
          const variantWholesale = calcWholesalePrice(data, variantRetail);
          return {
            itemName: item.title,
            sku: v.sku,
            hsnCode: data.hsn,
            gst: gstValue || 0,
            costPrice: costValue,
            sellingPrice: variantRetail,
            retail_price: variantRetail,
            wholesale_price: variantWholesale,
            image: v.image || "",
            unit: "Nos",
            source: "shopify",
          };
        });

      console.log("BULK SAVE:", selectedData);

      // 🚀 SINGLE API CALL
      const res = await fetch("http://localhost:3000/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedData)
      });

      const result = await res.json();
      console.log("BULK RESPONSE:", result);

      // mark as updated
      setUpdatedSku(prev => ({
        ...prev,
        [item.sku]: true
      }));

      // 🔥 UNCHECK ITEM
      setSelectedItems(prev => ({
        ...prev,
        [item.sku]: false
      }));

      // 🔥 UNCHECK ALL VARIANTS OF THIS ITEM
      const clearedVariants = {};
      item.variants.forEach(v => {
        clearedVariants[v.sku] = false;
      });

      setSelectedVariants(prev => ({
        ...prev,
        ...clearedVariants
      }));

      // ✅ FIX 3 — FORCE UI SYNC AFTER SAVE
      alert("✅ Saved Successfully");
      await loadItems();

    } catch (err) {
      console.error(err);
      alert("Error saving item");
    }
  };

  const loadItems = async () => {
    try {
      // 1. Load Shopify items (NEW APPROACH: load all items, then filter by isShopify)
      const res = await fetch("http://localhost:3000/items");
      const data = await res.json();

      console.log("ALL ITEMS:", data);

      const shopifyItems = data.filter(item => item.source === "shopify");
      setItems(shopifyItems);

      // Reuse same data for Item Master mapping (no second fetch)
      const updated = {};
      const main = {};

      data.forEach(item => {
        // 🚀 STRICT MODE PATCH — FIX DATA MAPPING (FINAL ROOT FIX)
        // DO NOT split SKU, use full SKU always
        const mainSku = item.sku?.trim() || "NO-SKU";
        if (mainSku) {
          updated[mainSku] = true;

          main[mainSku] = {
            hsn: item.hsnCode,
            gst: item.gst ? String(item.gst) : "",
            cost: item.costPrice,
            wholesale: item.wholesale_price > 0 ? String(item.wholesale_price) : "",
            wholesaleMode: "rs",   // default — stored wholesale_price is always an Rs value
          };
        }
      });

      setUpdatedSku(updated);
      setMainData(main);

    } catch (err) {
      console.error("Load error:", err);
    }
  };

  /** Returns true only when HSN + GST + Cost Price are all filled for this SKU */
  const isManualFilled = (sku) => {
    const d = mainData[sku];
    if (!d) return false;
    return (
      d.hsn && d.hsn.trim() !== "" &&
      d.gst && String(d.gst) !== "" &&
      d.cost && Number(d.cost) > 0
    );
  };

  // ── helpers ─────────────────────────────────────────────────────────────
  /**
   * From a list of variant SKUs (e.g. ["F3 - 1624 Clear", "F3 - 1424 Clear"])
   * derive the product-level SKU = the common prefix before " - ".
   * Falls back to the first SKU if no common " - " prefix is found.
   */
  const deriveProductSku = (variantSkus) => {
    if (!variantSkus || variantSkus.length === 0) return "";
    // If single-SKU product just return it
    if (variantSkus.length === 1) {
      const idx = variantSkus[0].lastIndexOf(" - ");
      return idx !== -1 ? variantSkus[0].slice(0, idx).trim() : variantSkus[0];
    }
    // Find longest common prefix token (split by " - ")
    const parts = variantSkus.map(s => s.split(" - ")[0].trim());
    const first = parts[0];
    const allMatch = parts.every(p => p === first);
    return allMatch ? first : variantSkus[0];
  };

  // ✅ GROUPING
  const groupedItems = Object.values(
    items.reduce((acc, item) => {
      const key = item.itemName; // group by clean product title

      if (!acc[key]) {
        acc[key] = {
          sku: item.sku,          // first variant SKU (used as collapse key)
          title: item.itemName,   // clean product title
          variants: []
        };
      }
      acc[key].variants.push(item);
      return acc;
    }, {})
  ).map(group => ({
    ...group,
    // derive a concise product-level SKU from variant SKUs
    productSku: deriveProductSku(group.variants.map(v => v.sku)),
    // sort variants within the group by SKU ascending
    variants: [...group.variants].sort((a, b) => (a.sku || "").localeCompare(b.sku || "")),
  }))
  // sort groups by productSku A→Z, then by title A→Z as tiebreak
  .sort((a, b) => {
    const skuCmp = (a.productSku || a.title || "").localeCompare(b.productSku || b.title || "");
    if (skuCmp !== 0) return skuCmp;
    return (a.title || "").localeCompare(b.title || "");
  });

  // ✅ FILTER (MUST BE HERE — NOT INSIDE JSX)
  const filteredItems = groupedItems.filter(item => {
    const searchText = search.toLowerCase();

    if (
      item.title?.toLowerCase().includes(searchText) ||
      item.sku?.toLowerCase().includes(searchText) ||
      item.productSku?.toLowerCase().includes(searchText)
    ) {
      return true;
    }

    return item.variants.some(v =>
      v.sku?.toLowerCase().includes(searchText) ||
      v.itemName?.toLowerCase().includes(searchText)
    );
  });

  // Mobile layout fix: compute flexDirection for responsive design
  const getFlexDirection = () => (typeof window !== "undefined" && window.innerWidth < 600 ? "column" : "row");

  return (
    <div
      style={{
        background: theme.background,
        minHeight: "100vh",
        padding: "10px",
      }}
    >
      <button onClick={() => navigate(-1)}>← Back</button>

      {/* SEARCH BAR */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: 10,
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search anything (name, sku...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "90%",
            maxWidth: "800px",
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid #ddd",
            fontSize: 16,
            background: "#f9f9f9",
          }}
        />
      </div>

      {/* HEADER */}
      <h2 style={{ marginTop: 20 }}>
        Shopify Items (
        {filteredItems.length} Items • {items.length} Variants
        )
      </h2>

      {/* LIST */}
      <div style={{ marginTop: 15 }}>
        {filteredItems.length === 0 ? (
          <p>No Shopify items found...</p>
        ) : (
          filteredItems.map((item, i) => (
            <div
              key={i}
              onClick={(e) => {
                // prevent collapse when clicking inputs
                if (
                  e.target.tagName === "INPUT" ||
                  e.target.tagName === "SELECT"
                )
                  return;
                setOpenSku(openSku === item.sku ? null : item.sku);
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                background: theme.card,
                marginBottom: 12,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow:
                  openSku === item.sku
                    ? "0 4px 12px rgba(0,0,0,0.15)"
                    : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {/* TOP */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  flexDirection: getFlexDirection(),
                }}
              >
                <img
                  src={item.variants[0]?.image || "https://via.placeholder.com/60"}
                  alt=""
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />

                <input
                  type="checkbox"
                  checked={selectedItems[item.sku] || false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setSelectedItems((prev) => ({
                      ...prev,
                      [item.sku]: checked,
                    }));

                    const updated = {};
                    item.variants.forEach((v) => {
                      updated[v.sku] = checked;
                    });

                    setSelectedVariants((prev) => ({
                      ...prev,
                      ...updated,
                    }));
                  }}
                />

                <div style={{ flex: 1, minWidth: "120px" }}>
                  {/* SKU first */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      background: "#e0eeff", color: "#0066b3",
                      borderRadius: 4, padding: "2px 8px",
                      letterSpacing: "0.03em",
                    }}>
                      {item.productSku || item.sku}
                    </span>
                    <span style={{ fontSize: 11, color: "#888" }}>
                      {item.variants.length} variant{item.variants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Title second */}
                  <div style={{ fontWeight: "600", fontSize: 14, wordBreak: "break-word", color: "#1a1a1a" }}>
                    {item.title}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* STATUS — green tick if all manual fields filled, red cross if not */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 15,
                      background: isManualFilled(item.sku) ? "#dcfce7" : "#fee2e2",
                      color: isManualFilled(item.sku) ? "#16a34a" : "#dc2626",
                      flexShrink: 0,
                    }}
                    title={isManualFilled(item.sku) ? "HSN, GST & Cost filled" : "HSN, GST or Cost missing"}
                  >
                    {isManualFilled(item.sku) ? "✓" : "✕"}
                  </div>

                  {/* EXPAND ICON */}
                  <div style={{ fontSize: 18 }}>
                    {openSku === item.sku ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* EXPAND */}
              <div
                style={{
                  maxHeight: openSku === item.sku ? "2500px" : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s ease",
                }}
              >
                <div style={{ marginTop: 12, paddingLeft: 60 }}>
                  {/* MAIN SKU INPUTS */}
                  <div
                    style={{
                      marginBottom: 10,
                      padding: 10,
                      background: "#f5f5f5",
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <input
                        placeholder="HSN Code"
                        maxLength={8}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={mainData[item.sku]?.hsn || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setMainData((prev) => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              hsn: value,
                            },
                          }));
                        }}
                        disabled={!selectedItems[item.sku]}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                      />

                      {/* ✅ FIX 4 — FIX GST DISPLAY (FINAL SAFE) */}
                      <select
                        value={String(mainData[item.sku]?.gst || "")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setMainData((prev) => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              gst: e.target.value,
                            },
                          }))
                        }
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                        disabled={!selectedItems[item.sku]}
                      >
                        <option value="">Select GST %</option>
                        <option value="5">5%</option>
                        <option value="18">18%</option>
                      </select>

                      <input
                        placeholder="Cost Price (₹)"
                        value={mainData[item.sku]?.cost || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setMainData((prev) => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              cost: e.target.value,
                            },
                          }))
                        }
                        disabled={!selectedItems[item.sku]}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                      />

                      {/* Wholesale price — % or Rs */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: 11, color: "#a16207", fontWeight: 600, marginBottom: 4 }}>
                          Wholesale Price (applied per variant)
                        </div>
                        <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #ca8a04" }}>
                          {/* Mode toggle: % | ₹ */}
                          {["percent", "rs"].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                setMainData(prev => ({
                                  ...prev,
                                  [item.sku]: { ...(prev[item.sku] || {}), wholesaleMode: mode, wholesale: "" },
                                }))
                              }
                              disabled={!selectedItems[item.sku]}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRight: mode === "percent" ? "1px solid #ca8a04" : "none",
                                background: (mainData[item.sku]?.wholesaleMode || "rs") === mode ? "#ca8a04" : "#fefce8",
                                color: (mainData[item.sku]?.wholesaleMode || "rs") === mode ? "#fff" : "#a16207",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: selectedItems[item.sku] ? "pointer" : "not-allowed",
                                opacity: selectedItems[item.sku] ? 1 : 0.5,
                              }}
                            >
                              {mode === "percent" ? "%" : "₹"}
                            </button>
                          ))}
                          <input
                            placeholder={(mainData[item.sku]?.wholesaleMode || "rs") === "percent" ? "Discount % off selling price" : "Discount amount in ₹"}
                            value={mainData[item.sku]?.wholesale || ""}
                            onChange={(e) =>
                              setMainData(prev => ({
                                ...prev,
                                [item.sku]: { ...(prev[item.sku] || {}), wholesale: e.target.value },
                              }))
                            }
                            disabled={!selectedItems[item.sku]}
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              border: "none",
                              background: selectedItems[item.sku] ? "#fefce8" : "#fafafa",
                              fontSize: 13,
                              outline: "none",
                              minWidth: 0,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>
                          {(mainData[item.sku]?.wholesaleMode || "rs") === "percent"
                            ? `Each variant's wholesale = selling price − ${mainData[item.sku]?.wholesale || 0}%`
                            : `Each variant's wholesale = selling price − ₹${mainData[item.sku]?.wholesale || 0} discount`}
                        </div>
                      </div>

                      {/* Margin summary for first variant (as representative) */}
                      {(() => {
                        const cost = Number(mainData[item.sku]?.cost || 0);
                        const retail = Number(item.variants[0]?.sellingPrice || 0);
                        const wholesale = calcWholesalePrice(mainData[item.sku], retail);
                        if (cost <= 0 || retail <= 0) return null;
                        const retailProfit = retail - cost;
                        const retailMarkupPct = ((retailProfit / cost) * 100).toFixed(1);
                        const wholesaleProfit = wholesale > 0 ? wholesale - cost : null;
                        const wholesaleMarkupPct = wholesaleProfit !== null ? ((wholesaleProfit / cost) * 100).toFixed(1) : null;
                        return (
                          <div style={{ fontSize: 12, color: "#444", background: "#f9fafb", borderRadius: 6, padding: "6px 8px" }}>
                            <div style={{ fontWeight: 600, fontSize: 11, color: "#666", marginBottom: 4 }}>
                              Margin preview (first variant · ₹{retail})
                            </div>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "#888" }}>Retail</div>
                                <div>
                                  <strong style={{ color: retailProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                                    ₹{retailProfit.toFixed(2)}
                                  </strong>
                                  <span style={{ color: "#888", marginLeft: 4 }}>
                                    ({retailMarkupPct}% on cost)
                                  </span>
                                </div>
                              </div>
                              {wholesale > 0 && wholesaleProfit !== null && (
                                <div>
                                  <div style={{ fontSize: 11, color: "#888" }}>Wholesale</div>
                                  <div>
                                    <strong style={{ color: wholesaleProfit >= 0 ? "#a16207" : "#dc2626" }}>
                                      ₹{wholesaleProfit.toFixed(2)}
                                    </strong>
                                    <span style={{ color: "#888", marginLeft: 4 }}>
                                      ({wholesaleMarkupPct}% on cost)
                                    </span>
                                    {wholesale > retail && (
                                      <span style={{ color: "#dc2626", marginLeft: 6, fontWeight: 600 }}>⚠ exceeds retail</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {retailProfit < 0 && (
                              <div style={{ color: "#dc2626", marginTop: 4, fontWeight: 600 }}>⚠ Cost price exceeds selling price</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const d = mainData[item.sku];
                    const hsnOk = d && d.hsn && d.hsn.trim() !== "";
                    const gstOk = d && d.gst !== "" && d.gst !== undefined && d.gst !== null;
                    const costOk = d && !isNaN(Number(d.cost)) && Number(d.cost) > 0;
                    const fieldsReady = hsnOk && gstOk && costOk;
                    const btnEnabled = selectedItems[item.sku] && fieldsReady;

                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          saveItem(item);
                        }}
                        disabled={!btnEnabled}
                        title={
                          !selectedItems[item.sku]
                            ? "Select at least one variant"
                            : !fieldsReady
                            ? `Fill ${[!hsnOk && "HSN", !gstOk && "GST %", !costOk && "Cost Price"].filter(Boolean).join(", ")} first`
                            : "Add to Item Master"
                        }
                        style={{
                          marginTop: 10,
                          padding: "10px 14px",
                          background: btnEnabled ? "#16a34a" : "#d1d5db",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          width: "100%",
                          cursor: btnEnabled ? "pointer" : "not-allowed",
                          fontWeight: 600,
                          fontSize: 14,
                          transition: "background 0.2s",
                        }}
                      >
                        {btnEnabled ? "✓ Update & Add to Item Master" : "Fill HSN + GST + Cost to Enable"}
                      </button>
                    );
                  })()}

                  {/* Variants header */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#888", margin: "8px 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Variants ({item.variants.length})
                  </div>

                  {item.variants.map((v, index) => {
                    const d = mainData[item.sku];
                    const cost = Number(d?.cost || 0);
                    const variantRetail = Number(v.sellingPrice || 0);
                    const variantWholesale = calcWholesalePrice(d, variantRetail);
                    const retailProfit = cost > 0 && variantRetail > 0 ? variantRetail - cost : null;
                    const retailMarkup = retailProfit !== null && cost > 0 ? ((retailProfit / cost) * 100).toFixed(1) : null;
                    const wholesaleProfit = variantWholesale > 0 && cost > 0 ? variantWholesale - cost : null;
                    const wholesaleMarkup = wholesaleProfit !== null && cost > 0 ? ((wholesaleProfit / cost) * 100).toFixed(1) : null;
                    const wholesaleExceedsRetail = variantWholesale > 0 && variantWholesale > variantRetail;

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "8px 0",
                          borderBottom: index < item.variants.length - 1 ? "1px solid #f0f0f0" : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVariants[v.sku] || false}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedVariants((prev) => ({ ...prev, [v.sku]: checked }));
                          }}
                          style={{ marginTop: 4 }}
                        />

                        <img
                          src={v.image || "https://via.placeholder.com/40"}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* SKU badge */}
                          <div style={{
                            fontSize: 12, fontWeight: 700,
                            background: "#e0eeff", color: "#0066b3",
                            borderRadius: 4, padding: "2px 7px",
                            display: "inline-block", marginBottom: 3,
                          }}>
                            {v.sku || "N/A"}
                          </div>
                          {/* Title */}
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>
                            {v.itemName || item.title || "No Name"}
                          </div>

                          {/* Price row */}
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                            {/* Selling price */}
                            <span style={{ fontSize: 12, color: "#444" }}>
                              Retail: <strong>₹{variantRetail}</strong>
                            </span>

                            {/* Wholesale price */}
                            {variantWholesale > 0 && (
                              <span style={{ fontSize: 12, color: wholesaleExceedsRetail ? "#dc2626" : "#a16207" }}>
                                Wholesale: <strong>₹{variantWholesale.toFixed(2)}</strong>
                                {wholesaleExceedsRetail && <span style={{ marginLeft: 4 }}>⚠ exceeds retail</span>}
                              </span>
                            )}
                          </div>

                          {/* Margin row */}
                          {cost > 0 && variantRetail > 0 && (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2, fontSize: 11 }}>
                              {retailProfit !== null && (
                                <span style={{ color: retailProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                                  Retail margin: ₹{retailProfit.toFixed(2)} ({retailMarkup}%)
                                </span>
                              )}
                              {wholesaleProfit !== null && (
                                <span style={{ color: wholesaleProfit >= 0 ? "#a16207" : "#dc2626" }}>
                                  Wholesale margin: ₹{wholesaleProfit.toFixed(2)} ({wholesaleMarkup}%)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
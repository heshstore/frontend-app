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

    try {
      // 🚀 STRICT MODE PATCH — BULK SAVE (FRONTEND)
      // 🚀 Collect selected variants — preserve image & prices
      const selectedData = item.variants
        .filter(v => selectedVariants[v.sku])
        .map(v => ({
          itemName: item.title,
          sku: v.sku,
          hsnCode: data.hsn,
          gst: gstValue || 0,
          costPrice: costValue,
          sellingPrice: Number(v.sellingPrice) || 0,
          retail_price: Number(v.sellingPrice) || 0,
          image: v.image || "",
          unit: "Nos",
          source: "shopify",
        }));

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
            cost: item.costPrice
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
                        placeholder="Cost Price"
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

                      <div style={{ fontSize: 12, color: "#444" }}>
                        {(() => {
                          // ✅ FIX 3 — HANDLE NEGATIVE PROFIT SAFELY
                          const cost = Number(mainData[item.sku]?.cost || 0);
                          const price = Number(item.variants[0]?.sellingPrice || 0);
                          if (cost <= 0 || !price) return null;
                          const profit = price - cost;
                          const margin = ((profit / cost) * 100).toFixed(2);
                          return (
                            <>
                              Profit: ₹ {profit} | Margin: {margin}%
                              {/* ✅ FIX 4 — OPTIONAL WARNING (GOOD UX) */}
                              {profit < 0 && (
                                <div style={{ color: "red", fontSize: 12 }}>
                                  Warning: Cost is higher than selling price
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
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

                  {item.variants.map((v, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "6px 0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVariants[v.sku] || false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const checked = e.target.checked;

                          setSelectedVariants((prev) => ({
                            ...prev,
                            [v.sku]: checked,
                          }));
                        }}
                      />

                      <img
                        src={v.image || "https://via.placeholder.com/40"}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          objectFit: "cover",
                        }}
                      />

                      <div>
                        {/* SKU first */}
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          background: "#e0eeff", color: "#0066b3",
                          borderRadius: 4, padding: "2px 7px",
                          display: "inline-block", marginBottom: 3,
                        }}>
                          {v.sku || "N/A"}
                        </div>
                        {/* Clean title second */}
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>
                          {v.itemName || item.title || "No Name"}
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          ₹ {v.sellingPrice || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
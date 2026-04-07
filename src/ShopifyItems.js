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
    // ✅ FIX 1 — STRICT NUMBER CONVERSION
    const gstValue = Number(data && data.gst) || 0;
    const costValue = Number(data && data.cost) || 0;

    // ✅ FIX 1 — RELAX VALIDATION
    if (
      !data ||
      !data.hsn ||
      data.hsn.trim() === "" ||
      isNaN(Number(data.cost))
    ) {
      alert("HSN and Cost must be valid");
      return;
    }

    // ✅ FIX 2 — PREVENT EMPTY SAVE (this part was already correctly present)
    const anySelected = Object.values(selectedVariants).some(v => v);
    if (!anySelected) {
      alert("Please select at least one variant");
      return;
    }

    try {
      // 🚀 STRICT MODE PATCH — BULK SAVE (FRONTEND)
      // 🚀 Collect selected variants
      const selectedData = item.variants
        .filter(v => selectedVariants[v.sku])
        .map(v => ({
          itemName: item.title,
          sku: v.sku,
          hsnCode: data.hsn,
          gst: gstValue || 0,
          costPrice: costValue,
          sellingPrice: Number(v.price) || 0,
          unit: "Nos"
        }));

      console.log("BULK SAVE:", selectedData);

      // 🚀 SINGLE API CALL
      const res = await fetch("https://backend-service-xady.onrender.com/items/bulk", {
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
      // 1. Load Shopify items
      const res = await fetch("https://backend-service-xady.onrender.com/shopify/products");
      const data = await res.json();

      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }

      // 2. Load saved Item Master data
      const savedRes = await fetch("https://backend-service-xady.onrender.com/items");
      const savedData = await savedRes.json();

      const updated = {};
      const main = {};

      savedData.forEach(item => {
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

  // ✅ GROUPING
  const groupedItems = Object.values(
    items.reduce((acc, item) => {
      const key = item.title; // group by title

      if (!acc[key]) {
        acc[key] = {
          sku: item.sku,
          title: item.title,
          variants: []
        };
      }
      acc[key].variants.push(item);
      return acc;
    }, {})
  );

  // ✅ FILTER (MUST BE HERE — NOT INSIDE JSX)
  const filteredItems = groupedItems.filter(item => {
    const searchText = search.toLowerCase();

    if (
      item.title?.toLowerCase().includes(searchText) ||
      item.sku?.toLowerCase().includes(searchText)
    ) {
      return true;
    }

    return item.variants.some(v =>
      v.sku?.toLowerCase().includes(searchText) ||
      v.title?.toLowerCase().includes(searchText)
    );
  });

  // Mobile layout fix: compute flexDirection for responsive design
  const getFlexDirection = () => (typeof window !== "undefined" && window.innerWidth < 600 ? "column" : "row");

  return (
    <div style={{
      background: theme.background,
      minHeight: "100vh",
      padding: "10px"
    }}>

      <button onClick={() => navigate(-1)}>← Back</button>

      {/* SEARCH BAR */}
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginTop: 10
      }}>
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
            background: "#f9f9f9"
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
                if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
                setOpenSku(openSku === item.sku ? null : item.sku);
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                background: theme.card,
                marginBottom: 12,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: openSku === item.sku
                  ? "0 4px 12px rgba(0,0,0,0.15)"
                  : "0 1px 4px rgba(0,0,0,0.05)"
              }}
            >

              {/* TOP */}
              <div style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                flexDirection: getFlexDirection()
              }}>

                <img
                  src={item.variants[0]?.image || "https://via.placeholder.com/60"}
                  alt=""
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: "cover",
                    borderRadius: 8
                  }}
                />

                <input
                  type="checkbox"
                  checked={selectedItems[item.sku] || false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setSelectedItems(prev => ({
                      ...prev,
                      [item.sku]: checked
                    }));

                    const updated = {};
                    item.variants.forEach(v => {
                      updated[v.sku] = checked;
                    });

                    setSelectedVariants(prev => ({
                      ...prev,
                      ...updated
                    }));
                  }}
                />

                <div style={{ flex: 1, minWidth: "120px" }}>
                  <div style={{
                    fontWeight: "600",
                    fontSize: 14,
                    wordBreak: "break-word"
                  }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: 12, color: "#666" }}>
                    SKU: {item.sku} • {item.variants.length} variants
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                  {/* STATUS */}
                  <div style={{ fontSize: 16 }}>
                    {updatedSku[item.sku] ? "✔" : "⚠"}
                  </div>

                  {/* EXPAND ICON */}
                  <div style={{ fontSize: 18 }}>
                    {openSku === item.sku ? "▲" : "▼"}
                  </div>

                </div>

              </div>

              {/* EXPAND */}
              <div style={{
                maxHeight: openSku === item.sku ? "1500px" : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease"
              }}>
                <div style={{ marginTop: 12, paddingLeft: 60 }}>
                  {/* MAIN SKU INPUTS */}
                  <div style={{
                    marginBottom: 10,
                    padding: 10,
                    background: "#f5f5f5",
                    borderRadius: 10
                  }}>

                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}>

                      <input
                        placeholder="HSN Code"
                        maxLength={8}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={mainData[item.sku]?.hsn || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setMainData(prev => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              hsn: value
                            }
                          }));
                        }}
                        disabled={!selectedItems[item.sku]}
                        style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                      />

                      {/* ✅ FIX 4 — FIX GST DISPLAY (FINAL SAFE) */}
                      <select
                        value={String(mainData[item.sku]?.gst || "")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setMainData(prev => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              gst: e.target.value
                            }
                          }))
                        }
                        style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                        disabled={!selectedItems[item.sku]}
                      >
                        <option value="">Select GST</option>
                        <option value="5">5%</option>
                        <option value="18">18%</option>
                      </select>

                      <input
                        placeholder="Cost Price"
                        value={mainData[item.sku]?.cost || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setMainData(prev => ({
                            ...prev,
                            [item.sku]: {
                              ...(prev[item.sku] || {}),
                              cost: e.target.value
                            }
                          }))
                        }
                        disabled={!selectedItems[item.sku]}
                        style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                      />

                      <div style={{ fontSize: 12, color: "#444" }}>
                        {(() => {
                          // ✅ FIX 3 — HANDLE NEGATIVE PROFIT SAFELY
                          const cost = Number(mainData[item.sku]?.cost || 0);
                          const price = Number(item.variants[0]?.price || 0);
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // ✅ FIX 2 — ALWAYS ALLOW SAVE IF USER EDITED (removed redundant check)
                      saveItem(item);
                    }}
                    disabled={!selectedItems[item.sku]}
                    style={{
                      marginTop: 10,
                      padding: "10px",
                      background: selectedItems[item.sku] ? "#4CAF50" : "#ccc",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      width: "100%",
                      cursor: selectedItems[item.sku] ? "pointer" : "not-allowed"
                    }}
                  >
                    Update & Add to Item Master
                  </button>


                  {item.variants.map((v, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "6px 0"
                      }}
                    >

                      <input
                        type="checkbox"
                        checked={selectedVariants[v.sku] || false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const checked = e.target.checked;

                          setSelectedVariants(prev => ({
                            ...prev,
                            [v.sku]: checked
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
                          objectFit: "cover"
                        }}
                      />

                      <div>
                        <div style={{ fontSize: 13, fontWeight: "500" }}>
                          {v.title || "No Name"}
                        </div>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          SKU: {v.sku || "N/A"}
                        </div>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          ₹ {v.price || 0}
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
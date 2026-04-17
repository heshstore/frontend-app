import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import { apiFetch } from "./utils/api";

export default function ItemList() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");

  const loadItems = async () => {
    const res = await apiFetch(`/items`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const deleteItem = async (item) => {
    await apiFetch(`/items/${item.sku}`, { method: "DELETE" });
    loadItems();
  };

  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>
      
      {/* HEADER */}
<div style={{ padding: 15, background: theme.card }}>

  {/* Top Row */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h2>Service Item Master</h2>
    </div>

    <button onClick={() => navigate("/add-item")}>+ Add</button>

  </div>

  {/* Search Bar */}
  <div style={{ marginTop: "10px" }}>
    <input
      type="text"
      placeholder="Search item..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{ padding: "8px", width: "300px" }}
    />
  </div>

  <button onClick={() => navigate("/shopify-items")}>
    View Shopify Items
  </button>

</div>

      {/* LIST */}
      <div style={{ maxWidth: 600, margin: "20px auto" }}>
        {(() => {
          if (!Array.isArray(items)) return [];
          return items
            .filter(item => item.source !== "shopify")
            .map(item => (
              <div key={item.id} style={{
                background: theme.card,
                padding: 15,
                borderRadius: 10,
                marginBottom: 10
              }}>
                <b>{item.itemName}</b><br/>
                Sku: {item.sku} | HSN: {item.hsnCode} | GST: {item.gst}%
                Cost: ₹ {item.costPrice} {item.unit} | Selling: ₹ {item.sellingPrice} {item.unit}

                <div style={{ marginTop: 10 }}>
                  <button onClick={() => navigate(`/edit-item/${item.id}`)}>Edit</button>
                  <button onClick={() => deleteItem(item)}>Delete</button>
                </div>
              </div>
            ));
        })()}
      </div>
    </div>
  );
}
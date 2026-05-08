import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./theme";
import { apiFetch } from "./utils/api";

export default function ItemList() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const loadItems = async () => {
    const res = await apiFetch(`/service-items`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => { loadItems(); }, []);

  const deleteItem = async (item) => {
    await apiFetch(`/service-items/${item.id}`, { method: "DELETE" });
    loadItems();
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q ||
      (item.itemName || "").toLowerCase().includes(q) ||
      (item.sku || "").toLowerCase().includes(q);
  });

  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>

      <div style={{ padding: 15, background: theme.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate(-1)}>← Back</button>
            <div>
              <h2 style={{ margin: 0 }}>Service Item Master</h2>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Manual products, services, repair charges, labor items
              </div>
            </div>
          </div>
          <button onClick={() => navigate("/add-item")}>+ Add Item</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 12px", width: 280, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "20px auto", padding: "0 12px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 40 }}>
            No service items found.
          </div>
        )}

        {filtered.map(item => (
          <div key={item.id} style={{
            background: theme.card,
            padding: 14,
            borderRadius: 10,
            marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{item.itemName}</span>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  SKU: {item.sku || "—"}
                  {item.hsnCode ? ` | HSN: ${item.hsnCode}` : ""}
                  {` | GST: ${item.gst ?? 0}%`}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Cost: ₹{item.costPrice ?? 0} | Selling: ₹{item.sellingPrice ?? 0}
                  {item.unit ? ` / ${item.unit}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => navigate(`/edit-item/${item.id}`)}>Edit</button>
                <button onClick={() => deleteItem(item)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import { apiFetch } from "./utils/api";

export default function ItemList() {
  const [items, setItems]   = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const loadItems = async () => {
    const res  = await apiFetch(`/service-items`);
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
    <PageLayout
      title="Service Item Master"
      subtitle="Manual products, services, repair charges, labor items"
      onSearch={setSearch}
      actions={
        <button
          onClick={() => navigate("/add-item")}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + Add item
        </button>
      }
    >
      <div style={{ maxWidth: 700 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 40 }}>
            No service items found.
          </div>
        )}

        {filtered.map(item => (
          <div key={item.id} style={{
            background: '#fff',
            padding: 14,
            borderRadius: 10,
            marginBottom: 10,
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{item.itemName}</span>
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
                <button
                  onClick={() => navigate(`/edit-item/${item.id}`)}
                  style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item)}
                  style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

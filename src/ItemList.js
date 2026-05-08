import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import EmptyState from "./components/ui/EmptyState";
import { SkeletonList } from "./components/ui/SkeletonCard";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";
import { useConfirm } from "./components/ui/ConfirmModal";

const btn = (extra = {}) => ({
  padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 5,
  height: 28, display: 'inline-flex', alignItems: 'center', gap: 4,
  cursor: 'pointer', border: 'none', ...extra,
});

export default function ItemList() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const navigate = useNavigate();
  const [confirm, confirmModal] = useConfirm();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/service-items');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleDelete = async (item) => {
    if (!await confirm(`Delete "${item.itemName}"?`, 'This cannot be undone.', { danger: true, confirmLabel: 'Delete' })) return;
    try {
      await apiFetch(`/service-items/${item.id}`, { method: 'DELETE' });
      toast.success('Item deleted');
      loadItems();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q ||
      (item.itemName || '').toLowerCase().includes(q) ||
      (item.sku || '').toLowerCase().includes(q) ||
      (item.hsnCode || '').includes(q);
  });

  return (
    <>
    {confirmModal}
    <PageLayout
      title="Service item master"
      subtitle="Manual products, services, repair charges, labor items"
      onSearch={setSearch}
      actions={
        <button
          onClick={() => navigate('/add-item')}
          style={btn({ background: '#2563eb', color: '#fff', padding: '8px 16px', height: 36, fontSize: 13 })}
        >
          + Add item
        </button>
      }
    >
      <div style={{ maxWidth: 700 }}>
        {loading && <SkeletonList count={5} />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon="📦"
            title="No service items found"
            subtitle={search ? `No items match "${search}".` : 'Add service items, parts, and labor charges.'}
            actionLabel="+ Add item"
            onAction={() => navigate('/add-item')}
          />
        )}

        {!loading && filtered.map(item => (
          <div key={item.id} style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            {/* SKU badge */}
            <div style={{
              background: '#dbeafe', color: '#1d4ed8',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700,
              flexShrink: 0, whiteSpace: 'nowrap', marginTop: 1,
            }}>
              {item.sku || '—'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.itemName}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                <span>GST: {item.gst ?? 0}%</span>
                {item.unit && <span>Unit: {item.unit}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {item.costPrice > 0 && <span>Cost: <strong>₹{Number(item.costPrice).toLocaleString('en-IN')}</strong></span>}
                <span>Selling: <strong style={{ color: '#15803d' }}>₹{Number(item.sellingPrice || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => navigate(`/edit-item/${item.id}`)} style={btn({ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' })}>
                Edit
              </button>
              <button onClick={() => handleDelete(item)} style={btn({ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' })}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
    </>
  );
}

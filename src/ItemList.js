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

const CATEGORY_META = {
  TRADING:       { label: 'Trading',       bg: '#dbeafe', color: '#1d4ed8' },
  MANUFACTURING: { label: 'Manufacturing', bg: '#fef3c7', color: '#92400e' },
  SERVICE:       { label: 'Service',       bg: '#d1fae5', color: '#065f46' },
};

const BOQ_META = {
  NOT_CREATED: { label: 'No BOQ',  bg: '#f3f4f6', color: '#6b7280' },
  PARTIAL:     { label: 'Partial', bg: '#fef9c3', color: '#78350f' },
  COMPLETE:    { label: 'Complete',bg: '#d1fae5', color: '#065f46' },
};

const FILTERS = ['ALL', 'TRADING', 'MANUFACTURING', 'SERVICE'];

export default function ItemList() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('ALL');
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
    if (filter !== 'ALL' && (item.mainCategoryType || 'TRADING') !== filter) return false;
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

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid',
                background: filter === f ? '#2563eb' : '#fff',
                color:      filter === f ? '#fff'    : '#6b7280',
                borderColor: filter === f ? '#2563eb' : '#d1d5db',
              }}
            >
              {f === 'ALL' ? 'All' : CATEGORY_META[f]?.label ?? f}
            </button>
          ))}
        </div>

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

        {!loading && filtered.map(item => {
          const catMeta = CATEGORY_META[item.mainCategoryType || 'TRADING'] ?? CATEGORY_META['TRADING'];
          const boqMeta = BOQ_META[item.boqStatus || 'NOT_CREATED'] ?? BOQ_META['NOT_CREATED'];
          return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.itemName}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: catMeta.bg, color: catMeta.color }}>
                    {catMeta.label}
                  </span>
                  {item.boqStatus && item.boqStatus !== 'NOT_CREATED' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: boqMeta.bg, color: boqMeta.color }}>
                      BOQ: {boqMeta.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                  <span>GST: {item.gst ?? 0}%</span>
                  {item.unit && <span>Unit: {item.unit}</span>}
                  {item.stockTrackingType && item.stockTrackingType !== 'PCS' && (
                    <span>Track: {item.stockTrackingType}</span>
                  )}
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
          );
        })}
      </div>
    </PageLayout>
    </>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import { PricingBadge } from "./components/ui/StatusBadge";
import EmptyState from "./components/ui/EmptyState";
import { SkeletonList } from "./components/ui/SkeletonCard";
import { formatCustomer } from "./utils/formatCustomer";
import { apiFetch } from "./utils/api";
import { toast } from "./utils/toast";
import { useConfirm } from "./components/ui/ConfirmModal";

const btn = (extra = {}) => ({
  padding: '6px 13px', fontSize: 12, fontWeight: 600, borderRadius: 5,
  height: 30, display: 'inline-flex', alignItems: 'center', gap: 4,
  cursor: 'pointer', border: 'none', ...extra,
});

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState(null);
  const [page,      setPage]      = useState(1);
  const navigate = useNavigate();
  const perPage  = 50;
  const [confirm, confirmModal] = useConfirm();

  const loadCustomers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const path = q
        ? `/customers/search?q=${encodeURIComponent(q.toLowerCase())}`
        : '/customers';
      const res  = await apiFetch(path);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    loadCustomers(search);
    setPage(1);
  }, [search, loadCustomers]);

  const handleDelete = async (id) => {
    if (!await confirm('Delete this customer?', 'This cannot be undone.', { danger: true, confirmLabel: 'Delete' })) return;
    try {
      await apiFetch(`/customers/${id}`, { method: 'DELETE' });
      toast.success('Customer deleted');
      loadCustomers(search);
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalPages = Math.ceil(customers.length / perPage);
  const paginated  = customers.slice((page - 1) * perPage, page * perPage);

  return (
    <>
    {confirmModal}
    <PageLayout
      title="Customers"
      subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
      onSearch={setSearch}
      actions={
        <button
          onClick={() => navigate('/add-customer')}
          style={btn({ background: '#2563eb', color: '#fff', padding: '8px 16px', height: 36, fontSize: 13 })}
        >
          + Add customer
        </button>
      }
    >
      <div style={{ maxWidth: 700 }}>

        {loading && <SkeletonList count={6} />}

        {!loading && paginated.length === 0 && (
          <EmptyState
            icon="👤"
            title="No customers found"
            subtitle={search ? `No customers match "${search}".` : 'Add your first customer to get started.'}
            actionLabel="+ Add customer"
            onAction={() => navigate('/add-customer')}
          />
        )}

        {!loading && paginated.map((c) => (
          <div
            key={c.id}
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              marginBottom: 10,
              overflow: 'hidden',
            }}
          >
            {/* Collapsed header */}
            <div
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: '#dbeafe', color: '#1d4ed8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700,
              }}>
                {(c.companyName || c.name || 'C').charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {formatCustomer({ companyName: c.companyName || c.company_name || c.name, tag: c.tag, city: c.city })}
                  <PricingBadge isWholesaler={c.isWholesaler} size="xs" />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {[c.tag, c.customerType, c.city].filter(Boolean).join(' · ')}
                </div>
              </div>

              <span style={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }}>
                {expanded === c.id ? '▲' : '▼'}
              </span>
            </div>

            {/* Expanded detail */}
            {expanded === c.id && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>

                {/* Info grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '6px 16px',
                  marginBottom: 14,
                  fontSize: 13,
                }}>
                  <InfoRow icon="📞" value={
                    [c.mobile1?.replace('+91', ''), c.mobile2?.replace('+91', '')].filter(Boolean).join(' / ') || '—'
                  } />
                  <InfoRow icon="✉" value={c.email || '—'} />
                  <InfoRow icon="📍" value={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || '—'} />
                  <InfoRow icon="🧾" value={c.gstNumber || 'Not registered'} label="GST" />
                  <InfoRow icon="💰" value={`₹${(c.creditLimit ?? 0).toLocaleString('en-IN')}${c.credit_days > 0 ? ` · ${c.credit_days}d` : ''}`} label="Credit" />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(`/edit-customer/${c.id}`)}
                    style={btn({ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' })}
                  >
                    ✏ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={btn({ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' })}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              style={btn({ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', opacity: page === 1 ? 0.4 : 1 })}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
              style={btn({ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', opacity: page === totalPages ? 0.4 : 1 })}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </PageLayout>
    </>
  );
}

function InfoRow({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: '#374151' }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
        {label && <strong style={{ color: '#374151' }}>{label}: </strong>}
        {value}
      </span>
    </div>
  );
}

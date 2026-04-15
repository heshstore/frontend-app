import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { theme } from '../theme';

const SECTION_ICONS = {
  customers: '👤',
  items: '📦',
  orders: '📋',
};

const SECTION_LABELS = {
  customers: 'Customers',
  items: 'Items',
  orders: 'Orders',
};

export default function UniversalSearch({ placeholder = 'Search customers, items, orders…' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ customers: [], items: [], orders: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const timerRef = useRef(null);

  const totalResults =
    results.customers.length + results.items.length + results.orders.length;

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults({ customers: [], items: [], orders: [] });
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const enc = encodeURIComponent(q.trim());
      const [custRes, itemRes, ordRes] = await Promise.allSettled([
        fetch(`${API_URL}/customers/search?q=${enc}`),
        fetch(`${API_URL}/items/search?q=${enc}`),
        fetch(`${API_URL}/orders`),
      ]);

      const customers =
        custRes.status === 'fulfilled' && custRes.value.ok
          ? await custRes.value.json()
          : [];

      const items =
        itemRes.status === 'fulfilled' && itemRes.value.ok
          ? await itemRes.value.json()
          : [];

      let orders = [];
      if (ordRes.status === 'fulfilled' && ordRes.value.ok) {
        const all = await ordRes.value.json();
        const lower = q.toLowerCase();
        orders = (Array.isArray(all) ? all : []).filter(
          (o) =>
            String(o.id).includes(lower) ||
            (o.customer_name || '').toLowerCase().includes(lower) ||
            (o.order_number || '').toLowerCase().includes(lower),
        ).slice(0, 5);
      }

      setResults({
        customers: Array.isArray(customers) ? customers.slice(0, 5) : [],
        items: Array.isArray(items) ? items.slice(0, 5) : [],
        orders,
      });
      setOpen(true);
    } catch {
      // silently fail — search is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val || val.trim().length < 2) {
      setResults({ customers: [], items: [], orders: [] });
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery('');
    if (type === 'customers') navigate(`/edit-customer/${item.id}`);
    else if (type === 'items') navigate(`/items`);
    else if (type === 'orders') navigate(`/invoice/${item.id}`);
  };

  const getLabel = (type, item) => {
    if (type === 'customers') {
      const parts = [item.companyName];
      if (item.tag) parts.push(`[${item.tag}]`);
      if (item.city) parts.push(item.city);
      return parts.join(' — ');
    }
    if (type === 'items') {
      return `${item.itemName || ''} · ${item.sku || ''}`;
    }
    if (type === 'orders') {
      return `${item.order_number || '#' + item.id} · ${item.customer_name || ''} · ₹${Number(item.total_amount || 0).toLocaleString('en-IN')}`;
    }
    return '';
  };

  const getSub = (type, item) => {
    if (type === 'customers') return item.mobile1 || item.customerType || '';
    if (type === 'items') return `₹${Number(item.sellingPrice || item.retail_price || 0).toLocaleString('en-IN')} · GST ${item.gst || 0}%`;
    if (type === 'orders') return item.status || '';
    return '';
  };

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && totalResults > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '7px 10px 7px 32px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            …
          </span>
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            overflow: 'hidden',
            maxHeight: 420,
            overflowY: 'auto',
          }}
        >
          {totalResults === 0 && !loading ? (
            <div style={{ padding: '14px 16px', color: theme.textMuted, fontSize: 13 }}>
              No results for "{query}"
            </div>
          ) : (
            ['customers', 'items', 'orders'].map((section) => {
              const list = results[section];
              if (!list || list.length === 0) return null;
              return (
                <div key={section}>
                  {/* Section header */}
                  <div
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: theme.primary,
                      background: theme.surface,
                      textTransform: 'uppercase',
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {SECTION_ICONS[section]} {SECTION_LABELS[section]}
                  </div>
                  {list.map((item, i) => (
                    <div
                      key={item.id || i}
                      onMouseDown={() => handleSelect(section, item)}
                      style={{
                        padding: '9px 16px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${theme.border}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme.primaryLight)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>
                        {getLabel(section, item)}
                      </div>
                      {getSub(section, item) && (
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                          {getSub(section, item)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

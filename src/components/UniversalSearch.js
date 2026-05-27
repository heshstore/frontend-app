import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const RECENT_KEY = 'saachu_search_recent';
const MAX_RECENT = 6;

const SECTIONS = [
  { key: 'customers',  icon: '👤', label: 'Customers' },
  { key: 'orders',     icon: '📋', label: 'Orders' },
  { key: 'quotations', icon: '📄', label: 'Quotations' },
  { key: 'leads',      icon: '🎯', label: 'Leads' },
  { key: 'items',      icon: '📦', label: 'Items' },
];

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(query) {
  const prev = getRecent().filter(q => q !== query);
  const next  = [query, ...prev].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
}

function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

// Flatten results into a navigable list: [{section, item, label, sub, path}]
function flattenResults(results, getLabel, getSub, getPath) {
  const flat = [];
  for (const s of SECTIONS) {
    const list = results[s.key] || [];
    for (const item of list) {
      flat.push({
        section: s.key,
        sectionLabel: s.label,
        icon: s.icon,
        item,
        label: getLabel(s.key, item),
        sub: getSub(s.key, item),
        path: getPath(s.key, item),
      });
    }
  }
  return flat;
}

export default function UniversalSearch({ placeholder = 'Search… ⌘K for actions' }) {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState({ customers: [], orders: [], quotations: [], leads: [], items: [] });
  const [recent,  setRecent]  = useState(getRecent);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef   = useRef(null);
  const dropRef    = useRef(null);
  const timerRef   = useRef(null);

  const getLabel = useCallback((type, item) => {
    if (type === 'customers')  return [item.companyName, item.tag && `[${item.tag}]`, item.city].filter(Boolean).join(' — ');
    if (type === 'orders')     return `${item.order_number || '#' + item.id} · ${item.customer_name || ''}`;
    if (type === 'quotations') return `${item.quotation_no || '#' + item.id} · ${item.customer_name || ''}`;
    if (type === 'leads')      return item.name || item.company_name || `Lead #${item.id}`;
    if (type === 'items')      return `${item.itemName || ''} · ${item.sku || ''}`;
    return '';
  }, []);

  const getSub = useCallback((type, item) => {
    if (type === 'customers')  return item.mobile1 || item.customerType || '';
    if (type === 'orders')     return `₹${Number(item.total_amount || 0).toLocaleString('en-IN')} · ${item.status || ''}`;
    if (type === 'quotations') return `₹${Number(item.total_amount || 0).toLocaleString('en-IN')} · ${item.status || ''}`;
    if (type === 'leads')      return item.mobile || item.status || '';
    if (type === 'items')      return `₹${Number(item.sellingPrice || 0).toLocaleString('en-IN')} · GST ${item.gst || 0}%`;
    return '';
  }, []);

  const getPath = useCallback((type, item) => {
    if (type === 'customers')  return `/edit-customer/${item.id}`;
    if (type === 'orders')     return `/invoice/${item.id}`;
    if (type === 'quotations') return `/quotations/${item.id}/view`;
    if (type === 'leads')      return `/crm/leads/${item.id}`;
    if (type === 'items')      return `/items`;
    return '/dashboard';
  }, []);

  const search = useCallback(async (q) => {
    const enc = encodeURIComponent(q.trim());
    const lower = q.toLowerCase();
    setLoading(true);
    try {
      const [custRes, itemRes, ordRes, quotRes, leadRes] = await Promise.allSettled([
        apiFetch(`/customers/search?q=${enc}`),
        apiFetch(`/items/search?q=${enc}`),
        apiFetch(`/orders`),
        apiFetch(`/quotations`),
        apiFetch(`/crm/leads`),
      ]);

      const customers = custRes.status === 'fulfilled' && custRes.value.ok
        ? (await custRes.value.json()).slice(0, 5) : [];

      const items = itemRes.status === 'fulfilled' && itemRes.value.ok
        ? (await itemRes.value.json()).slice(0, 6) : [];

      let orders = [];
      if (ordRes.status === 'fulfilled' && ordRes.value.ok) {
        const all = await ordRes.value.json();
        orders = (Array.isArray(all) ? all : [])
          .filter(o =>
            String(o.id).includes(lower) ||
            (o.customer_name || '').toLowerCase().includes(lower) ||
            (o.order_number || '').toLowerCase().includes(lower)
          ).slice(0, 4);
      }

      let quotations = [];
      if (quotRes.status === 'fulfilled' && quotRes.value.ok) {
        const all = await quotRes.value.json();
        quotations = (Array.isArray(all) ? all : [])
          .filter(q =>
            String(q.id).includes(lower) ||
            (q.customer_name || '').toLowerCase().includes(lower) ||
            (q.quotation_no || '').toLowerCase().includes(lower)
          ).slice(0, 4);
      }

      let leads = [];
      if (leadRes.status === 'fulfilled' && leadRes.value.ok) {
        const all = await leadRes.value.json();
        const arr = Array.isArray(all) ? all : (all.leads || []);
        leads = arr
          .filter(l =>
            (l.name || '').toLowerCase().includes(lower) ||
            (l.company_name || '').toLowerCase().includes(lower) ||
            (l.mobile || '').includes(lower)
          ).slice(0, 4);
      }

      setResults({ customers, orders, quotations, leads, items });
      setOpen(true);
      setActiveIdx(-1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val || val.trim().length < 2) {
      setResults({ customers: [], orders: [], quotations: [], leads: [], items: [] });
      setOpen(val.length === 0 ? false : true);
      setActiveIdx(-1);
      return;
    }
    timerRef.current = setTimeout(() => search(val), 280);
  };

  const flat = flattenResults(results, getLabel, getSub, getPath);
  const hasResults = flat.length > 0;
  const showRecent = open && !query && recent.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false); setQuery(''); setActiveIdx(-1);
      inputRef.current?.blur();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, hasResults ? flat.length - 1 : recent.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      if (hasResults && flat[activeIdx]) {
        saveRecent(query.trim());
        setRecent(getRecent());
        navigate(flat[activeIdx].path);
        setOpen(false); setQuery(''); setActiveIdx(-1);
      } else if (showRecent && recent[activeIdx]) {
        const q = recent[activeIdx];
        setQuery(q);
        search(q);
      }
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item) => {
    if (query.trim().length >= 2) {
      saveRecent(query.trim());
      setRecent(getRecent());
    }
    navigate(item.path);
    setOpen(false); setQuery(''); setActiveIdx(-1);
  };

  const handleRecentClick = (q) => {
    setQuery(q);
    search(q);
  };

  let flatIdx = -1; // tracker for rendering to find active index per item

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af', pointerEvents: 'none' }}>
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2 && hasResults) setOpen(true);
            else if (!query) setOpen(recent.length > 0);
          }}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '7px 32px 7px 32px',
            borderRadius: 6, border: '1px solid #e5e7eb',
            background: '#f9fafb', color: '#111827',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9ca3af' }}>…</span>
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setOpen(false); setActiveIdx(-1); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (showRecent || hasResults || (query.length >= 2 && !loading)) && (
        <div
          ref={dropRef}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            zIndex: 9999, overflow: 'hidden', maxHeight: 460, overflowY: 'auto',
          }}
        >
          {/* Recent searches */}
          {showRecent && (
            <div>
              <div style={{ padding: '8px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent</span>
                <button onClick={() => { clearRecent(); setRecent([]); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#9ca3af', cursor: 'pointer', padding: 0 }}>Clear</button>
              </div>
              {recent.map((q, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleRecentClick(q)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: activeIdx === i ? '#f5f5f5' : '#fff',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#6b7280' }}>🕐</span>
                  <span style={{ fontSize: 13, color: '#374151' }}>{q}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          {!showRecent && query.length >= 2 && !hasResults && !loading && (
            <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}

          {!showRecent && SECTIONS.map((section) => {
            const list = results[section.key] || [];
            if (!list.length) return null;
            return (
              <div key={section.key}>
                <div style={{
                  padding: '6px 14px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', color: '#6366f1',
                  background: '#f8f7ff', borderBottom: '1px solid #f3f4f6',
                  textTransform: 'uppercase',
                }}>
                  {section.icon} {section.label}
                </div>
                {list.map((item, i) => {
                  flatIdx++;
                  const myFlatIdx = flatIdx;
                  const path  = getPath(section.key, item);
                  const label = getLabel(section.key, item);
                  const sub   = getSub(section.key, item);

                  // ── Rich item row: photo + full pricing data ──────────────────
                  if (section.key === 'items') {
                    const retail    = item.retail_price > 0 ? item.retail_price : (item.sellingPrice || 0);
                    const wholesale = item.wholesale_price || 0;
                    return (
                      <div
                        key={item.id || item.sku || i}
                        onMouseDown={() => handleSelect({ path })}
                        onMouseEnter={() => setActiveIdx(myFlatIdx)}
                        style={{
                          padding: '7px 12px', cursor: 'pointer',
                          borderBottom: '1px solid #f9fafb',
                          background: activeIdx === myFlatIdx ? '#f0f4ff' : '#fff',
                          transition: 'background 0.08s',
                          display: 'flex', alignItems: 'center', gap: 9,
                        }}
                      >
                        {item.image
                          ? <img src={item.image} alt="" loading="lazy" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 5, background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.itemName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
                            <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af', flexShrink: 0 }}>{item.sku}</span>
                            {item.unit && <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>· {item.unit}</span>}
                            {item.gst > 0 && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: 3, padding: '1px 3px', flexShrink: 0 }}>
                                GST {item.gst}%
                              </span>
                            )}
                            {item.hsnCode && (
                              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#9ca3af', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.hsnCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>
                            ₹{Number(retail).toLocaleString('en-IN')}
                          </div>
                          {wholesale > 0 && (
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                              WS ₹{Number(wholesale).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // ── Generic row (customers, orders, quotations, leads) ─────────
                  return (
                    <div
                      key={item.id || i}
                      onMouseDown={() => handleSelect({ path })}
                      onMouseEnter={() => setActiveIdx(myFlatIdx)}
                      style={{
                        padding: '9px 16px', cursor: 'pointer',
                        borderBottom: '1px solid #f9fafb',
                        background: activeIdx === myFlatIdx ? '#f0f4ff' : '#fff',
                        transition: 'background 0.08s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{label}</div>
                      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

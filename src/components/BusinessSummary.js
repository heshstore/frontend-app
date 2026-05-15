import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR',
    maximumFractionDigits: 0,
  });

// ── Skeleton card shown while loading ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: '#f1f5f9', borderRadius: 12, padding: '16px 14px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 6, width: '60%', marginBottom: 10 }} />
      <div style={{ height: 22, background: '#e2e8f0', borderRadius: 6, width: '40%' }} />
    </div>
  );
}

// ── Single metric card ─────────────────────────────────────────────────────────
function MetricCard({ label, value, accent, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: `1px solid ${accent}33`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        padding: '14px 14px 12px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#6b7280',
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BusinessSummary() {
  const navigate = useNavigate();
  const [data, setData]             = useState(null);
  const [staleOrders, setStaleOrders] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadInFlight                = useRef(false);

  const load = useCallback(async () => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    try {
      const [summaryRes, staleRes] = await Promise.all([
        apiFetch('/dashboard/summary'),
        apiFetch('/production/stale-orders'),
      ]);
      if (!summaryRes.ok) throw new Error();
      setData(await summaryRes.json());
      if (staleRes.ok) setStaleOrders(await staleRes.json());
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      loadInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const fmtTime = (d) =>
    d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ marginBottom: 24 }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[0,1].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        background: '#fff1f0', border: '1px solid #fca5a5',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, color: '#dc2626' }}>Could not load summary.</span>
        <button
          onClick={load}
          style={{
            background: 'none', border: 'none', color: '#dc2626',
            fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}
        >Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { orders, payments, production } = data;

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* ── Stale orders alert ── */}
      {staleOrders.length > 0 && (
        <div
          onClick={() => navigate('/production/execution')}
          style={{
            background: '#fff7ed', border: '1px solid #fb923c',
            borderLeft: '4px solid #ea580c', borderRadius: 10,
            padding: '12px 14px', marginBottom: 14, cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: '#9a3412', marginBottom: 2 }}>
            {staleOrders.length} order{staleOrders.length > 1 ? 's' : ''} stuck — no production activity for 4+ hours
          </div>
          <div style={{ fontSize: 12, color: '#c2410c' }}>
            {staleOrders.map(o => o.order_no || `ORD-${o.id}`).join(', ')}
            {staleOrders.some(o => o.unassigned_jobs > 0) && ' — check staff assignments'}
          </div>
        </div>
      )}

      {/* ── Orders ── */}
      <Section title="Orders" icon="📦">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard
            label="In Production"
            value={orders.in_production}
            accent="#3b82f6"
            onClick={() => navigate('/production/execution')}
          />
          <MetricCard
            label="Ready to Dispatch"
            value={orders.ready_for_dispatch}
            accent="#f59e0b"
            onClick={() => navigate('/dispatch')}
          />
          <MetricCard
            label="Dispatched"
            value={orders.dispatched}
            accent="#8b5cf6"
            onClick={() => navigate('/dispatch/list')}
          />
          <MetricCard
            label="Completed"
            value={orders.completed}
            accent="#16a34a"
            sub={`of ${orders.total_orders} total`}
            onClick={() => navigate('/orders')}
          />
        </div>
      </Section>

      {/* ── Payments ── */}
      <Section title="Payments" icon="💰">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <MetricCard
            label="Revenue"
            value={inr(payments.total_revenue)}
            accent="#2563eb"
          />
          <MetricCard
            label="Outstanding"
            value={inr(payments.total_outstanding)}
            accent="#dc2626"
            onClick={() => navigate('/accounts/outstanding')}
          />
          <MetricCard
            label="Today"
            value={inr(payments.today_collection)}
            accent="#16a34a"
          />
        </div>
      </Section>

      {/* ── Production ── */}
      <Section title="Production" icon="⚙️">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard
            label="Active Jobs"
            value={production.active_jobs}
            accent="#f59e0b"
            onClick={() => navigate('/production/execution')}
          />
          <MetricCard
            label="Done Today"
            value={production.jobs_completed_today}
            accent="#16a34a"
          />
        </div>
      </Section>

      {/* Last updated */}
      {lastUpdated && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: '#d1d5db', marginTop: -8, marginBottom: 4,
        }}>
          <span>Updated {fmtTime(lastUpdated)}</span>
          <button
            onClick={load}
            style={{
              background: 'none', border: 'none', color: '#d1d5db',
              cursor: 'pointer', fontSize: 11, padding: 0,
            }}
          >
            ↻ Refresh
          </button>
        </div>
      )}
    </div>
  );
}

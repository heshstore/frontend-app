import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { apiFetch } from '../../utils/api';

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none', borderRadius: 6,
  padding: '6px 13px', fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

const th = {
  padding: '10px 14px', background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left', fontWeight: 600,
  color: '#475569', fontSize: 12, whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
  fontSize: 13, verticalAlign: 'middle',
};

function fmt(n) {
  if (n == null) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(2)}L`;
  if (num >= 1_000)   return `₹${(num / 1_000).toFixed(1)}k`;
  return `₹${num.toFixed(0)}`;
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '18px 22px', minWidth: 160, flex: 1,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? '#111827' }}>{value}</div>
    </div>
  );
}

function toMonthParam(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(param) {
  const [y, m] = param.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function CommissionPage() {
  const now = new Date();
  const [month, setMonth] = useState(toMonthParam(now));
  const [summary, setSummary] = useState(null);
  const [salesman, setSalesman] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (m = month) => {
    setLoading(true); setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        apiFetch(`/commission/summary?month=${m}`),
        apiFetch(`/commission/salesman?month=${m}`),
      ]);
      if (!sRes.ok) throw new Error(`Summary error ${sRes.status}`);
      if (!rRes.ok) throw new Error(`Salesman error ${rRes.status}`);
      setSummary(await sRes.json());
      setSalesman(await rRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const changeMonth = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = toMonthParam(d);
    setMonth(next);
    load(next);
  };

  const salesmanRows = salesman
    ? Object.entries(salesman).map(([name, data]) => ({ name, ...data }))
    : [];

  return (
    <PageLayout
      title="Commission"
      subtitle={`Sales commission summary for ${monthLabel(month)}`}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btn('#f3f4f6', '#374151')} onClick={() => changeMonth(-1)}>← Prev</button>
          <input
            type="month"
            value={month}
            onChange={e => { setMonth(e.target.value); load(e.target.value); }}
            style={{
              padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: 13, color: '#374151', background: '#fff',
            }}
          />
          <button style={btn('#f3f4f6', '#374151', month >= toMonthParam(now))} disabled={month >= toMonthParam(now)} onClick={() => changeMonth(1)}>Next →</button>
          <button style={btn('#0d6efd', '#fff', loading)} onClick={() => load()} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        </div>
      }
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={() => load()}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading commission data…</div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
                <SummaryCard label="Total Commission" value={fmt(summary.total_commission)} color="#111827" />
                <SummaryCard label="Paid" value={fmt(summary.paid_commission)} color="#166534" />
                <SummaryCard label="Unpaid" value={fmt(summary.unpaid_commission)} color="#dc3545" />
                <SummaryCard label="Entries" value={summary.total_entries ?? '—'} color="#0d6efd" />
              </div>
            )}

            {/* Salesman breakdown */}
            {salesmanRows.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No commission data for {monthLabel(month)}</div>
                <div style={{ fontSize: 13 }}>Commission entries will appear here once recorded.</div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#374151', fontSize: 14 }}>
                  Salesman Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={th}>Salesman</th>
                      <th style={th}>Total Commission</th>
                      <th style={th}>Paid</th>
                      <th style={th}>Unpaid</th>
                      <th style={th}>Entries</th>
                      <th style={th}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesmanRows
                      .sort((a, b) => (Number(b.total_commission ?? 0) - Number(a.total_commission ?? 0)))
                      .map((row, i) => {
                        const totalComm = Number(summary?.total_commission ?? 0);
                        const rowComm = Number(row.total_commission ?? 0);
                        const pct = totalComm > 0 ? ((rowComm / totalComm) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={row.name} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={td}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{row.name}</div>
                            </td>
                            <td style={td}>
                              <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(row.total_commission)}</span>
                            </td>
                            <td style={td}>
                              <span style={{ fontWeight: 600, color: '#166534' }}>{fmt(row.paid_commission)}</span>
                            </td>
                            <td style={td}>
                              <span style={{ fontWeight: 600, color: Number(row.unpaid_commission ?? 0) > 0 ? '#dc3545' : '#9ca3af' }}>
                                {fmt(row.unpaid_commission)}
                              </span>
                            </td>
                            <td style={td}>{row.total_entries ?? row.entries ?? '—'}</td>
                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: '#0d6efd', borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 12, color: '#475569', flexShrink: 0 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

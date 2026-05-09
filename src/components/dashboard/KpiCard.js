import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrendBadge from './TrendBadge';

function KpiSkeleton() {
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '16px', background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6' }} />
        <div style={{ width: 80, height: 11, borderRadius: 4, background: '#f3f4f6' }} />
      </div>
      <div style={{ width: '55%', height: 28, borderRadius: 6, background: '#f3f4f6', marginBottom: 6 }} />
      <div style={{ width: '70%', height: 10, borderRadius: 4, background: '#f3f4f6' }} />
    </div>
  );
}

export default function KpiCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  trendInverse = false,
  color = '#2563eb',
  path,
  onClick,
  loading = false,
  alert = false,
}) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();

  if (loading) return <KpiSkeleton />;

  const handleClick = onClick || (path ? () => navigate(path) : undefined);
  const clickable = !!handleClick;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid ${hov && clickable ? color + '66' : '#e5e7eb'}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: '14px 16px',
        background: hov && clickable ? color + '06' : '#fff',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        transform: hov && clickable ? 'translateY(-2px)' : 'none',
        boxShadow: hov && clickable ? `0 4px 12px ${color}20` : '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
    >
      {alert && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 8, height: 8, borderRadius: '50%',
          background: '#dc2626', boxShadow: '0 0 0 2px #fff',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
        </div>
        {trend !== undefined && (
          <TrendBadge value={trend} label={trendLabel} inverse={trendInverse} size="xs" />
        )}
      </div>

      <div style={{ fontSize: 26, fontWeight: 900, color: '#111827', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>

      {subtitle && (
        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

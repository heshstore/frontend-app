/**
 * OrderPrint — standalone A4 print page.
 * Must be rendered OUTSIDE the Layout (no sidebar / navbar).
 * Triggers window.print() automatically after data loads.
 * Route: /orders/:id/print
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from './utils/api';
import OrderTemplate from './OrderTemplate';

export default function OrderPrint() {
  const { id }  = useParams();
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((d) => {
        setData(d);
        requestAnimationFrame(() => setTimeout(() => window.print(), 150));
      })
      .catch(() => setError('Could not load order.'));
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 40, color: '#dc2626', fontFamily: 'sans-serif' }}>{error}</div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, color: '#888', fontFamily: 'sans-serif' }}>Loading…</div>
    );
  }

  const orderNo = data.order_no || data.order_number || `Order #${id}`;

  return (
    <>
      <div className="no-print" style={{
        background: '#005fb8', color: '#fff',
        padding: '8px 20px', display: 'flex',
        alignItems: 'center', gap: 12,
        fontSize: 13, fontFamily: 'sans-serif',
      }}>
        <button
          onClick={() => window.print()}
          style={{
            background: '#fff', color: '#005fb8', border: 'none',
            borderRadius: 4, padding: '5px 14px', fontWeight: 700,
            cursor: 'pointer', fontSize: 13,
          }}
        >
          🖨 Print
        </button>
        <span style={{ opacity: 0.85 }}>
          {orderNo} — Print Preview
        </span>
        <button
          onClick={() => window.close()}
          style={{
            marginLeft: 'auto', background: 'transparent', color: '#fff',
            border: '1px solid rgba(255,255,255,.4)', borderRadius: 4,
            padding: '4px 12px', cursor: 'pointer', fontSize: 12,
          }}
        >
          ✕ Close
        </button>
      </div>

      <OrderTemplate data={data} wrapClass="" />
    </>
  );
}

/**
 * QuotationPrint — standalone A4 print page.
 * Must be rendered OUTSIDE the Layout (no sidebar / navbar).
 * Triggers window.print() automatically after data loads.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from './utils/api';
import QuotationTemplate from './QuotationTemplate';

export default function QuotationPrint() {
  const { id }  = useParams();
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/quotations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((d) => {
        setData(d);
        // Give React one paint cycle to render then trigger print
        requestAnimationFrame(() => setTimeout(() => window.print(), 150));
      })
      .catch(() => setError('Could not load quotation.'));
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

  return (
    <>
      {/* Manual print button — hidden during actual printing */}
      <div className="no-print" style={{
        background: '#1e3a8a',
        color: '#fff',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        fontFamily: 'sans-serif',
      }}>
        <button
          onClick={() => window.print()}
          style={{
            background: '#fff', color: '#1e3a8a', border: 'none',
            borderRadius: 4, padding: '5px 14px', fontWeight: 700,
            cursor: 'pointer', fontSize: 13,
          }}
        >
          🖨 Print
        </button>
        <span style={{ opacity: 0.85 }}>
          {data.quotation_no || `Quotation #${id}`} — Print Preview
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

      {/* Render with no screen wrapper padding (wrapClass="") so the page is flush */}
      <QuotationTemplate data={data} wrapClass="" />
    </>
  );
}

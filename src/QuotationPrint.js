import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from './utils/api';
import QuotationTemplate from './QuotationTemplate';

export default function QuotationPrint() {
  const { id } = useParams();
  const [data, setData]     = useState(null);
  const [error, setError]   = useState('');

  useEffect(() => {
    apiFetch(`/quotations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((d) => {
        setData(d);
        // Print once the page has rendered
        setTimeout(() => window.print(), 300);
      })
      .catch(() => setError('Could not load quotation.'));
  }, [id]);

  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>;
  if (!data)  return <div style={{ padding: 40, color: '#888' }}>Loading...</div>;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .quotation-print-page { box-shadow: none !important; padding: 16px !important; }
        }
        body { margin: 0; background: #f8fafc; }
      `}</style>

      <div className="no-print" style={{
        background: '#1e3a8a',
        color: '#fff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
      }}>
        <button onClick={() => window.print()} style={{
          background: '#fff',
          color: '#1e3a8a',
          border: 'none',
          borderRadius: 4,
          padding: '4px 12px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 13,
        }}>
          🖨 Print
        </button>
        <span>Print Preview — {data.quotation_no || `#${id}`}</span>
      </div>

      <QuotationTemplate data={data} />
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { API_URL } from './config';
import QuotationTemplate from './QuotationTemplate';
import DocActions from './components/DocActions';
import { theme } from './theme';

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    apiFetch(`/quotations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('Could not load quotation.'))
      .finally(() => setLoading(false));
  }, [id]);

  const publicPdfUrl = data?.quotation_no
    ? `${API_URL}/quotations/public/${encodeURIComponent(data.quotation_no)}/pdf`
    : '';

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: theme.textMuted }}>Loading...</div>
  );
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Sticky action bar */}
      <div style={{
        background: theme.primary,
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>
          {data.quotation_no || `Quotation #${id}`}
        </span>
        <DocActions
          type="quotation"
          id={Number(id)}
          docNo={data.quotation_no}
          amount={data.total_amount}
          customerMobile={data.customer_phone}
          customerName={data.customer_name}
          customerEmail={data.customer_email}
          publicPdfUrl={publicPdfUrl}
        />
      </div>

      {/* Template */}
      <div style={{ padding: '24px 16px' }}>
        <QuotationTemplate data={data} />
      </div>
    </div>
  );
}

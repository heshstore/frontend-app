import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import { API_URL } from './config';
import QuotationTemplate from './QuotationTemplate';
import DocumentActionBar from './components/DocumentActionBar';

const EDITABLE_STATUSES   = ['DRAFT', 'SENT', 'APPROVED'];
const CONVERTIBLE_STATUSES = ['DRAFT', 'SENT', 'APPROVED'];

export default function QuotationView() {
  const { id }  = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    apiFetch(`/quotations/${id}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setData)
      .catch(() => setError('Could not load quotation.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>
      Loading…
    </div>
  );
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontFamily: 'sans-serif' }}>
      {error}
    </div>
  );

  const publicPdfUrl = data?.quotation_no
    ? `${API_URL}/quotations/public/${encodeURIComponent(data.quotation_no)}/pdf`
    : '';

  return (
    <div style={{ background: '#e2e5ea', minHeight: '100vh' }}>
      <DocumentActionBar
        type="quotation"
        id={Number(id)}
        docNo={data.quotation_no}
        docDate={data.created_at}
        amount={data.total_amount}
        status={data.status}
        customerMobile={data.customer_phone}
        customerName={data.customer_name}
        customerEmail={data.customer_email}
        publicPdfUrl={publicPdfUrl}
        onBack={() => navigate(-1)}
        onEdit={EDITABLE_STATUSES.includes(data.status) ? () => navigate(`/quotation?id=${id}`) : null}
        isEditable={EDITABLE_STATUSES.includes(data.status)}
        isConvertible={CONVERTIBLE_STATUSES.includes(data.status)}
        onConvert={CONVERTIBLE_STATUSES.includes(data.status)
          ? () => navigate(`/quotations?convert=${id}`)
          : null}
        convertLabel="Convert to order"
      />

      <QuotationTemplate data={data} wrapClass="qp-screen" />
    </div>
  );
}

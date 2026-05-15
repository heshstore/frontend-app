/**
 * OrderView — sticky-bar order document view.
 * Route: /orders/:id/view
 * Uses same DocumentActionBar as QuotationView.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from './utils/api';
import OrderTemplate from './OrderTemplate';
import DocumentActionBar from './components/DocumentActionBar';

const EDITABLE_STATUSES = ['PENDING_APPROVAL', 'APPROVED'];

export default function OrderView() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    apiFetch(`/orders/${id}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setData)
      .catch(() => setError('Could not load order.'))
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

  const orderNo  = data.order_no || data.order_number || `#${data.id}`;
  const isEdit   = EDITABLE_STATUSES.includes(data.status);

  return (
    <div style={{ background: '#e2e5ea', minHeight: '100vh' }}>
      <DocumentActionBar
        type="order"
        id={Number(id)}
        docNo={orderNo}
        docDate={data.created_at}
        amount={data.total_amount}
        status={data.status}
        customerMobile={data.customer_phone}
        customerName={data.customer_name}
        customerEmail={data.customer_email}
        publicPdfUrl=""
        onBack={() => navigate(-1)}
        onEdit={isEdit ? () => navigate(`/edit-order/${id}`) : null}
        isEditable={isEdit}
        isConvertible={false}
      />
      <OrderTemplate data={data} wrapClass="qp-screen" />
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { getToken } from '../utils/api';
import { API_URL } from '../config';
import { theme } from '../theme';

export default function WhatsAppQR() {
  const [status, setStatus] = useState('DISCONNECTED');
  const [phone, setPhone] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [error, setError] = useState('');
  const esRef = useRef(null);

  const loadStatus = async () => {
    try {
      const res = await apiFetch('/whatsapp/status');
      if (res.ok) {
        const d = await res.json();
        setStatus(d.status || 'DISCONNECTED');
        setPhone(d.phone || null);
      }
    } catch {}
  };

  useEffect(() => {
    loadStatus();

    // Connect SSE with auth token
    const token = getToken();
    const url = `${API_URL}/whatsapp/sse`;
    const es = new EventSource(`${url}?token=${token}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'qr' && data.dataUrl) {
          setQrDataUrl(data.dataUrl);
          setStatus('CONNECTING');
          setPhone(null);
        } else if (data.type === 'ready') {
          setStatus('CONNECTED');
          setPhone(data.phone || null);
          setQrDataUrl(null);
        } else if (data.type === 'ping') {
          // keep-alive, ignore
        }
      } catch {}
    };

    es.onerror = () => {
      setError('Connection to server lost. Please refresh the page.');
      es.close();
    };

    return () => { es.close(); };
  }, []);

  const statusColor = { CONNECTED: '#198754', CONNECTING: '#ffc107', DISCONNECTED: '#dc3545' };

  return (
    <PageLayout title="WhatsApp Connection">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Status card */}
        <div style={{
          background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: statusColor[status] || '#dc3545',
          }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {status === 'CONNECTED' ? `Connected${phone ? `: +${phone}` : ''}` :
               status === 'CONNECTING' ? 'Waiting for QR scan...' :
               'Disconnected'}
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>
              {status === 'CONNECTED' && 'WhatsApp is active. Leads will be captured automatically.'}
              {status === 'CONNECTING' && 'Scan the QR code with your WhatsApp to connect.'}
              {status === 'DISCONNECTED' && 'QR code will appear below once server is ready.'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#842029', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* QR Code display */}
        {status !== 'CONNECTED' && (
          <div style={{
            background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8,
            padding: 24, textAlign: 'center', marginBottom: 16,
          }}>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="WhatsApp QR Code" style={{ width: 240, height: 240, imageRendering: 'pixelated' }} />
                <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 12 }}>
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code
                </p>
              </>
            ) : (
              <div style={{ padding: '40px 0', color: theme.textMuted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                <p style={{ fontSize: 14 }}>Waiting for server to generate QR code...</p>
                <p style={{ fontSize: 12 }}>This may take 10–30 seconds on first start.</p>
              </div>
            )}
          </div>
        )}

        {status === 'CONNECTED' && (
          <div style={{
            background: '#d1e7dd', border: '1px solid #a3cfbb', borderRadius: 8,
            padding: 20, textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#0f5132', margin: '0 0 6px' }}>WhatsApp Connected</p>
            {phone && <p style={{ fontSize: 13, color: '#0f5132', margin: 0 }}>Number: +{phone}</p>}
          </div>
        )}

        {/* How it works */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, fontSize: 13 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: theme.textMuted }}>How This Works</h4>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: theme.text }}>
            <li>Scan the QR code with your spare WhatsApp number</li>
            <li>When leads message that number (from your Meta/Google ads), they are automatically captured as new leads</li>
            <li>Telecallers can reply to leads directly from the lead detail page</li>
            <li>Follow-up reminders are sent to telecallers via WhatsApp</li>
            <li>The connection stays active until the app is redeployed or the number is unlinked</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}

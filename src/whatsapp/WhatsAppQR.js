import React, { useEffect, useState, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { getToken } from '../utils/api';
import { API_URL } from '../config';
import { theme } from '../theme';
import { useConfirm } from '../components/ui/ConfirmModal';

// Dot colours for each connection state
const STATUS_COLOR = {
  CONNECTED:      '#198754',
  CONNECTING:     '#ffc107',
  PHONE_APPROVAL: '#0d6efd',
  PAIRING:        '#0d6efd',
  INITIALIZING:   '#0d6efd',
  RETRYING:       '#fd7e14',
  DISCONNECTED:   '#dc3545',
};

// Human-readable headline for each state
const STATUS_LABEL = {
  CONNECTED:      (phone) => phone ? `Connected: +${phone}` : 'Connected',
  CONNECTING:     () => 'Waiting for QR scan...',
  PHONE_APPROVAL: () => 'Phone approval pending...',
  PAIRING:        (_, st) => `Pairing (${st || '...'})`,
  INITIALIZING:   () => 'Starting WhatsApp (launching browser)...',
  RETRYING:       () => 'Connection failed — retrying...',
  DISCONNECTED:   () => 'Disconnected',
};

const STATUS_DESC = {
  CONNECTED:      'WhatsApp is active. Leads will be captured automatically.',
  CONNECTING:     'Scan the QR code with your WhatsApp to connect.',
  PHONE_APPROVAL: 'QR scanned — waiting for the phone to confirm. Do NOT close WhatsApp.',
  PAIRING:        'Establishing session with WhatsApp servers. Please wait.',
  INITIALIZING:   'Chromium is launching on the server. QR will appear in 20–60 seconds.',
  RETRYING:       'Browser failed to start. Retrying automatically...',
  DISCONNECTED:   'WhatsApp is not connected.',
};

export default function WhatsAppQR() {
  const [confirm, confirmModal] = useConfirm();
  const [status,       setStatus]       = useState('DISCONNECTED');
  const [pairingState, setPairingState] = useState('');
  const [phone,        setPhone]        = useState(null);
  const [qrDataUrl,    setQrDataUrl]    = useState(null);
  const [qrIndex,      setQrIndex]      = useState(0);
  const [qrExpired,    setQrExpired]    = useState(false);
  const [warning,      setWarning]      = useState('');
  const [error,        setError]        = useState('');
  const [resetting,    setResetting]    = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
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

    const token  = getToken();
    const url    = `${API_URL}/whatsapp/sse`;
    const es     = new EventSource(`${url}?token=${token}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'qr' && data.dataUrl) {
          // A second+ QR means the previous one expired before the user scanned
          if (data.expired) setQrExpired(true);
          setQrDataUrl(data.dataUrl);
          setQrIndex(data.qrIndex || 1);
          setStatus('CONNECTING');
          setPairingState('');
          setPhone(null);
          setError('');
          setWarning(data.warning || '');

        } else if (data.type === 'authenticated') {
          // QR scan succeeded — session loading in progress
          setStatus('PHONE_APPROVAL');
          setQrDataUrl(null);
          setQrExpired(false);
          setWarning('');

        } else if (data.type === 'change_state') {
          // Internal WA state machine transition (OPENING / PAIRING / PAIRED …)
          setPairingState(data.state || '');
          if (['PAIRING', 'OPENING'].includes(data.state)) {
            setStatus('PAIRING');
          }

        } else if (data.type === 'ready') {
          setStatus('CONNECTED');
          setPhone(data.phone || null);
          setQrDataUrl(null);
          setQrExpired(false);
          setWarning('');
          setError('');
          setPairingState('');

        } else if (data.type === 'initializing') {
          setStatus('INITIALIZING');
          setQrDataUrl(null);
          setQrExpired(false);
          setWarning('');

        } else if (data.type === 'retrying') {
          setStatus('RETRYING');
          setQrDataUrl(null);

        } else if (data.type === 'disconnected') {
          setStatus('DISCONNECTED');
          setQrDataUrl(null);
          setPairingState('');

        } else if (data.type === 'error') {
          setError(data.message || 'WhatsApp error');
          setStatus('DISCONNECTED');
        }
        // ping: ignore
      } catch {}
    };

    es.onerror = () => {
      setError('Connection to server lost. Please refresh the page.');
      es.close();
    };

    return () => { es.close(); };
  }, []);

  const handleDisconnect = async () => {
    if (!await confirm(
      'Disconnect WhatsApp?',
      'A new QR code will appear to link a different number.',
      { danger: true, confirmLabel: 'Disconnect' },
    )) return;
    setDisconnecting(true);
    try {
      await apiFetch('/whatsapp/disconnect', { method: 'POST' });
    } catch { /* SSE will update status */ } finally {
      setDisconnecting(false);
    }
  };

  const handleReset = async () => {
    if (!await confirm(
      'Reset WhatsApp Session?',
      'This clears the current session and generates a fresh QR code. Use this when the pairing handshake is stuck.',
      { danger: true, confirmLabel: 'Reset Session' },
    )) return;
    setResetting(true);
    setError('');
    try {
      await apiFetch('/whatsapp/admin/reset', { method: 'POST' });
    } catch (err) {
      setError('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const dotColor  = STATUS_COLOR[status]  || '#dc3545';
  const labelFn   = STATUS_LABEL[status]  || (() => status);
  const descText  = STATUS_DESC[status]   || '';
  const showQR    = !['CONNECTED', 'PHONE_APPROVAL', 'PAIRING'].includes(status);
  const showReset = ['CONNECTING', 'PHONE_APPROVAL', 'PAIRING', 'DISCONNECTED', 'RETRYING'].includes(status);

  return (
    <>
    {confirmModal}
    <PageLayout title="WhatsApp Connection">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Status card */}
        <div style={{
          background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8,
          padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {labelFn(phone, pairingState)}
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>{descText}</div>
          </div>
          {/* Reset button — visible whenever pairing is stalled */}
          {showReset && (
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{
                padding: '6px 14px', background: '#6c757d', color: '#fff',
                border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12,
                cursor: resetting ? 'not-allowed' : 'pointer',
                opacity: resetting ? 0.7 : 1, flexShrink: 0,
              }}
            >
              {resetting ? 'Resetting...' : '↺ Reset Session'}
            </button>
          )}
        </div>

        {/* QR expiry notice */}
        {qrExpired && (
          <div style={{
            background: '#fff3cd', color: '#664d03', padding: '10px 14px',
            borderRadius: 8, marginBottom: 12, fontSize: 13, border: '1px solid #ffecb5',
          }}>
            ⚠ Previous QR expired — new code generated below (attempt {qrIndex})
          </div>
        )}

        {/* Warning from server (repeated QR failures) */}
        {warning && (
          <div style={{
            background: '#f8d7da', color: '#842029', padding: '10px 14px',
            borderRadius: 8, marginBottom: 12, fontSize: 13,
          }}>
            {warning}
          </div>
        )}

        {/* General error */}
        {error && (
          <div style={{
            background: '#f8d7da', color: '#842029', padding: 12,
            borderRadius: 8, marginBottom: 14, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Phone approval waiting state */}
        {status === 'PHONE_APPROVAL' && (
          <div style={{
            background: '#cfe2ff', border: '1px solid #9ec5fe', borderRadius: 8,
            padding: 24, textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#084298', margin: '0 0 6px' }}>
              QR Scanned — Waiting for Phone Confirmation
            </p>
            <p style={{ fontSize: 13, color: '#084298', margin: 0 }}>
              Accept the "Link a Device" prompt on your phone. Do NOT close WhatsApp.
            </p>
          </div>
        )}

        {/* Pairing state */}
        {status === 'PAIRING' && (
          <div style={{
            background: '#cfe2ff', border: '1px solid #9ec5fe', borderRadius: 8,
            padding: 24, textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#084298', margin: '0 0 6px' }}>
              Establishing Session {pairingState ? `(${pairingState})` : ''}
            </p>
            <p style={{ fontSize: 13, color: '#084298', margin: 0 }}>
              Connecting to WhatsApp servers. Please wait a moment.
            </p>
          </div>
        )}

        {/* QR Code display */}
        {showQR && (
          <div style={{
            background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8,
            padding: 24, textAlign: 'center', marginBottom: 16,
          }}>
            {qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt="WhatsApp QR Code"
                  style={{ width: 240, height: 240, imageRendering: 'pixelated' }}
                />
                <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 12 }}>
                  Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this QR
                </p>
              </>
            ) : (
              <div style={{ padding: '40px 0', color: theme.textMuted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                <p style={{ fontSize: 14 }}>
                  {status === 'INITIALIZING' ? 'Launching browser — QR will appear in 20–60 seconds.' : 'Waiting for QR code...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connected state */}
        {status === 'CONNECTED' && (
          <div style={{
            background: '#d1e7dd', border: '1px solid #a3cfbb', borderRadius: 8,
            padding: 20, textAlign: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#0f5132', margin: '0 0 6px' }}>WhatsApp Connected</p>
            {phone && <p style={{ fontSize: 13, color: '#0f5132', margin: '0 0 14px' }}>Number: +{phone}</p>}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                padding: '8px 20px', background: '#dc3545', color: '#fff',
                border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
                cursor: disconnecting ? 'not-allowed' : 'pointer',
                opacity: disconnecting ? 0.7 : 1,
              }}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect & Change Number'}
            </button>
          </div>
        )}

        {/* How it works */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, fontSize: 13 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, textTransform: 'uppercase', color: theme.textMuted }}>How This Works</h4>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: theme.text }}>
            <li>Scan the QR code with your spare WhatsApp number</li>
            <li>When leads message that number (from Meta/Google ads), they are automatically captured</li>
            <li>Telecallers can reply to leads directly from the lead detail page</li>
            <li>Follow-up reminders are sent to telecallers via WhatsApp</li>
            <li>Use <strong>Reset Session</strong> if the QR keeps expiring without connecting</li>
          </ul>
        </div>
      </div>
    </PageLayout>
    </>
  );
}

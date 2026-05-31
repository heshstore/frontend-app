import React, { useEffect, useState, useCallback, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { useConfirm } from '../components/ui/ConfirmModal';

const STATE_COLOR = {
  CONNECTED:    '#198754',
  QR_READY:     '#dc3545',
  CONNECTING:   '#ffc107',
  FAILED:       '#dc3545',
  DISCONNECTED: '#dc3545',
  IDLE:         '#6c757d',
};

const STATE_LABEL = {
  CONNECTED:    (phone) => phone ? `Connected: +${phone}` : 'WhatsApp Connected',
  QR_READY:     () => 'Waiting for QR Scan',
  CONNECTING:   () => 'Connecting to WhatsApp…',
  FAILED:       () => 'Session Failed',
  DISCONNECTED: () => 'Not Connected',
  IDLE:         () => 'Not Connected',
};

const STATE_DESC = {
  CONNECTED:    'WhatsApp is active. Leads and reminders are working.',
  QR_READY:     'Scan the QR code with your WhatsApp to connect.',
  CONNECTING:   'QR scanned — establishing session. Do NOT close WhatsApp.',
  FAILED:       'Authentication failed. Click Reset to generate a fresh QR.',
  DISCONNECTED: 'WhatsApp is disconnected. Click Connect to start a new session.',
  IDLE:         'Click Connect to start WhatsApp.',
};

const UNHEALTHY_THRESHOLD   = 3;
const DISCONNECTED_HOLD_MS  = 90_000;

function rawToMapped(waState) {
  if (['ready', 'authenticated', 'recovering', 'reconnecting'].includes(waState)) return 'CONNECTED';
  if (['initializing', 'authenticating'].includes(waState)) return 'CONNECTING';
  if (['awaiting_scan', 'qr_ready'].includes(waState)) return 'QR_READY';
  if (['failed', 'auth_failure'].includes(waState)) return 'FAILED';
  if (['disconnected', 'disconnecting'].includes(waState)) return 'DISCONNECTED';
  return 'IDLE';
}

function deriveStableStatus(prevStable, raw, unhealthyCount, disconnectedSince) {
  const rawMapped = rawToMapped(raw?.waState ?? 'idle');
  if (prevStable !== 'CONNECTED') return rawMapped;
  if (rawMapped === 'CONNECTED') return 'CONNECTED';
  if (rawMapped === 'QR_READY' || rawMapped === 'FAILED') return rawMapped;
  if (rawMapped === 'DISCONNECTED') {
    if (disconnectedSince && Date.now() - disconnectedSince >= DISCONNECTED_HOLD_MS) return 'DISCONNECTED';
    return 'CONNECTED';
  }
  if (unhealthyCount >= UNHEALTHY_THRESHOLD) return rawMapped;
  return 'CONNECTED';
}

export default function WhatsAppQR() {
  const [confirm, confirmModal] = useConfirm();
  const [status,         setStatus]         = useState(null);
  const [stableUiStatus, setStableUiStatus] = useState('IDLE');
  const [connecting,     setConnecting]     = useState(false);
  const [disconnecting,  setDisconnecting]  = useState(false);
  const [resetting,      setResetting]      = useState(false);
  const [error,          setError]          = useState('');
  const prevStableRef        = useRef('IDLE');
  const unhealthyCountRef    = useRef(0);
  const disconnectedSinceRef = useRef(null);

  // ── Poll /whatsapp/status every 5 s ──────────────────────────────────────────

  const poll = useCallback(async () => {
    try {
      const res = await apiFetch('/whatsapp/status');
      if (!res.ok) return;
      const data = await res.json();
      const rawMapped = rawToMapped(data?.waState ?? 'idle');

      if (rawMapped === 'CONNECTED') {
        unhealthyCountRef.current = 0;
        disconnectedSinceRef.current = null;
      } else if (prevStableRef.current === 'CONNECTED') {
        unhealthyCountRef.current += 1;
        if (rawMapped === 'DISCONNECTED' && !disconnectedSinceRef.current) {
          disconnectedSinceRef.current = Date.now();
        }
      }

      const newStable = deriveStableStatus(
        prevStableRef.current, data,
        unhealthyCountRef.current, disconnectedSinceRef.current,
      );
      console.log('[WA_STATUS]', { previousStableState: prevStableRef.current, backendState: data?.waState, derivedState: newStable });
      prevStableRef.current = newStable;
      setStatus(data);
      setStableUiStatus(newStable);
    } catch { /* network hiccup — keep showing last status */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, [poll]);

  // ── Action handlers ───────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      await apiFetch('/whatsapp/connect', { method: 'POST' });
      await poll();
    } catch (err) {
      setError('Connect failed: ' + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!await confirm(
      'Disconnect WhatsApp?',
      'The current session will be cleared. You can reconnect with a new QR code.',
      { danger: true, confirmLabel: 'Disconnect' },
    )) return;
    setDisconnecting(true);
    try {
      await apiFetch('/whatsapp/disconnect', { method: 'POST' });
      await poll();
    } catch { /* ignore */ } finally {
      setDisconnecting(false);
    }
  };

  const handleReset = async () => {
    if (!await confirm(
      'Reset WhatsApp Session?',
      'This clears the current session and generates a fresh QR code. Use this when the connection is stuck.',
      { danger: true, confirmLabel: 'Reset Session' },
    )) return;
    setResetting(true);
    setError('');
    try {
      await apiFetch('/whatsapp/reset', { method: 'POST' });
      await poll();
    } catch (err) {
      setError('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  // ── Derived display values ────────────────────────────────────────────────────

  const rawWaState = status?.waState ?? 'idle';
  const phone      = status?.phone;
  const qr         = status?.qr;
  const isReady    = stableUiStatus === 'CONNECTED';
  const showQR     = stableUiStatus === 'QR_READY' && qr?.active && qr?.qr;
  const dotColor   = STATE_COLOR[stableUiStatus] ?? '#dc3545';
  const labelFn    = STATE_LABEL[stableUiStatus] ?? (() => stableUiStatus);
  const descText   = STATE_DESC[stableUiStatus]  ?? '';
  const canConnect = !['CONNECTING', 'QR_READY'].includes(stableUiStatus);

  return (
    <>
      {confirmModal}
      <PageLayout title="WhatsApp Connection">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* ── Status card ── */}
          <div style={{
            background: '#fff', border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: 16, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: dotColor, flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{labelFn(phone)}</div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{descText}</div>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div style={{
              background: '#f8d7da', color: '#842029', padding: 12,
              borderRadius: 8, marginBottom: 14, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* ── QR code ── */}
          {showQR && (
            <div style={{
              background: '#fff', border: `1px solid ${theme.border}`,
              borderRadius: 8, padding: 24, textAlign: 'center', marginBottom: 16,
            }}>
              <img
                src={qr.qr}
                alt="WhatsApp QR Code"
                style={{ width: 240, height: 240, imageRendering: 'pixelated' }}
              />
              <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 12, marginBottom: 0 }}>
                Open WhatsApp → Settings → Linked Devices → Link a Device → Scan
              </p>
            </div>
          )}

          {/* ── Authenticating ── */}
          {rawWaState === 'authenticating' && (
            <div style={{
              background: '#cfe2ff', border: '1px solid #9ec5fe',
              borderRadius: 8, padding: 24, textAlign: 'center', marginBottom: 16,
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#084298', margin: '0 0 6px' }}>
                QR Scanned — Connecting
              </p>
              <p style={{ fontSize: 13, color: '#084298', margin: 0 }}>
                Accept the "Link a Device" prompt on your phone.
              </p>
            </div>
          )}

          {/* ── Initializing ── */}
          {rawWaState === 'initializing' && (
            <div style={{
              background: '#fff3cd', border: '1px solid #ffecb5',
              borderRadius: 8, padding: 24, textAlign: 'center', marginBottom: 16,
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#664d03', margin: 0 }}>
                Browser launching — QR will appear shortly
              </p>
            </div>
          )}

          {/* ── Connected ── */}
          {isReady && (
            <div style={{
              background: '#d1e7dd', border: '1px solid #a3cfbb',
              borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 16,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0f5132', margin: '0 0 6px' }}>
                WhatsApp Connected
              </p>
              {phone && (
                <p style={{ fontSize: 13, color: '#0f5132', margin: 0 }}>
                  Number: +{phone}
                </p>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {!isReady && (
              <button
                onClick={handleConnect}
                disabled={connecting || !canConnect}
                style={{
                  padding: '9px 20px', background: '#198754', color: '#fff',
                  border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
                  cursor: (connecting || !canConnect) ? 'not-allowed' : 'pointer',
                  opacity: (connecting || !canConnect) ? 0.6 : 1,
                }}
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
            {isReady && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  padding: '9px 20px', background: '#dc3545', color: '#fff',
                  border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                }}
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{
                padding: '9px 18px', background: '#6c757d', color: '#fff',
                border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13,
                cursor: resetting ? 'not-allowed' : 'pointer',
              }}
            >
              {resetting ? 'Resetting…' : 'Reset Session'}
            </button>
          </div>

          {/* ── How it works ── */}
          <div style={{
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: 16, fontSize: 13,
          }}>
            <h4 style={{
              margin: '0 0 10px', fontSize: 13,
              textTransform: 'uppercase', color: theme.textMuted,
            }}>
              How This Works
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: theme.text }}>
              <li>Click <strong>Connect</strong> → scan the QR with your WhatsApp number</li>
              <li>Leads from Meta/Google ads are captured automatically</li>
              <li>Telecallers receive follow-up reminders on WhatsApp</li>
              <li>Use <strong>Reset Session</strong> if the QR keeps expiring</li>
            </ul>
          </div>

        </div>
      </PageLayout>
    </>
  );
}

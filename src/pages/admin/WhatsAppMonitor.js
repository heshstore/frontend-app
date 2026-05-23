import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '../../utils/api';
import { theme } from '../../theme';
import PageLayout from '../../components/layout/PageLayout';
import { useConfirm } from '../../components/ui/ConfirmModal';

const STATE_COLOR = {
  CONNECTED:    theme.success,
  QR_READY:     theme.danger,
  CONNECTING:   theme.warning,
  FAILED:       theme.danger,
  DISCONNECTED: theme.danger,
  IDLE:         '#6c757d',
};

const STATE_LABEL = {
  CONNECTED:    'Connected',
  QR_READY:     'QR Active',
  CONNECTING:   'Connecting',
  FAILED:       'Auth Failure',
  DISCONNECTED: 'Disconnected',
  IDLE:         'Not Connected',
};

const UNHEALTHY_THRESHOLD   = 3;
const DISCONNECTED_HOLD_MS  = 90_000;

function rawToMapped(waState) {
  if (['ready', 'authenticated', 'recovering', 'reconnecting'].includes(waState)) return 'CONNECTED';
  if (['booting', 'initializing', 'authenticating'].includes(waState)) return 'CONNECTING';
  if (waState === 'qr_ready') return 'QR_READY';
  if (['failed', 'auth_failure'].includes(waState)) return 'FAILED';
  if (waState === 'disconnected') return 'DISCONNECTED';
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

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: 16, marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: theme.textMuted, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '5px 0', borderBottom: `1px solid ${theme.border}`, gap: 8,
    }}>
      <span style={{ fontSize: 12, color: theme.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600, textAlign: 'right', wordBreak: 'break-all',
        color: valueColor || theme.text,
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function WhatsAppMonitor() {
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
      console.log('[WA_MONITOR]', { previousStableState: prevStableRef.current, backendState: data?.waState, derivedState: newStable });
      prevStableRef.current = newStable;
      setStatus(data);
      setStableUiStatus(newStable);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, [poll]);

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
      'The current session will be cleared.',
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
      'Clears auth and generates a fresh QR code.',
      { danger: true, confirmLabel: 'Reset' },
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

  const rawWaState = status?.waState ?? 'idle';
  const isReady    = stableUiStatus === 'CONNECTED';
  const stateColor = STATE_COLOR[stableUiStatus] ?? theme.danger;
  const stateLabel = STATE_LABEL[stableUiStatus] ?? stableUiStatus;
  const qr         = status?.qr;
  const showQR     = stableUiStatus === 'QR_READY' && qr?.active && qr?.qr;
  const canConnect = !['CONNECTING', 'QR_READY'].includes(stableUiStatus);

  return (
    <>
      {confirmModal}
      <PageLayout title="WhatsApp Monitor">
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 4px' }}>

          {/* ── Status card ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 11, height: 11, borderRadius: '50%',
                background: stateColor, flexShrink: 0,
              }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: stateColor }}>
                {stateLabel}
              </span>
            </div>
            <SectionLabel>Details</SectionLabel>
            <Row label="State"   value={rawWaState} />
            <Row label="Phone"   value={status?.phone ? `+${status.phone}` : null} />
            <Row label="DB status" value={status?.status} />
            <Row
              label="Initializing"
              value={status?.initializing ? 'Yes' : 'No'}
              valueColor={status?.initializing ? '#0d6efd' : undefined}
            />
          </Card>

          {/* ── QR panel ── */}
          {showQR && (
            <Card>
              <SectionLabel>QR Code</SectionLabel>
              <div style={{
                background: '#fff3cd', border: '1px solid #ffecb5',
                borderRadius: 6, padding: '8px 12px', fontSize: 12,
                color: '#664d03', marginBottom: 12,
              }}>
                Scan with WhatsApp to connect.
              </div>
              <div style={{ textAlign: 'center' }}>
                <img
                  src={qr.qr}
                  alt="WhatsApp QR Code"
                  style={{ width: '100%', maxWidth: 240, imageRendering: 'pixelated' }}
                />
                {qr.generatedAt && (
                  <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>
                    Generated {new Date(qr.generatedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── Actions ── */}
          <Card>
            <SectionLabel>Actions</SectionLabel>
            {error && (
              <div style={{
                background: '#f8d7da', color: '#842029', padding: 10,
                borderRadius: 6, fontSize: 12, marginBottom: 12,
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!isReady && (
                <button
                  onClick={handleConnect}
                  disabled={connecting || !canConnect}
                  style={{
                    padding: '9px 18px', background: '#198754', color: '#fff',
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
                    padding: '9px 18px', background: '#dc3545', color: '#fff',
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
              <button
                onClick={poll}
                style={{
                  padding: '9px 14px', background: theme.surface, color: theme.text,
                  border: `1px solid ${theme.border}`, borderRadius: 6,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Refresh
              </button>
            </div>
          </Card>

        </div>
      </PageLayout>
    </>
  );
}

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch, getToken } from '../../utils/api';
import { API_URL } from '../../config';
import { theme } from '../../theme';
import PageLayout from '../../components/layout/PageLayout';
import { useConfirm } from '../../components/ui/ConfirmModal';

// ── Constants ────────────────────────────────────────────────────────────────

const STATE_COLOR = {
  CONNECTED:    theme.success,
  QR_ACTIVE:    theme.warning,
  INITIALIZING: '#0d6efd',
  DISCONNECTED: theme.danger,
};

const LOG_LABELS = {
  ready:             'Connected',
  disconnected:      'Disconnected',
  qr:                'QR generated',
  auth_failure:      'Auth failure',
  loading:           'Chromium loading',
  restart_initiated: 'Restart initiated',
  initializing:      'Initializing',
  error:             'Error',
  ping:              null, // suppress
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function ts(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString();
}

function ago(iso) {
  if (!iso) return null;
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1)  return 'just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Dot({ color, pulse }) {
  return (
    <span style={{
      display: 'inline-block', width: 11, height: 11, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: pulse ? `0 0 0 3px ${color}33` : 'none',
      animation: pulse ? 'dotPulse 1.8s infinite' : 'none',
    }} />
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: 16, marginBottom: 14,
      ...style,
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '5px 0', borderBottom: `1px solid ${theme.border}`, gap: 8 }}>
      <span style={{ fontSize: 12, color: theme.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor || theme.text, textAlign: 'right', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WhatsAppMonitor() {
  const [confirm, confirmModal] = useConfirm();
  const [status, setStatus]     = useState(null);
  const [qrData, setQrData]     = useState(null);
  const [log, setLog]           = useState([]);
  const [sseOk, setSseOk]       = useState(false);
  const [restarting, setRestarting] = useState(false);

  const esRef      = useRef(null);
  const logRef     = useRef(null);
  const retryTimer = useRef(null);

  // ── Fetch initial status + QR ──────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const [sRes, qRes] = await Promise.all([
        apiFetch('/whatsapp/admin/status'),
        apiFetch('/whatsapp/admin/qr'),
      ]);
      if (sRes.ok) setStatus(await sRes.json());
      if (qRes.ok) setQrData(await qRes.json());
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Append to event log ────────────────────────────────────────────────────

  const appendLog = useCallback((entry) => {
    if (LOG_LABELS[entry.type] === null) return; // suppress pings
    const label = LOG_LABELS[entry.type] ?? entry.type;
    const detail = entry.reason ?? entry.message ?? (entry.percent != null ? `${entry.percent}%` : '');
    setLog(prev => [
      { id: Date.now() + Math.random(), label, detail, time: entry.timestamp ?? new Date().toISOString() },
      ...prev,
    ].slice(0, 100));
  }, []);

  // ── SSE connection with auto-reconnect ────────────────────────────────────

  const connectSse = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    const token = getToken();
    const url   = `${API_URL}/whatsapp/admin/events?token=${encodeURIComponent(token ?? '')}`;
    const es    = new EventSource(url);
    esRef.current = es;

    es.onopen = () => { setSseOk(true); };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Update live status fields from event
        if (data.type === 'ready') {
          setStatus(prev => prev ? {
            ...prev, connected: true, state: 'CONNECTED',
            lastReadyAt: data.timestamp, qrActive: false, qrCount: 0,
          } : prev);
          setQrData({ active: false, qr: null, generatedAt: null });
        } else if (data.type === 'qr') {
          setStatus(prev => prev ? { ...prev, state: 'QR_ACTIVE', qrActive: true, qrCount: data.qrIndex } : prev);
          // Refresh full QR data (includes the image)
          apiFetch('/whatsapp/admin/qr').then(r => r.ok && r.json()).then(d => d && setQrData(d)).catch(() => {});
        } else if (data.type === 'disconnected') {
          setStatus(prev => prev ? {
            ...prev, connected: false, state: 'DISCONNECTED',
            lastDisconnectReason: data.reason, qrActive: false,
          } : prev);
          setQrData({ active: false, qr: null, generatedAt: null });
        } else if (data.type === 'loading') {
          setStatus(prev => prev ? { ...prev, state: 'INITIALIZING' } : prev);
        } else if (data.type === 'auth_failure') {
          setStatus(prev => prev ? { ...prev, connected: false, state: 'DISCONNECTED' } : prev);
        } else if (data.type === 'restart_initiated') {
          setStatus(prev => prev ? { ...prev, state: 'INITIALIZING', connected: false } : prev);
        }

        appendLog(data);
      } catch { /* malformed event */ }
    };

    es.onerror = () => {
      setSseOk(false);
      es.close();
      esRef.current = null;
      // Auto-reconnect after 5 s
      retryTimer.current = setTimeout(connectSse, 5_000);
    };
  }, [appendLog]);

  useEffect(() => {
    connectSse();
    return () => {
      if (esRef.current) { esRef.current.close(); }
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [connectSse]);

  // ── Restart handler ───────────────────────────────────────────────────────

  const handleRestart = async () => {
    if (!await confirm(
      'Restart WhatsApp client?',
      'This will NOT clear the auth session. The existing phone number will reconnect automatically if the session files are intact.',
      { confirmLabel: 'Restart' }
    )) return;
    setRestarting(true);
    try {
      await apiFetch('/whatsapp/admin/restart', { method: 'POST' });
    } catch { /* SSE will update state */ } finally {
      setRestarting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const stateColor = STATE_COLOR[status?.state] ?? theme.danger;
  const isConnected = status?.connected;

  return (
    <>
    {confirmModal}
    <PageLayout title="WhatsApp Monitor">
      <style>{`
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50%       { box-shadow: 0 0 0 5px currentColor; }
        }
        .wa-log-scroll::-webkit-scrollbar { width: 4px; }
        .wa-log-scroll::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 4px' }}>

        {/* ── Section A: Status card ── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Dot color={stateColor} pulse={isConnected} />
            <span style={{ fontWeight: 700, fontSize: 16, color: stateColor }}>
              {status?.state ?? 'Loading…'}
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: 10, padding: '2px 8px',
              borderRadius: 20, background: sseOk ? '#d1e7dd' : '#f8d7da',
              color: sseOk ? '#0f5132' : '#842029', fontWeight: 700,
            }}>
              {sseOk ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <SectionLabel>Status details</SectionLabel>
          <Row label="Last disconnect reason" value={status?.lastDisconnectReason} valueColor={status?.lastDisconnectReason ? theme.danger : undefined} />
          <Row label="Downtime" value={status?.downtimeMinutes != null ? `${status.downtimeMinutes} min` : null} />
          <Row label="Last connected" value={ago(status?.lastReadyAt)} />
          <Row label="QR scans attempted" value={status?.qrCount ?? 0} />
          <Row label="Recovery scan" value={status?.recoveringMessages ? 'Running…' : 'Idle'} valueColor={status?.recoveringMessages ? '#0d6efd' : undefined} />
          <Row label="App version" value={status?.appVersion} />
        </Card>

        {/* ── Section B: QR panel ── */}
        <Card>
          <SectionLabel>QR / Session</SectionLabel>
          {qrData?.active && qrData?.qr ? (
            <>
              <div style={{
                background: '#fff3cd', border: '1px solid #ffecb5', borderRadius: 6,
                padding: '8px 12px', fontSize: 12, color: '#664d03', marginBottom: 12,
              }}>
                WhatsApp requires re-login. Scan the QR code below with your phone.
              </div>
              <div style={{ textAlign: 'center' }}>
                <img
                  src={qrData.qr}
                  alt="WhatsApp QR Code"
                  style={{ width: '100%', maxWidth: 260, height: 'auto', imageRendering: 'pixelated' }}
                />
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>
                  Generated {ts(qrData.generatedAt)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '18px 0', color: theme.textMuted }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{isConnected ? '✅' : '⏳'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isConnected ? theme.success : theme.textMuted }}>
                {isConnected ? 'Session active — no QR needed' : 'Waiting for QR…'}
              </div>
            </div>
          )}
        </Card>

        {/* ── Section D: Actions ── */}
        <Card>
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleRestart}
              disabled={restarting}
              style={{
                padding: '9px 18px', background: restarting ? '#aaa' : '#0d6efd',
                color: '#fff', border: 'none', borderRadius: 6,
                fontWeight: 700, fontSize: 13, cursor: restarting ? 'not-allowed' : 'pointer',
              }}
            >
              {restarting ? 'Restarting…' : 'Restart WhatsApp Client'}
            </button>
            <button
              onClick={fetchStatus}
              style={{
                padding: '9px 18px', background: theme.surface,
                color: theme.text, border: `1px solid ${theme.border}`,
                borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Refresh Status
            </button>
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 8 }}>
            Restart preserves the linked phone number. Use "Disconnect &amp; Change Number" on the /whatsapp page to fully re-link.
          </div>
        </Card>

        {/* ── Section C: Live event log ── */}
        <Card>
          <SectionLabel>Live event log</SectionLabel>
          <div
            ref={logRef}
            className="wa-log-scroll"
            style={{
              maxHeight: 320, overflowY: 'auto',
              fontFamily: 'monospace', fontSize: 11,
            }}
          >
            {log.length === 0 && (
              <div style={{ color: theme.textMuted, padding: '16px 0', textAlign: 'center' }}>
                No events yet — waiting for activity…
              </div>
            )}
            {log.map(entry => (
              <div key={entry.id} style={{
                padding: '4px 0', borderBottom: `1px solid ${theme.border}`,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ color: theme.textMuted, flexShrink: 0 }}>{ts(entry.time)}</span>
                <span style={{
                  fontWeight: 700, flexShrink: 0,
                  color: entry.label === 'Connected'   ? theme.success
                       : entry.label === 'Disconnected' ? theme.danger
                       : entry.label === 'Auth failure'  ? theme.danger
                       : entry.label === 'QR generated'  ? theme.warning
                       : theme.text,
                }}>{entry.label}</span>
                {entry.detail && (
                  <span style={{ color: theme.textMuted, wordBreak: 'break-all' }}>{entry.detail}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

      </div>
    </PageLayout>
    </>
  );
}

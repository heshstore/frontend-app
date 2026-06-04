import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';

// ── Style helpers ──────────────────────────────────────────────────────────────

const btn = (bg, color = '#fff', disabled = false) => ({
  background: disabled ? '#e5e7eb' : bg,
  color: disabled ? '#9ca3af' : color,
  border: 'none',
  borderRadius: 6,
  padding: '6px 13px',
  fontSize: 12,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
  transition: 'opacity .15s',
});

const th = {
  padding: '10px 14px',
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const td = {
  padding: '10px 14px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 13,
  verticalAlign: 'middle',
};

const WARMUP_LABELS = { 1: 'COLD', 2: 'WARM', 3: 'HOT', 4: 'SEASONED' };

function riskColor(score) {
  if (score > 60) return '#dc3545';
  if (score >= 30) return '#fd7e14';
  return '#198754';
}

function formatTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ── WA exact-state chip ────────────────────────────────────────────────────────

const WA_STATE_CHIP = {
  idle:                      { bg: '#f3f4f6', color: '#6b7280',  label: 'Idle' },
  initializing:              { bg: '#dbeafe', color: '#1d4ed8',  label: 'Initializing' },
  awaiting_scan:             { bg: '#fef9c3', color: '#854d0e',  label: 'Scan Required' },
  authenticating:            { bg: '#ede9fe', color: '#6d28d9',  label: 'Authenticating' },
  ready:                     { bg: '#dcfce7', color: '#166534',  label: 'Connected' },
  receive_pending:           { bg: '#fef3c7', color: '#b45309',  label: 'Receive Pending' },
  failed:                    { bg: '#fee2e2', color: '#991b1b',  label: 'Failed' },
  disconnecting:             { bg: '#f3f4f6', color: '#374151',  label: 'Disconnecting' },
  awaiting_manual_reconnect: { bg: '#fff7ed', color: '#c2410c',  label: 'Reconnect Required' },
};

// Phase 3: when awaiting_scan + qr exists, show RESTORE FAILED / QR READY instead of "Scan Required"
function WaStateChip({ waState, qrActive }) {
  if (waState === 'awaiting_scan' && qrActive) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
        <span style={{
          background: '#fee2e2', color: '#991b1b',
          padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 700,
          display: 'inline-block',
        }}>
          RESTORE FAILED
        </span>
        <span style={{
          background: '#dcfce7', color: '#166534',
          padding: '2px 7px', borderRadius: 12, fontSize: 10, fontWeight: 700,
          display: 'inline-block',
        }}>
          QR READY
        </span>
      </div>
    );
  }
  const cfg = WA_STATE_CHIP[waState] || WA_STATE_CHIP.idle;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Runtime state stripper ────────────────────────────────────────────────────
// Zeroes all backend-derived runtime fields on a number record.
// Applied to every row when the backend is unreachable so that stale
// connected badges, health metrics, and session ages cannot be displayed.
// Static DB fields (name, phone, warmup_level, daily_limit, is_active,
// risk_score, last_message_sent_at) are preserved as-is.
function stripRuntimeState(num) {
  return {
    ...num,
    waState:            'idle',
    effectiveState:     'idle',
    connected:          false,
    booting:            false,
    qrActive:           false,
    lastHeartbeat:      null,
    lastReadyAt:        null,
    browserConnected:   false,
    clientExists:       false,
    reconnectCount:     0,
    qrRefreshCount:     0,
    sessionStartedAt:   null,
    lastDisconnectedAt: null,
    firstQrGeneratedAt: null,
    sessionAvailable:   false,
    liveAndReady:       false,
    bridgeReady:        false,
    sendCapable:        false,
    fullyOperational:   false,
    isManualConnect:    false,
  };
}

// ── Phase 1: Inline metrics sub-row ──────────────────────────────────────────
// Always-visible diagnostic strip below each number row. Replaces the toggled
// Health panel so debug data is always in view without any interaction.
function InlineMetricsRow({ num, backendAvailable }) {
  const now = Date.now();

  const connectedMs = (num.sessionStartedAt && num.connected)
    ? now - new Date(num.sessionStartedAt).getTime()
    : null;

  const pillStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 4, padding: '2px 7px',
  };

  if (!backendAvailable) {
    return (
      <tr>
        <td colSpan={8} style={{ padding: '3px 14px 7px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>metrics unavailable</span>
        </td>
      </tr>
    );
  }

  const metrics = [
    { label: 'CONNECTED',    value: connectedMs !== null ? formatDuration(connectedMs) : '—' },
    { label: 'DISCONNECTS',  value: num.reconnectCount ?? 0 },
    { label: 'RECONNECTS',   value: num.reconnectCount ?? 0 },
    { label: 'QR REFRESHES', value: num.qrRefreshCount ?? 0 },
    { label: 'STATE',        value: num.waState ?? 'idle' },
  ];

  return (
    <tr>
      <td colSpan={8} style={{ padding: '3px 14px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {metrics.map(({ label, value }) => (
            <div key={label} style={pillStyle}>
              <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{String(value)}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QrModal({ numberId, numberPhone, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [waStatus, setWaStatus] = useState(null);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    if (document.hidden) return;
    try {
      const [qrRes, statusRes] = await Promise.all([
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/qr`).then((r) => r.json()),
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/status`).then((r) => r.json()),
      ]);
      // Backend returns { active, qr, generatedAt } — NOT dataUrl.
      console.log('[QR_FETCH]', { active: qrRes?.active, hasQr: !!qrRes?.qr, qrLength: qrRes?.qr?.length, waState: statusRes?.waState });
      console.log('[UI_QR_RECEIVED]', { numberId, hasQr: !!qrRes?.qr, qrLength: qrRes?.qr?.length ?? 0, active: qrRes?.active, waState: statusRes?.waState });
      setQrData(qrRes);
      setWaStatus(statusRes);
      const sessionReady    = statusRes?.effectiveState === 'ready' || statusRes?.waState === 'ready';
      const manualRequired  = statusRes?.waState === 'awaiting_manual_reconnect';
      if (sessionReady) {
        clearInterval(pollRef.current);
        setTimeout(onClose, 1_500);
      } else if (manualRequired) {
        // QR expired or restore failed — stop polling, show reconnect prompt.
        clearInterval(pollRef.current);
      }
    } catch { /* poll silently */ }
  }, [numberId, onClose]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  const connected = waStatus?.effectiveState === 'ready' || waStatus?.waState === 'ready';
  // Backend field is `qr`, not `dataUrl`. Using `dataUrl` always returned undefined → modal stuck on "Waiting for QR".
  const qrActive  = !!qrData?.qr && !connected;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Pair WhatsApp</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{numberPhone}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>✕</button>
        </div>

        {waStatus?.waState && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Current State:</span>
            <WaStateChip waState={waStatus.waState} qrActive={qrActive} />
          </div>
        )}

        {/* Temporary render-path log — remove once QR display is confirmed stable */}
        {console.log('QR_RENDER', {
          active: qrData?.active,
          hasDataUrl: !!qrData?.dataUrl,  // always false — backend field is `qr`, not `dataUrl`
          hasQr: !!qrData?.qr,
          dataUrlLength: qrData?.dataUrl?.length,
          qrLength: qrData?.qr?.length,
          waState: waStatus?.waState,
        })}

        {connected ? (
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: 16 }}>Connected!</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Closing…</div>
          </div>
        ) : qrActive ? (
          <>
            <img src={qrData.qr} alt="QR Code" style={{ width: 280, height: 280, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 14, lineHeight: 1.5 }}>
              Open WhatsApp on <strong>{numberPhone}</strong>, go to<br />
              <strong>Linked Devices → Link a Device</strong>, then scan.
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
              QR refreshes every ~20s — scan the current code
            </div>
          </>
        ) : waStatus?.waState === 'authenticating' ? (
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <div style={{ fontWeight: 700, color: '#6d28d9', fontSize: 16 }}>Authenticating…</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
              QR scanned — WhatsApp is establishing the session.<br />
              <strong>Do not close this window.</strong>
            </div>
            <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 10 }}>
              Session will be ready in a few seconds
            </div>
          </div>
        ) : waStatus?.booting || waStatus?.waState === 'initializing' ? (
          <div style={{ padding: '24px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Starting WhatsApp…</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>QR will appear shortly</div>
          </div>
        ) : waStatus?.waState === 'awaiting_manual_reconnect' ? (
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏱</div>
            <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 16 }}>QR Expired</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
              The scan window closed or the session could not be restored.<br />
              Close this dialog and click <strong>Connect</strong> to generate a new QR.
            </div>
          </div>
        ) : waStatus?.waState === 'failed' || waStatus?.waState === 'auth_failure' ? (
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>❌</div>
            <div style={{ fontWeight: 700, color: '#991b1b' }}>Auth Failed</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
              Use "Reset" to wipe the session and pair again.
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📱</div>
            <div style={{ fontWeight: 600 }}>Waiting for QR…</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Status: <strong>{waStatus?.waState ?? '—'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Number Row ────────────────────────────────────────────────────────────────

function NumberRow({ num, onAction, backendAvailable }) {
  const [busy, setBusy]           = useState(false);
  const [limitEdit, setLimitEdit] = useState('');
  const [limitDirty, setLimitDirty] = useState(false);
  const [qrOpen, setQrOpen]       = useState(false);
  // Prevents re-opening after user manually closes — resets when state leaves awaiting_scan.
  const autoOpenedRef = useRef(false);

  // Auto-close QR modal when backend goes offline — its internal polls will silently
  // fail and leave the user staring at a stale "Waiting for QR…" screen forever.
  useEffect(() => {
    if (!backendAvailable && qrOpen) setQrOpen(false);
  }, [backendAvailable, qrOpen]);

  // Auto-open QR modal as soon as backend signals awaiting_scan + qr ready.
  // Guard: once auto-opened, don't re-open if user manually closes.
  // Reset: when state leaves awaiting_scan so the next QR cycle works.
  useEffect(() => {
    if (num.waState === 'awaiting_scan' && num.qrActive && backendAvailable) {
      if (!autoOpenedRef.current) {
        autoOpenedRef.current = true;
        console.log('[UI_QR_MODAL_OPEN]', { numberId: num.id, trigger: 'auto', waState: num.waState });
        setQrOpen(true);
      }
    } else if (num.waState !== 'awaiting_scan') {
      autoOpenedRef.current = false;
    }
  }, [num.id, num.waState, num.qrActive, backendAvailable]);

  const actionDisabled = busy || !backendAvailable;

  const doAction = async (action) => {
    setBusy(true);
    try {
      await onAction(num.id, num.phone, action);
      await onAction(num.id, num.phone, 'reload');
    } finally {
      setBusy(false);
    }
  };

  const saveLimit = async () => {
    if (!limitDirty || !backendAvailable) return;
    const parsed = parseInt(limitEdit, 10);
    if (isNaN(parsed) || parsed < 1) return;
    setBusy(true);
    try {
      await apiFetch(`/marketing/whatsapp-engine/numbers/${num.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_limit: parsed }),
      });
      setLimitDirty(false);
      onAction(num.id, num.phone, 'reload');
    } finally {
      setBusy(false);
    }
  };

  const connected        = num.connected === true;
  const waState          = num.waState ?? 'idle';
  const fullyOperational = num.fullyOperational === true;
  const sendCapable      = num.sendCapable === true;

  // fullyOperational → green Connected
  // sendCapable (ready) but bridgeReady=false → amber Receive Pending
  // everything else → existing state chips
  const chipWaState = fullyOperational
    ? 'ready'
    : (sendCapable && num.bridgeReady === false && waState === 'ready')
      ? 'receive_pending'
      : (connected ? 'ready' : waState);

  // Phase 2: smart connect button — one button per state, no ambiguity
  const isReconnect = (num.reconnectCount > 0) || !!num.lastDisconnectedAt;
  let connectButton = null;
  if (backendAvailable) {
    if (connected) {
      // READY → do nothing
    } else if (waState === 'awaiting_scan') {
      // AWAITING_SCAN → open QR immediately, no connect API call needed
      connectButton = (
        <button
          style={btn('#16a34a', '#fff', actionDisabled)}
          disabled={actionDisabled}
          onClick={() => {
            console.log('[UI_QR_MODAL_OPEN]', { numberId: num.id, trigger: 'user_click', waState: num.waState });
            setQrOpen(true);
          }}
        >
          Scan QR
        </button>
      );
    } else if (waState === 'initializing') {
      // INITIALIZING → loading indicator
      connectButton = (
        <button style={btn('#e5e7eb', '#9ca3af', true)} disabled={true}>
          Starting…
        </button>
      );
    } else if (waState === 'authenticating' && num.clientExists) {
      // Authenticating with live client — QR was scanned, waiting for session
      connectButton = (
        <button style={btn('#e5e7eb', '#9ca3af', true)} disabled={true}>
          Authenticating…
        </button>
      );
    } else {
      // DISCONNECTED / idle / failed / stuck-authenticating → reconnect or initial connect
      connectButton = (
        <button
          style={btn('#0d6efd', '#fff', actionDisabled)}
          disabled={actionDisabled}
          onClick={async () => {
            console.warn('[CONNECT_BUTTON_CLICK]', { numberId: num.id, phone: num.phone, ts: Date.now() });
            await doAction('connect');
            setQrOpen(true);
          }}
        >
          {isReconnect ? 'Reconnect' : 'Connect'}
        </button>
      );
    }
  }

  return (
    <>
      {qrOpen && (
        <QrModal
          numberId={num.id}
          numberPhone={num.phone}
          onClose={() => { setQrOpen(false); onAction(num.id, num.phone, 'reload'); }}
        />
      )}
      <React.Fragment>
        <tr style={{ background: busy ? '#f8fafc' : '#fff' }}>
          {/* Name + Phone */}
          <td style={td}>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{num.name || '—'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginTop: 2 }}>{num.phone}</div>
          </td>

          {/* WA Session State — Phase 3: chip shows RESTORE FAILED / QR READY when awaiting_scan + qrActive */}
          <td style={td}>
            <WaStateChip waState={chipWaState} qrActive={num.qrActive} />
            {num.lastReadyAt && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                Since {formatTime(num.lastReadyAt)}
              </div>
            )}
          </td>

          {/* Engine Status */}
          <td style={td}>
            <span style={{
              background: num.is_active ? '#dcfce7' : '#f3f4f6',
              color: num.is_active ? '#166534' : '#6b7280',
              padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            }}>
              {num.is_active ? 'ACTIVE' : 'PAUSED'}
            </span>
          </td>

          {/* Warmup */}
          <td style={td}>
            <span style={{ fontWeight: 700, color: '#0d6efd', fontSize: 12, background: '#eff6ff', padding: '2px 7px', borderRadius: 4 }}>
              L{num.warmup_level ?? 1} {WARMUP_LABELS[num.warmup_level] ?? ''}
            </span>
          </td>

          {/* Daily Sent / Limit */}
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, color: '#0d6efd' }}>{num.daily_sent ?? 0}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>/</span>
              <input
                type="number"
                min={1}
                value={limitDirty ? limitEdit : (num.daily_limit ?? '')}
                onChange={(e) => { setLimitEdit(e.target.value); setLimitDirty(true); }}
                onBlur={saveLimit}
                onKeyDown={(e) => e.key === 'Enter' && saveLimit()}
                style={{
                  width: 58, padding: '3px 6px',
                  border: `1px solid ${limitDirty ? '#0d6efd' : '#d1d5db'}`,
                  borderRadius: 5, fontSize: 12, textAlign: 'center',
                }}
              />
            </div>
          </td>

          {/* Risk */}
          <td style={td}>
            <span style={{ fontWeight: 700, color: riskColor(num.risk_score ?? 0), fontSize: 13 }}>
              {Number(num.risk_score ?? 0).toFixed(0)}
            </span>
          </td>

          {/* Last Active */}
          <td style={{ ...td, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
            {formatTime(num.last_message_sent_at)}
          </td>

          {/* Actions — Phase 2: smart connect button replaces fixed Connect */}
          <td style={td}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {connectButton}
              {connected && (
                <button
                  style={btn('#f3f4f6', '#374151', actionDisabled)}
                  disabled={actionDisabled}
                  onClick={() => doAction('disconnect')}
                >
                  Disconnect
                </button>
              )}
              <button
                style={btn('#fee2e2', '#991b1b', actionDisabled)}
                disabled={actionDisabled}
                title="Wipe session — generates fresh QR"
                onClick={() => doAction('reset')}
              >
                Reset
              </button>
              <button
                style={btn(num.is_active ? '#fef9c3' : '#dcfce7', num.is_active ? '#854d0e' : '#166534', actionDisabled)}
                disabled={actionDisabled}
                onClick={() => doAction('toggle')}
              >
                {num.is_active ? 'Pause' : 'Resume'}
              </button>
            </div>
          </td>
        </tr>

        {/* Phase 1: inline metrics — always visible, no toggle */}
        <InlineMetricsRow num={num} backendAvailable={backendAvailable} />
      </React.Fragment>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WaNumbers() {
  const [numbers, setNumbers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [resetting, setResetting] = useState(false);
  // 'connected' | 'disconnected'
  // Starts as 'connected' — first poll either confirms or flips it within 15s.
  const [backendStatus, setBackendStatus] = useState('connected');

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/numbers');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setNumbers(Array.isArray(d) ? d : []);
      setBackendStatus('connected');
    } catch {
      // Do NOT clear numbers — preserve static row data (name/phone/warmup/limits)
      // for display. Runtime fields are stripped via displayNumbers below.
      setBackendStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, []);

  // Single interval — initial load + 15s background polling.
  // One effect, one interval, no duplicate fetches, no race conditions.
  useEffect(() => {
    loadNumbers();
    const t = setInterval(loadNumbers, 15_000);
    return () => clearInterval(t);
  }, [loadNumbers]);

  // Derived: strip all runtime state when the backend is unreachable.
  // Structural guarantee: connected=false on every row when backendAvailable=false,
  // making it impossible to render a Connected badge without live backend data.
  const backendAvailable = backendStatus === 'connected';
  const displayNumbers   = backendAvailable ? numbers : numbers.map(stripRuntimeState);

  const handleAction = useCallback(async (numberId, phone, action) => {
    if (action === 'reload') { await loadNumbers(); return; }
    try {
      if (action === 'connect') {
        console.warn('[CONNECT_REQUEST_START]', { numberId, phone, ts: Date.now() });
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/connect`, { method: 'POST' });
        if (!r.ok) {
          console.warn('[CONNECT_REQUEST_FAIL]', { numberId, phone, status: r.status, ts: Date.now() });
          throw new Error(`Server error ${r.status}`);
        }
        console.warn('[CONNECT_REQUEST_SUCCESS]', { numberId, phone, status: r.status, ts: Date.now() });
        showFeedback(`Connecting ${phone}… scan QR`);
      } else if (action === 'disconnect') {
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/disconnect`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} disconnected`);
      } else if (action === 'reset') {
        if (!window.confirm(`Reset session for ${phone}? This wipes auth and generates a fresh QR.`)) return;
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/reset`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} session reset — scan new QR`);
      } else if (action === 'toggle') {
        const num = numbers.find((n) => n.id === numberId);
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !num?.is_active }),
        });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} ${num?.is_active ? 'paused' : 'resumed'}`);
        await loadNumbers();
      }
    } catch (e) {
      showFeedback(e?.message || 'Action failed', true);
    }
  }, [numbers, loadNumbers]);

  const resetDaily = async () => {
    setResetting(true);
    try {
      const r = await apiFetch('/marketing/whatsapp-engine/numbers/reset-daily', { method: 'POST' });
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      showFeedback('Daily counts reset');
      await loadNumbers();
    } catch (e) {
      showFeedback(e?.message || 'Reset failed', true);
    } finally {
      setResetting(false);
    }
  };

  return (
    <PageLayout
      title="Telecaller Numbers"
      subtitle="Connect WhatsApp numbers for the AI engine — scan QR, monitor sessions, track health"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && (
            <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>
              {feedback.msg}
            </span>
          )}
          <button
            style={btn('#fd7e14', '#fff', resetting || !backendAvailable)}
            onClick={resetDaily}
            disabled={resetting || !backendAvailable}
          >
            {resetting ? 'Resetting…' : '↺ Reset Daily Counts'}
          </button>
          <button style={btn('#0d6efd', '#fff', loading)} onClick={loadNumbers} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
          <strong>AI handles:</strong> sending · targeting · timing · safety &nbsp;|&nbsp;
          <strong>You handle:</strong> connecting numbers · monitoring stability
        </div>

        {/* Backend unavailable banner — disappears automatically when the next 15s poll succeeds. */}
        {!backendAvailable && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, color: '#dc3545', fontSize: 13 }}>
                Backend unavailable — reconnecting…
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                Session states and health metrics are hidden until connection is restored.
              </div>
            </div>
          </div>
        )}

        {loading && numbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading numbers…</div>
        ) : displayNumbers.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📱</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No telecaller numbers found</div>
            <div style={{ fontSize: 13 }}>Add numbers in the database to start connecting.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Number</th>
                  <th style={th}>WA Session</th>
                  <th style={th}>Engine</th>
                  <th style={th}>Warmup</th>
                  <th style={th}>Daily (Sent / Limit)</th>
                  <th style={th}>Risk</th>
                  <th style={th}>Last Active</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayNumbers.map((num) => (
                  <NumberRow
                    key={num.id}
                    num={num}
                    onAction={handleAction}
                    backendAvailable={backendAvailable}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Sessions are manual-only — click Connect to start. Connection state refreshes every 15s. Edit limit inline (Enter to save). Reset wipes LocalAuth — phone must re-scan QR.
        </div>
      </div>
    </PageLayout>
  );
}

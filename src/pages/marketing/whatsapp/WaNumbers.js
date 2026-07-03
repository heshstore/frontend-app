import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../../components/layout/PageLayout';
import { apiFetch } from '../../../utils/api';
import { resolveWarmup, waSessionChip } from '../utils/whatsappStatus';

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

const PACING_COLOR = { Slow: '#fd7e14', Moderate: '#0d6efd', Fast: '#16a34a' };

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

// ── WA Session chip (uses shared mapping from whatsappStatus.js) ───────────────

function SessionChip({ waState, connected }) {
  const cfg = waSessionChip(waState, connected);
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Number Health chip ─────────────────────────────────────────────────────────

function healthStatus(num) {
  if (num.status === 'banned') return { label: 'Blocked',      bg: '#fee2e2', color: '#991b1b' };
  if (num.connected)           return { label: 'Healthy',      bg: '#dcfce7', color: '#166534' };
  if (!num.is_active)          return { label: 'Paused',       bg: '#f3f4f6', color: '#6b7280' };
  return                              { label: 'Disconnected', bg: '#fff7ed', color: '#c2410c' };
}

function HealthChip({ num }) {
  const h = healthStatus(num);
  return (
    <span style={{
      background: h.bg, color: h.color,
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      display: 'inline-block',
    }}>
      {h.label}
    </span>
  );
}

// ── Runtime state stripper (used when backend offline) ────────────────────────
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
    phoneLinkCode:      null,
  };
}

// ── Inline metrics strip ───────────────────────────────────────────────────────
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
        <td colSpan={6} style={{ padding: '3px 14px 7px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>metrics unavailable</span>
        </td>
      </tr>
    );
  }

  const metrics = [
    { label: 'CONNECTED',       value: connectedMs !== null ? formatDuration(connectedMs) : '—' },
    { label: 'DISCONNECTS',     value: num.reconnectCount ?? 0 },
    { label: 'CONN. ATTEMPTS',  value: num.qrRefreshCount ?? 0 },
    { label: 'SESSION',         value: num.sessionAvailable ? 'Saved' : 'None' },
    { label: 'SINCE',           value: num.lastReadyAt ? formatTime(num.lastReadyAt) : '—' },
  ];

  return (
    <tr>
      <td colSpan={6} style={{ padding: '3px 14px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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

// ── Connect Modal (QR + phone link) ───────────────────────────────────────────

function ConnectModal({ numberId, numberPhone, onClose }) {
  const [qrData,    setQrData]    = useState(null);
  const [waStatus,  setWaStatus]  = useState(null);
  const [method,    setMethod]    = useState('qr');       // 'qr' | 'phone'
  const [phoneInput, setPhoneInput] = useState('');
  const [linkCode,  setLinkCode]  = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [linking,   setLinking]   = useState(false);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    if (document.hidden) return;
    try {
      const [qrRes, statusRes] = await Promise.all([
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/qr`).then((r) => r.json()),
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/status`).then((r) => r.json()),
      ]);
      setQrData(qrRes);
      setWaStatus(statusRes);
      // Auto-close on success
      if (statusRes?.effectiveState === 'ready' || statusRes?.waState === 'ready') {
        clearInterval(pollRef.current);
        setTimeout(onClose, 1_500);
      }
      // Update link code from status if available
      if (statusRes?.phoneLinkCode) setLinkCode(statusRes.phoneLinkCode);
    } catch { /* poll silently */ }
  }, [numberId, onClose]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  const requestPhoneLink = async () => {
    const raw = phoneInput.trim();
    if (!raw) return;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      setLinkError('Include the country code — e.g. 919940172777 for India (minimum 10 digits).');
      return;
    }
    setLinking(true);
    setLinkError(null);
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/link-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: raw }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || d.message || 'Request failed');
      setLinkCode(d.code);
    } catch (e) {
      setLinkError(e?.message || 'Failed to get pairing code');
    } finally {
      setLinking(false);
    }
  };

  const connected  = waStatus?.effectiveState === 'ready' || waStatus?.waState === 'ready';
  const qrActive   = !!qrData?.qr && !connected;
  const currentWaState = waStatus?.waState ?? 'idle';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, minWidth: 360, maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Link WhatsApp</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{numberPhone}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* Method tabs */}
        {!connected && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #e5e7eb', paddingBottom: 10 }}>
            {['qr', 'phone'].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: method === m ? '#0d6efd' : '#f3f4f6',
                  color: method === m ? '#fff' : '#374151',
                }}
              >
                {m === 'qr' ? 'QR Code' : 'Phone Number'}
              </button>
            ))}
          </div>
        )}

        {connected ? (
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: 16 }}>Connected!</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Closing…</div>
          </div>

        ) : method === 'qr' ? (
          /* ── QR path ── */
          currentWaState === 'initializing' ? (
            <div style={{ padding: '24px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>Starting WhatsApp…</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>QR will appear shortly</div>
            </div>
          ) : currentWaState === 'authenticating' ? (
            <div style={{ padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
              <div style={{ fontWeight: 700, color: '#6d28d9', fontSize: 16 }}>Authenticating…</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>QR scanned — session establishing.</div>
            </div>
          ) : qrActive ? (
            <>
              <img src={qrData.qr} alt="QR Code" style={{ width: 260, height: 260, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 14, lineHeight: 1.5 }}>
                Open WhatsApp → <strong>Linked Devices → Link a Device</strong> → scan.
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                QR refreshes every ~20s — scan the current code
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏱</div>
              <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 15 }}>QR Expired or Session Required</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
                Close this dialog and click <strong>Connect</strong> to generate a new QR code.
              </div>
            </div>
          )

        ) : (
          /* ── Phone link path ── */
          <div style={{ textAlign: 'left' }}>
            {!linkCode ? (
              <>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                  Enter the <strong>phone number</strong> of the WhatsApp account you're linking.<br />
                  Include country code (e.g. <code>919940172777</code>).
                </div>
                <input
                  type="tel"
                  placeholder="e.g. 919940172777"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
                />
                {linkError && <div style={{ fontSize: 12, color: '#dc3545', marginBottom: 8 }}>{linkError}</div>}
                <button
                  onClick={requestPhoneLink}
                  disabled={linking || !phoneInput.trim()}
                  style={{ ...btn('#0d6efd', '#fff', linking || !phoneInput.trim()), width: '100%', padding: '9px 0' }}
                >
                  {linking ? 'Requesting…' : 'Get Pairing Code'}
                </button>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                  Make sure Chromium is running — click Connect first if the number shows Disconnected.
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                  Open WhatsApp → <strong>Linked Devices → Link with phone number</strong>, then enter:
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 800, letterSpacing: 6, color: '#0d6efd',
                  background: '#eff6ff', borderRadius: 8, padding: '12px 20px', marginBottom: 12,
                  fontFamily: 'monospace',
                }}>
                  {linkCode}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Code expires in ~60 seconds. Do not close this window.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Number Row ────────────────────────────────────────────────────────────────

function NumberRow({ num, onAction, backendAvailable }) {
  const [busy,       setBusy]       = useState(false);
  const [showAdv,    setShowAdv]    = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!backendAvailable && connectOpen) setConnectOpen(false);
  }, [backendAvailable, connectOpen]);

  // Auto-open modal when QR becomes ready
  useEffect(() => {
    if (num.waState === 'awaiting_scan' && num.qrActive && backendAvailable) {
      if (!autoOpenedRef.current) {
        autoOpenedRef.current = true;
        setConnectOpen(true);
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

  const waState          = num.waState ?? 'idle';
  const connected        = num.connected === true;
  const sessionAvailable = num.sessionAvailable === true;
  const warmup           = resolveWarmup(num);

  // Three distinct connect states for the action column:
  // 1. CONNECTED — show Disconnect + Pause Promotion
  // 2. SESSION EXISTS BUT OFFLINE — show Reconnect
  // 3. NO SESSION — show Connect
  let primaryAction = null;
  if (backendAvailable) {
    if (connected) {
      primaryAction = null; // handled separately below
    } else if (waState === 'initializing' || waState === 'authenticating') {
      primaryAction = (
        <button style={btn('#e5e7eb', '#9ca3af', true)} disabled>
          Connecting…
        </button>
      );
    } else if (waState === 'awaiting_scan') {
      primaryAction = (
        <button
          style={btn('#16a34a', '#fff', actionDisabled)}
          disabled={actionDisabled}
          onClick={() => setConnectOpen(true)}
        >
          Scan QR
        </button>
      );
    } else if (sessionAvailable) {
      // Session files exist — this is a reconnect, not a fresh pair
      primaryAction = (
        <button
          style={btn('#0d6efd', '#fff', actionDisabled)}
          disabled={actionDisabled}
          onClick={async () => {
            await doAction('connect');
            setConnectOpen(true);
          }}
        >
          Reconnect
        </button>
      );
    } else {
      // No session on disk — fresh pairing needed
      primaryAction = (
        <button
          style={btn('#0d6efd', '#fff', actionDisabled)}
          disabled={actionDisabled}
          onClick={async () => {
            await doAction('connect');
            setConnectOpen(true);
          }}
        >
          Connect
        </button>
      );
    }
  }

  return (
    <>
      {connectOpen && (
        <ConnectModal
          numberId={num.id}
          numberPhone={num.phone}
          onClose={() => { setConnectOpen(false); onAction(num.id, num.phone, 'reload'); }}
        />
      )}
      <React.Fragment>
        <tr style={{ background: busy ? '#f8fafc' : '#fff' }}>

          {/* Number */}
          <td style={td}>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{num.name || '—'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginTop: 2 }}>{num.phone}</div>
          </td>

          {/* WA Session */}
          <td style={td}>
            <SessionChip waState={waState} connected={connected} />
            {connected && num.lastReadyAt && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                Since {formatTime(num.lastReadyAt)}
              </div>
            )}
          </td>

          {/* Number Health */}
          <td style={td}>
            <HealthChip num={num} />
          </td>

          {/* Warmup */}
          <td style={td}>
            <span style={{
              fontWeight: 700,
              color:      warmup.notStarted ? '#9ca3af' : '#0d6efd',
              fontSize:   11,
              background: warmup.notStarted ? '#f3f4f6' : '#eff6ff',
              padding: '3px 8px', borderRadius: 4,
              display: 'inline-block',
            }}>
              {warmup.label}
            </span>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
              Capacity: <strong style={{ color: '#374151' }}>{warmup.daily}/day</strong>
            </div>
            <div style={{ fontSize: 11, marginTop: 1 }}>
              Pacing:{' '}
              <span style={{ fontWeight: 700, color: PACING_COLOR[warmup.pacing] }}>
                {warmup.pacing}
              </span>
            </div>
          </td>

          {/* Daily Sent / Cap */}
          <td style={td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, color: '#0d6efd', fontSize: 14 }}>{num.daily_sent ?? 0}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>/</span>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{warmup.daily}</span>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>today</div>
          </td>

          {/* Actions */}
          <td style={td}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {connected ? (
                <>
                  <button
                    style={btn('#f3f4f6', '#374151', actionDisabled)}
                    disabled={actionDisabled}
                    onClick={() => doAction('disconnect')}
                  >
                    Disconnect
                  </button>
                  <button
                    style={btn(num.is_active ? '#fef9c3' : '#dcfce7', num.is_active ? '#854d0e' : '#166534', actionDisabled)}
                    disabled={actionDisabled}
                    onClick={() => doAction('toggle')}
                    title={num.is_active ? 'Pause promotions for this number' : 'Resume promotions'}
                  >
                    {num.is_active ? 'Pause Promotion' : 'Resume'}
                  </button>
                </>
              ) : (
                primaryAction
              )}

              {/* Advanced actions — hidden by default */}
              <button
                style={{ background: 'none', border: 'none', fontSize: 11, color: '#9ca3af', cursor: 'pointer', padding: '2px 4px' }}
                onClick={() => setShowAdv((v) => !v)}
                title="Advanced actions"
              >
                ···
              </button>

              {showAdv && (
                <div style={{
                  position: 'absolute', background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  padding: '8px 0', zIndex: 100, minWidth: 160,
                }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, padding: '2px 12px 6px', letterSpacing: '0.04em' }}>
                    ADVANCED
                  </div>
                  <button
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px',
                      background: 'none', border: 'none', fontSize: 12, color: '#dc3545', cursor: 'pointer',
                    }}
                    onClick={() => {
                      setShowAdv(false);
                      if (!window.confirm(`Reset session for ${num.phone}?\n\nThis wipes the saved auth and requires a fresh QR scan.`)) return;
                      doAction('reset');
                    }}
                  >
                    Reset Session (wipe auth)
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>

        <InlineMetricsRow num={num} backendAvailable={backendAvailable} />
      </React.Fragment>
    </>
  );
}

// Click-outside handler to close advanced dropdown
function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, onClose]);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WaNumbers() {
  const [numbers,       setNumbers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [feedback,      setFeedback]      = useState(null);
  const [backendStatus, setBackendStatus] = useState('connected');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);   // ms timestamp of last successful fetch
  const [secondsAgo,    setSecondsAgo]    = useState(0);      // seconds since last update
  const [showAdmin,     setShowAdmin]     = useState(false);  // admin tools panel
  const [resetting,     setResetting]     = useState(false);

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
      setLastUpdatedAt(Date.now());
      setSecondsAgo(0);
    } catch {
      setBackendStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    loadNumbers();
    const t = setInterval(loadNumbers, 60_000);
    return () => clearInterval(t);
  }, [loadNumbers]);

  // Tick the "Updated X seconds ago" counter every second
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdatedAt) setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000));
    }, 1_000);
    return () => clearInterval(t);
  }, [lastUpdatedAt]);

  const backendAvailable = backendStatus === 'connected';
  const displayNumbers   = backendAvailable ? numbers : numbers.map(stripRuntimeState);

  const handleAction = useCallback(async (numberId, phone, action) => {
    if (action === 'reload') { await loadNumbers(); return; }
    try {
      if (action === 'connect') {
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/connect`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`Connecting ${phone}…`);
      } else if (action === 'disconnect') {
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/disconnect`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} disconnected`);
      } else if (action === 'reset') {
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/reset`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} session reset`);
      } else if (action === 'toggle') {
        const num = numbers.find((n) => n.id === numberId);
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !num?.is_active }),
        });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        showFeedback(`${phone} ${num?.is_active ? 'promotion paused' : 'promotion resumed'}`);
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
      title="Connections"
      subtitle="Connect WhatsApp numbers once — sessions restore automatically on restart"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {feedback && (
            <span style={{ fontSize: 12, color: feedback.isError ? '#dc3545' : '#198754', fontWeight: 600 }}>
              {feedback.msg}
            </span>
          )}
          {/* Auto-refresh indicator — no manual button */}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {loading
              ? 'Updating…'
              : lastUpdatedAt
                ? `Updated ${secondsAgo}s ago`
                : 'Loading…'}
          </span>
        </div>
      }
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Philosophy banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
          <strong>Connect once → session persists automatically.</strong> &nbsp;
          Sessions restore silently on every restart. Manual action is only needed when a number shows <strong>Reconnect Required</strong> or after an explicit Reset.
        </div>

        {!backendAvailable && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, color: '#dc3545', fontSize: 13 }}>Backend unavailable — reconnecting…</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Session states hidden until connection is restored.</div>
            </div>
          </div>
        )}

        {loading && numbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading connections…</div>
        ) : displayNumbers.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 48, textAlign: 'center', color: '#6c757d' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📱</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>No numbers configured</div>
            <div style={{ fontSize: 13 }}>Add numbers in the database to begin.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Number</th>
                  <th style={th}>WA Session</th>
                  <th style={th}>Health</th>
                  <th style={th}>Warmup</th>
                  <th style={th}>Daily Sent / Cap</th>
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
          Auto-refreshes every 15s · Connect accepts QR or phone number · Reset (Advanced) wipes auth and requires fresh pairing
        </div>

        {/* Admin Tools — collapsed by default */}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowAdmin((v) => !v)}
            style={{
              background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '5px 12px', fontSize: 11, color: '#9ca3af', cursor: 'pointer',
              fontWeight: 600, letterSpacing: '0.04em',
            }}
          >
            {showAdmin ? '▲ Hide Admin Tools' : '▼ Admin Tools'}
          </button>

          {showAdmin && (
            <div style={{
              marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 8, padding: '14px 18px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>
                ADMIN TOOLS
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  style={btn('#fd7e14', '#fff', resetting || !backendAvailable)}
                  disabled={resetting || !backendAvailable}
                  onClick={resetDaily}
                >
                  {resetting ? 'Resetting…' : '↺ Reset All Daily Counts'}
                </button>
                <span style={{ fontSize: 12, color: '#92400e' }}>
                  Resets daily_sent to 0 for all numbers. Run at midnight or after a restart if counts are stale.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

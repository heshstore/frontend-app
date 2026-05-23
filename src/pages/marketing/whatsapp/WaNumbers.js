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

// ── Stable status derivation ───────────────────────────────────────────────────

const UNHEALTHY_THRESHOLD  = 3;
const DISCONNECTED_HOLD_MS = 90_000;
// Minimum time that must have elapsed since the first non-CONNECTED poll before we
// will consider downgrading from CONNECTED. Guards against polling storms where
// multiple rapid polls burn through UNHEALTHY_THRESHOLD in milliseconds.
const DISCONNECT_GRACE_MS  = 15_000;

function rawToMapped(waState) {
  if (['ready', 'authenticated'].includes(waState)) return 'CONNECTED';
  if (['booting', 'initializing', 'authenticating'].includes(waState)) return 'CONNECTING';
  if (waState === 'qr_ready') return 'QR_READY';
  if (['failed', 'auth_failure'].includes(waState)) return 'FAILED';
  if (waState === 'disconnected') return 'DISCONNECTED';
  return 'IDLE';
}

// graceSince: timestamp when we first saw a non-CONNECTED response from a CONNECTED state.
function deriveStableStatus(prevStable, raw, unhealthyCount, disconnectedSince, graceSince) {
  const rawMapped = rawToMapped(raw?.waState ?? 'idle');
  if (prevStable !== 'CONNECTED') return rawMapped;
  if (rawMapped === 'CONNECTED') return 'CONNECTED';
  if (rawMapped === 'QR_READY' || rawMapped === 'FAILED') return rawMapped;

  // Time gate: absorb transient backend states and polling storms.
  // If we haven't been seeing non-CONNECTED for at least DISCONNECT_GRACE_MS, hold CONNECTED.
  const graceExpired = graceSince !== null && (Date.now() - graceSince) >= DISCONNECT_GRACE_MS;
  if (!graceExpired) return 'CONNECTED';

  // Evidence gate: require positive proof that the session is truly gone before downgrading.
  // A transient 'idle' response while the browser is still alive must NOT flip the UI.
  const browserGone  = raw?.browserConnected === false;
  const clientGone   = raw?.clientExists === false;
  const lastReadyMs  = raw?.lastReadyAt ? new Date(raw.lastReadyAt).getTime() : null;
  const readyStale   = lastReadyMs !== null && (Date.now() - lastReadyMs) > 2 * 60_000;
  if (!browserGone && !clientGone && !readyStale) return 'CONNECTED';

  if (rawMapped === 'DISCONNECTED') {
    if (disconnectedSince && Date.now() - disconnectedSince >= DISCONNECTED_HOLD_MS) return 'DISCONNECTED';
    return 'CONNECTED';
  }
  if (unhealthyCount >= UNHEALTHY_THRESHOLD) return rawMapped;
  return 'CONNECTED';
}

function riskColor(score) {
  if (score > 60) return '#dc3545';
  if (score >= 30) return '#fd7e14';
  return '#198754';
}

function formatTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// ── WA state badge ─────────────────────────────────────────────────────────────

function WaStateBadge({ stableStatus }) {
  if (stableStatus === 'CONNECTED') {
    return (
      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
        CONNECTED
      </span>
    );
  }
  if (!stableStatus || stableStatus === 'IDLE') return null;
  const map = {
    CONNECTING:   { bg: '#e0f2fe', color: '#0369a1', label: 'CONNECTING' },
    QR_READY:     { bg: '#fef9c3', color: '#854d0e', label: 'QR READY' },
    DISCONNECTED: { bg: '#f3f4f6', color: '#6b7280', label: 'DISCONNECTED' },
    FAILED:       { bg: '#fee2e2', color: '#991b1b', label: 'FAILED' },
  };
  const c = map[stableStatus] || { bg: '#f3f4f6', color: '#6b7280', label: stableStatus };
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QrModal({ numberId, numberPhone, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [waStatus, setWaStatus] = useState(null);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    // Skip poll when tab is hidden — avoids unnecessary network during reconnect loops
    if (document.hidden) return;
    console.log('[POLL_DEBUG] qr_modal', { numberId, intervalMs: 5000, hidden: document.hidden, timestamp: Date.now() });
    try {
      const [qrRes, statusRes] = await Promise.all([
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/qr`).then((r) => r.json()),
        apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/status`).then((r) => r.json()),
      ]);
      if (qrRes?.qr) {
        console.log('[FRONTEND_QR] receivedLength=' + qrRes.qr.length + ' active=' + qrRes.active);
      } else {
        console.log('[FRONTEND_QR] no_qr', { active: qrRes?.active, waState: statusRes?.waState });
      }
      setQrData(qrRes);
      setWaStatus(statusRes);
      // Auto-close once connected (ready OR recovering — both mean session is live)
      const stableConnected = statusRes?.connected ||
        ['ready', 'authenticated'].includes(statusRes?.waState);
      if (stableConnected) {
        clearInterval(pollRef.current);
        setTimeout(onClose, 1_500);
      }
    } catch { /* poll silently */ }
  }, [numberId, onClose]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5_000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  const connected = waStatus?.connected || ['ready', 'authenticated'].includes(waStatus?.waState);
  const qrActive = qrData?.active && qrData?.qr;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, minWidth: 340, maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Pair WhatsApp</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{numberPhone}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>✕</button>
        </div>

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
              QR refreshes automatically · Polling every 5s
            </div>
          </>
        ) : waStatus?.booting || waStatus?.waState === 'booting' ? (
          <div style={{ padding: '24px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>Starting WhatsApp…</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>QR will appear shortly</div>
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

// ── Health Trend Panel ────────────────────────────────────────────────────────

function TrendPanel({ numberId, onClose }) {
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/health-trend`)
      .then((r) => r.json())
      .then(setTrend)
      .catch(() => setTrend([]))
      .finally(() => setLoading(false));
  }, [numberId]);

  const maxSent = trend ? Math.max(...trend.map((d) => d.sent || 0), 1) : 1;

  return (
    <div style={{ background: '#f8fafc', borderTop: '2px solid #e0f2fe', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#075985' }}>7-DAY HEALTH TREND</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6b7280' }}>✕</button>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#6b7280' }}>Loading…</div>
      ) : !trend || trend.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6b7280' }}>No data for the past 7 days.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                {['Date', 'Sent', 'Delivered', 'Read', 'Replied', 'Failed', 'Volume'].map((h) => (
                  <th key={h} style={{ padding: '4px 10px', textAlign: h === 'Date' || h === 'Volume' ? 'left' : 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((day) => (
                <tr key={day.date}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{day.date}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#0d6efd', fontWeight: 700 }}>{day.sent}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#0891b2' }}>{day.delivered}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#7c3aed' }}>{day.read}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>{day.replied}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: day.failed > 0 ? '#dc3545' : '#9ca3af' }}>{day.failed}</td>
                  <td style={{ padding: '6px 10px', minWidth: 120 }}>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((day.sent / maxSent) * 100)}%`, background: '#0d6efd', borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Number Row ────────────────────────────────────────────────────────────────

function NumberRow({ num, onAction, trendOpen, onToggleTrend }) {
  const [waStatus,       setWaStatus]       = useState(null);
  const [stableUiStatus, setStableUiStatus] = useState('IDLE');
  const [busy, setBusy] = useState(false);
  const [limitEdit, setLimitEdit] = useState('');
  const [limitDirty, setLimitDirty] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const statusPollRef        = useRef(null);
  const prevStableRef        = useRef('IDLE');
  const unhealthyCountRef    = useRef(0);
  const disconnectedSinceRef = useRef(null);
  // Timestamp of the first non-CONNECTED poll after being CONNECTED.
  // Used with DISCONNECT_GRACE_MS to prevent polling storms from downgrading the UI.
  const disconnectGraceRef   = useRef(null);

  const pollStatus = useCallback(async () => {
    if (document.hidden) return;
    try {
      const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${num.id}/status`);
      if (!r.ok) return;
      const data = await r.json();
      const rawMapped = rawToMapped(data?.waState ?? 'idle');

      if (rawMapped === 'CONNECTED') {
        unhealthyCountRef.current    = 0;
        disconnectedSinceRef.current = null;
        disconnectGraceRef.current   = null;
      } else if (prevStableRef.current === 'CONNECTED') {
        unhealthyCountRef.current += 1;
        // Record the first moment we saw a non-CONNECTED response — grace timer starts here.
        if (!disconnectGraceRef.current) disconnectGraceRef.current = Date.now();
        if (rawMapped === 'DISCONNECTED' && !disconnectedSinceRef.current) {
          disconnectedSinceRef.current = Date.now();
        }
      }

      const newStable = deriveStableStatus(
        prevStableRef.current, data,
        unhealthyCountRef.current, disconnectedSinceRef.current,
        disconnectGraceRef.current,
      );

      // Temporary diagnostics — remove once synchronization is confirmed stable.
      console.log('[WA_UI_STATE]', {
        numberId:          num.id,
        previousState:     prevStableRef.current,
        polledState:       data?.waState,
        finalRenderedState: newStable,
        clientExists:      data?.clientExists,
        browserConnected:  data?.browserConnected,
        unhealthyCount:    unhealthyCountRef.current,
        graceMs:           disconnectGraceRef.current ? Date.now() - disconnectGraceRef.current : null,
      });

      prevStableRef.current = newStable;
      setWaStatus(data);
      setStableUiStatus(newStable);
    } catch { /* silent */ }
  }, [num.id]);

  // Stable 15s polling interval — must NOT depend on waStatus?.waState.
  // A dependency on waState caused the interval to restart on every state change,
  // creating rapid-fire polls that exhausted the UNHEALTHY_THRESHOLD grace in
  // milliseconds and instantly showed "Connect" on any transient backend response.
  useEffect(() => {
    pollStatus();
    statusPollRef.current = setInterval(pollStatus, 15_000);
    return () => clearInterval(statusPollRef.current);
  }, [pollStatus]);

  const doAction = async (action) => {
    setBusy(true);
    try {
      await onAction(num.id, num.phone, action);
      await pollStatus();
    } finally {
      setBusy(false);
    }
  };

  const saveLimit = async () => {
    if (!limitDirty) return;
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

  const connected = stableUiStatus === 'CONNECTED';
  const booting   = waStatus?.booting || waStatus?.waState === 'booting';
  const qrActive  = waStatus?.qrActive;
  const canConnect = !connected && !['CONNECTING', 'QR_READY'].includes(stableUiStatus);

  return (
    <>
      {qrOpen && (
        <QrModal
          numberId={num.id}
          numberPhone={num.phone}
          onClose={() => { setQrOpen(false); pollStatus(); }}
        />
      )}
      <React.Fragment>
        <tr style={{ background: busy ? '#f8fafc' : '#fff' }}>
          {/* Name + Phone */}
          <td style={td}>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{num.name || '—'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginTop: 2 }}>{num.phone}</div>
          </td>

          {/* Live WA Connection State */}
          <td style={td}>
            <WaStateBadge stableStatus={stableUiStatus} />
            {waStatus?.lastReadyAt && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                Since {formatTime(waStatus.lastReadyAt)}
              </div>
            )}
          </td>

          {/* Engine Status (active/paused for queue) */}
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

          {/* Actions */}
          <td style={td}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {/* Connect / QR */}
              {canConnect && (
                <button
                  style={btn('#0d6efd', '#fff', busy)}
                  disabled={busy}
                  onClick={() => { doAction('connect'); setQrOpen(true); }}
                >
                  Connect
                </button>
              )}
              {(connected || qrActive || booting) && (
                <button
                  style={btn('#6366f1', '#fff', busy)}
                  disabled={busy}
                  onClick={() => setQrOpen(true)}
                >
                  {qrActive ? 'View QR' : 'Status'}
                </button>
              )}
              {connected && (
                <button
                  style={btn('#f3f4f6', '#374151', busy)}
                  disabled={busy}
                  onClick={() => doAction('disconnect')}
                >
                  Disconnect
                </button>
              )}
              {/* Reset session */}
              <button
                style={btn('#fee2e2', '#991b1b', busy)}
                disabled={busy}
                title="Wipe session — generates fresh QR"
                onClick={() => doAction('reset')}
              >
                Reset
              </button>
              {/* Engine queue pause/resume */}
              <button
                style={btn(num.is_active ? '#fef9c3' : '#dcfce7', num.is_active ? '#854d0e' : '#166534', busy)}
                disabled={busy}
                onClick={() => doAction('toggle')}
              >
                {num.is_active ? 'Pause' : 'Resume'}
              </button>
              {/* Trend */}
              <button
                style={btn(trendOpen ? '#0d6efd' : '#f3f4f6', trendOpen ? '#fff' : '#374151')}
                onClick={onToggleTrend}
              >
                Trend
              </button>
            </div>
          </td>
        </tr>

        {trendOpen && (
          <tr>
            <td colSpan={8} style={{ padding: 0 }}>
              <TrendPanel numberId={num.id} onClose={onToggleTrend} />
            </td>
          </tr>
        )}
      </React.Fragment>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WaNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [trendOpenId, setTrendOpenId] = useState(null);

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/marketing/whatsapp-engine/numbers');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const d = await res.json();
      setNumbers(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e?.message || 'Failed to load numbers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNumbers(); }, [loadNumbers]);
  // Lightweight DB refresh (live WA state is polled per-row; this catches limit/status edits)
  useEffect(() => {
    const t = setInterval(loadNumbers, 30_000);
    return () => clearInterval(t);
  }, [loadNumbers]);

  const handleAction = useCallback(async (numberId, phone, action) => {
    if (action === 'reload') { await loadNumbers(); return; }
    try {
      if (action === 'connect') {
        const r = await apiFetch(`/marketing/whatsapp-engine/numbers/${numberId}/connect`, { method: 'POST' });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
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
          <button style={btn('#fd7e14', '#fff', resetting)} onClick={resetDaily} disabled={resetting}>
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

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', marginBottom: 16, color: '#dc3545' }}>
            {error} <button style={{ ...btn('#dc3545'), marginLeft: 12 }} onClick={loadNumbers}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6c757d' }}>Loading numbers…</div>
        ) : numbers.length === 0 ? (
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
                {numbers.map((num) => (
                  <NumberRow
                    key={num.id}
                    num={num}
                    onAction={handleAction}
                    trendOpen={trendOpenId === num.id}
                    onToggleTrend={() => setTrendOpenId(trendOpenId === num.id ? null : num.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Sessions are manual-only — click Connect to start. Status polls every 15s per row. Pauses when tab is hidden. Edit limit inline (Enter to save). Reset wipes LocalAuth — phone must re-scan QR.
        </div>
      </div>
    </PageLayout>
  );
}

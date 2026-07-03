import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { apiFetch } from '../utils/api';

const VAPID_KEY   = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const TOKEN_KEY   = 'fcm_device_token';
const SW_PATH     = '/firebase-messaging-sw.js';

// ── Public: initFCM ───────────────────────────────────────────────────────────
//
// Call once after the user authenticates.
// - Requests notification permission (shows browser prompt once)
// - Registers the service worker
// - Obtains an FCM device token
// - POSTs the token to POST /push/register so the backend can push to this device
// - Registers onMessage for foreground messages (deduped with socket)
//
// onForegroundMessage(payload) — optional callback for in-app toast when
// the browser tab is focused. The socket already handles new notifications
// in-app; this is a safety net for cases where the socket is disconnected.

export async function initFCM(onForegroundMessage) {
  if (typeof Notification === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return; // FCM not configured or not supported by this browser

  // Register service worker (idempotent — browser caches the registration)
  let swReg;
  try {
    swReg = await navigator.serviceWorker.register(SW_PATH);
  } catch {
    return; // SW registration failed (e.g. service worker file not yet configured)
  }

  // Request browser notification permission
  const permission = await Notification.requestPermission().catch(() => 'denied');
  if (permission !== 'granted') return;

  // Get FCM device token
  let token;
  try {
    token = await getToken(messaging, {
      vapidKey:           VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
  } catch {
    return; // Token fetch failed (e.g. VAPID key not yet configured)
  }
  if (!token) return;

  // Register with backend — only POST if the token is new or changed
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored !== token) {
    try {
      const res = await apiFetch('/push/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, platform: 'web' }),
      });
      if (res.ok || res.status === 204) {
        localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      // Non-fatal: next login will retry
    }
  }

  // Foreground message handler — fires when tab is focused
  // The socket already delivers the notification; this fires a callback for
  // any additional UI treatment (e.g. audible alert, banner toast).
  if (typeof onForegroundMessage === 'function') {
    onMessage(messaging, onForegroundMessage);
  }
}

// ── Public: deregisterFCM ────────────────────────────────────────────────────
//
// Call on explicit logout. Removes the token from the backend so push
// is not sent to this device after sign-out.

export async function deregisterFCM() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await apiFetch('/push/token', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
  } catch {
    // Non-fatal
  }
  localStorage.removeItem(TOKEN_KEY);
}

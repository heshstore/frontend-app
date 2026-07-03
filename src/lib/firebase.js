import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const {
  REACT_APP_FIREBASE_API_KEY,
  REACT_APP_FIREBASE_AUTH_DOMAIN,
  REACT_APP_FIREBASE_PROJECT_ID,
  REACT_APP_FIREBASE_STORAGE_BUCKET,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  REACT_APP_FIREBASE_APP_ID,
} = process.env;

// FCM is disabled gracefully when env vars are absent.
// The rest of the app (socket.io notifications) continues working.
const isFcmConfigured = !!(
  REACT_APP_FIREBASE_API_KEY &&
  REACT_APP_FIREBASE_PROJECT_ID &&
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID &&
  REACT_APP_FIREBASE_APP_ID &&
  !REACT_APP_FIREBASE_API_KEY.startsWith('REPLACE_')
);

let _app = null;
let _messaging = null;

export function getFirebaseApp() {
  if (!isFcmConfigured) return null;
  if (!_app) {
    const apps = getApps();
    _app = apps.length
      ? apps[0]
      : initializeApp({
          apiKey:            REACT_APP_FIREBASE_API_KEY,
          authDomain:        REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId:         REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket:     REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId:             REACT_APP_FIREBASE_APP_ID,
        });
  }
  return _app;
}

export async function getFirebaseMessaging() {
  if (!isFcmConfigured) return null;
  if (_messaging) return _messaging;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  _messaging = getMessaging(app);
  return _messaging;
}

// Firebase Cloud Messaging — background push handler
// This file runs as a Service Worker and handles push notifications
// when the app is closed or in the background.
//
// SETUP: Replace the placeholder values below with your Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps → SDK snippet
//
// After filling in the config, also set these env vars in the backend .env:
//   FIREBASE_SERVICE_ACCOUNT_JSON=<contents of your serviceAccountKey.json>
//   DOMAIN=crmhesh.duckdns.org
//
// And these in the frontend .env:
//   REACT_APP_FIREBASE_API_KEY=...
//   REACT_APP_FIREBASE_AUTH_DOMAIN=...
//   REACT_APP_FIREBASE_PROJECT_ID=...
//   REACT_APP_FIREBASE_STORAGE_BUCKET=...
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
//   REACT_APP_FIREBASE_APP_ID=...
//   REACT_APP_FIREBASE_VAPID_KEY=...  (from Firebase Console → Cloud Messaging → Web Push certificates)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase config (fill in from Firebase Console) ───────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyB0aq4YlJI3JJmUk3QF-zqIW0QHxfPY7h4',
  authDomain:        'saachi-16d7b.firebaseapp.com',
  projectId:         'saachi-16d7b',
  storageBucket:     'saachi-16d7b.firebasestorage.app',
  messagingSenderId: '299817092820',
  appId:             '1:299817092820:web:2dac7704cd727d89cb9d41',
};

// Guard: do not initialize if config has not been filled in yet.
const isConfigured = Object.values(firebaseConfig).every(v => !v.startsWith('REPLACE_'));

if (isConfigured) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ── Background message handler ─────────────────────────────────────────────
  // Called when the app is closed or in the background.
  messaging.onBackgroundMessage(function (payload) {
    const title = payload.notification?.title || 'Saachu';
    const body  = payload.notification?.body  || '';
    const link  = payload.data?.link || payload.fcmOptions?.link || '/';

    self.registration.showNotification(title, {
      body,
      icon:  '/logo192.png',
      badge: '/favicon.ico',
      data:  { link },
      requireInteraction: payload.data?.priority === 'CRITICAL',
    });
  });
}

// ── Notification click → open/focus the app ───────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      // If an app window is already open, focus it and navigate
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) {
          list[i].focus();
          list[i].navigate(link);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    }),
  );
});

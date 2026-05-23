'use strict';

// ─── Boot environment diagnostics ────────────────────────────────────────────
// Printed before webpack starts so any future HOST leakage is immediately visible.
const hostRaw = process.env.HOST;
console.log('[FRONTEND_BOOT]');
console.log(`  HOST     = ${hostRaw !== undefined ? JSON.stringify(hostRaw) : '(not set)'}`);
console.log(`  NODE_ENV = ${process.env.NODE_ENV ?? '(not set)'}`);
console.log(`  PORT     = ${process.env.PORT ?? '(not set)'}`);

// ─── HOST sanitization ────────────────────────────────────────────────────────
// React Scripts 5 + webpack-dev-server v4 crash when HOST is a machine-specific
// hostname (e.g. macOS injects HOST=Bhavins-MacBook-Air.local via PAM/system env).
//
// Root cause chain:
//   HOST='*.local'
//   → prepareUrls() sees host !== '0.0.0.0' → isUnspecifiedHost=false
//   → lanUrlForConfig stays undefined
//   → createDevServerConfig(proxy, undefined) → allowedHosts: [undefined]
//   → webpack-dev-server schema: allowedHosts[0] should be a non-empty string
//   → CRASH
//
// Fix: if HOST is not a known-safe bind address, delete it so CRA falls back to
// '0.0.0.0' (the isUnspecifiedHost path), which resolves lanUrlForConfig to the
// actual LAN IP and satisfies the schema.
const SAFE_HOST_VALUES = new Set(['', '0.0.0.0', '::', 'localhost', '127.0.0.1']);

if (hostRaw !== undefined && !SAFE_HOST_VALUES.has(hostRaw)) {
  console.warn(
    `[FRONTEND_BOOT] WARNING: HOST="${hostRaw}" is not a safe webpack-dev-server bind address.\n` +
    `  Clearing HOST so CRA defaults to 0.0.0.0 — this fixes the allowedHosts schema error.\n` +
    `  This is automatic and safe. No manual terminal command needed.`
  );
  delete process.env.HOST;
}

// ─── Hand off to react-scripts start ─────────────────────────────────────────
require('react-scripts/scripts/start');

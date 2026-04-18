/**
 * API base URL (no trailing slash).
 * - Development: default "" so requests go to the same origin as the React app and
 *   CRA's "proxy" forwards them to the Nest backend (avoids CORS / wrong port).
 * - Production: set REACT_APP_API_URL at build time, e.g. https://api.yourdomain.com
 */
const fromEnv = process.env.REACT_APP_API_URL;
export const API_URL =
  fromEnv != null && String(fromEnv).trim() !== ""
    ? String(fromEnv).replace(/\/$/, "")
    : process.env.NODE_ENV === "development"
      ? ""
      : "http://localhost:4000";

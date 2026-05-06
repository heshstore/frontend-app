/**
 * API base URL (no trailing slash).
 * Set REACT_APP_API_URL in .env.production (prod build) or .env (dev).
 * e.g. REACT_APP_API_URL=https://backend-service-xady.onrender.com
 */
export const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

// Visible in browser console — confirms which backend the build is talking to
console.log(
  `[API] base URL: "${API_URL || "(empty — relative paths)"}" | env: ${process.env.NODE_ENV}`,
);

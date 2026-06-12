// Proxy disabled — all API calls use the absolute URL from config.js (API_URL).
// The proxy is no longer needed and was causing browser navigation requests
// (document type) to /crm/leads/:id to be forwarded to NestJS without an
// Authorization header, resulting in 401 on page refresh.
module.exports = function () {};

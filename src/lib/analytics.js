const GA_ID  = process.env.REACT_APP_GA4_ID;
const GTM_ID = process.env.REACT_APP_GTM_ID;
const AW_ID  = process.env.REACT_APP_GOOGLE_ADS_ID;

// ── Initialisation ────────────────────────────────────────────────────────────

export function initGA() {
  if (!GA_ID || typeof document === 'undefined') return;
  if (document.getElementById('ga4-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });

  const s = document.createElement('script');
  s.id    = 'ga4-script';
  s.async = true;
  s.src   = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function initGTM() {
  if (!GTM_ID || typeof document === 'undefined') return;
  if (document.getElementById('gtm-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const s = document.createElement('script');
  s.id    = 'gtm-script';
  s.async = true;
  s.src   = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);

  const ns     = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src              = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
  iframe.height           = '0';
  iframe.width            = '0';
  iframe.style.cssText    = 'display:none;visibility:hidden';
  ns.appendChild(iframe);
  if (document.body) document.body.prepend(ns);
}

// ── Page tracking ─────────────────────────────────────────────────────────────

export function trackPageView(path) {
  if (!GA_ID || typeof window.gtag !== 'function') return;
  window.gtag('config', GA_ID, { page_path: path });
}

// ── Event helpers ─────────────────────────────────────────────────────────────

export function trackLeadSubmit(data) {
  const payload = data || {};
  pushDataLayer('lead_submit', payload);
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'generate_lead', {
    event_category: 'Lead',
    event_label:    payload.source || 'manual',
    value:          1,
    utm_source:     payload.utm_source,
    utm_campaign:   payload.utm_campaign,
  });
}

export function trackWhatsAppClick(data) {
  const payload = data || {};
  pushDataLayer('whatsapp_click', payload);
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'whatsapp_click', {
    event_category: 'Engagement',
    event_label:    payload.context || payload.source || 'crm',
  });
}

export function trackQuotationCreated(data) {
  const payload = data || {};
  pushDataLayer('quotation_created', payload);
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'quotation_created', {
    event_category: 'Sales',
    value:          payload.value || 0,
    currency:       'INR',
    lead_id:        payload.lead_id,
  });
}

export function trackOrderCreated(data) {
  const payload = data || {};
  pushDataLayer('order_created', payload);
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'purchase', {
    event_category:  'Sales',
    transaction_id:  payload.order_id,
    value:           payload.value || 0,
    currency:        'INR',
  });
}

// ── Google Ads conversion ─────────────────────────────────────────────────────

export function trackGoogleAdsConversion(label, value) {
  if (!AW_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to:  `${AW_ID}/${label}`,
    value:    value || 0,
    currency: 'INR',
  });
}

// ── GTM data layer ────────────────────────────────────────────────────────────

export function pushDataLayer(eventName, payload) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...(payload || {}) });
}

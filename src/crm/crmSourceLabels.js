/**
 * Business-friendly display labels for CRM lead sources.
 *
 * Internal enum values (SHOPIFY, META, GOOGLE, etc.) are NEVER changed here —
 * they remain as-is in the DB, analytics, filters, and automation.
 * This file only controls what telecallers and customers SEE.
 *
 * Rule: one source of truth. No component should define its own SOURCE_LABELS.
 */
export const SOURCE_LABELS = {
  // Digital / inbound
  SHOPIFY:          'Website',          // customers say "your website", not "Shopify"
  META:             'Facebook',         // telecallers say "Facebook ad"
  GOOGLE:           'Google',
  LINKEDIN:         'LinkedIn',
  WHATSAPP:         'WhatsApp',
  INDIAMART:        'IndiaMart',
  DIRECT:           'Direct',
  // Manual / high-trust
  WALK_IN:          'Walk-In',
  REFERRAL:         'Reference',        // Indian business norm
  EXHIBITION:       'Exhibition',
  FIELD_VISIT:      'Field Visit',
  OLD_CUSTOMER:     'Old Customer',
  DEALER_REFERENCE: 'Dealer Reference',
  BUSINESS_CARD:    'Business Card',
  IMPORTED:         'Imported',
  // Legacy aliases (older DB rows / older client versions)
  META_ADS:         'Facebook',
  GOOGLE_ADS:       'Google',
  MANUAL:           'Direct',
  DIRECT_CALL:      'Direct',
};

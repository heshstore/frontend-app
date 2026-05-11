import React from 'react';

/* Centralised status → colour mapping.
   Keys are uppercase so callers can pass any case. */
const STATUS_MAP = {
  /* Quotation */
  DRAFT:            { label: 'Draft',            bg: '#f3f4f6', color: '#6b7280' },
  GENERATED:        { label: 'Generated',        bg: '#dbeafe', color: '#1d4ed8' },
  CANCELLED:        { label: 'Cancelled',        bg: '#fee2e2', color: '#dc2626' },
  CONVERTED:        { label: 'Converted',        bg: '#dbeafe', color: '#0066B3' },
  /* Order */
  PENDING_APPROVAL: { label: 'Pending approval', bg: '#fef9c3', color: '#a16207' },
  IN_PRODUCTION:    { label: 'In production',    bg: '#ede9fe', color: '#6d28d9' },
  PRODUCTION:       { label: 'In production',    bg: '#ede9fe', color: '#6d28d9' },
  READY:            { label: 'Ready',            bg: '#e0f2fe', color: '#0891b2' },
  DISPATCHED:       { label: 'Dispatched',       bg: '#dbeafe', color: '#1d4ed8' },
  /* Lead */
  NEW:              { label: 'New',              bg: '#dbeafe', color: '#1d4ed8' },
  CONTACTED:        { label: 'Contacted',        bg: '#ede9fe', color: '#6d28d9' },
  QUALIFIED:        { label: 'Qualified',        bg: '#dcfce7', color: '#15803d' },
  LOST:             { label: 'Lost',             bg: '#fee2e2', color: '#dc2626' },
  WON:              { label: 'Won',              bg: '#dcfce7', color: '#15803d' },
  /* Pricing type */
  WHOLESALER:       { label: 'Wholesaler',       bg: '#fef9c3', color: '#a16207' },
  RETAILER:         { label: 'Retailer',         bg: '#dbeafe', color: '#1e40af' },
  /* Generic */
  ACTIVE:           { label: 'Active',           bg: '#dcfce7', color: '#15803d' },
  INACTIVE:         { label: 'Inactive',         bg: '#f3f4f6', color: '#6b7280' },
  PENDING:          { label: 'Pending',          bg: '#fef9c3', color: '#a16207' },
  COMPLETED:        { label: 'Completed',        bg: '#dcfce7', color: '#15803d' },
  /* Shopify sync */
  READY_SYNC:       { label: 'Ready',            bg: '#dcfce7', color: '#15803d' },
  NEEDS_CONFIG:     { label: 'Needs config',     bg: '#fef9c3', color: '#a16207' },
};

/**
 * Universal status badge.
 *
 * Props:
 *   status  — one of the keys in STATUS_MAP (case-insensitive)
 *   label   — override the display label
 *   size    — 'xs' | 'sm' (default 'sm')
 */
export default function StatusBadge({ status, label, size = 'sm' }) {
  const key    = (status || '').toUpperCase().replace(/ /g, '_');
  const config = STATUS_MAP[key] || { label: status || '—', bg: '#f3f4f6', color: '#6b7280' };
  const text   = label || config.label;

  return (
    <span style={{
      fontSize:     size === 'xs' ? 10 : 11,
      fontWeight:   700,
      padding:      size === 'xs' ? '1px 6px' : '2px 8px',
      borderRadius: 4,
      background:   config.bg,
      color:        config.color,
      whiteSpace:   'nowrap',
      display:      'inline-block',
      lineHeight:   1.5,
    }}>
      {text}
    </span>
  );
}

/** Pricing type badge (Wholesaler / Retailer). */
export function PricingBadge({ isWholesaler, size = 'xs' }) {
  return (
    <StatusBadge
      status={isWholesaler ? 'WHOLESALER' : 'RETAILER'}
      size={size}
    />
  );
}

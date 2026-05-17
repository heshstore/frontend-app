import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';

const FLAG_CONFIG = {
  REPEAT_CUSTOMER:   { label: 'Repeat Customer', bg: '#dcfce7', color: '#15803d' },
  HIGH_VALUE:        { label: 'High Value',       bg: '#fef9c3', color: '#854d0e' },
  PAYMENT_OVERDUE:   { label: 'Payment Overdue',  bg: '#fee2e2', color: '#b91c1c' },
  AMC_ACTIVE:        { label: 'AMC Active',        bg: '#ede9fe', color: '#6d28d9' },
  SERVICE_RISK:      { label: 'Open Ticket',       bg: '#fff7ed', color: '#c2410c' },
  INACTIVE_CUSTOMER: { label: 'Inactive',          bg: '#f3f4f6', color: '#4b5563' },
  FREQUENT_BUYER:    { label: 'Frequent Buyer',    bg: '#dbeafe', color: '#1d4ed8' },
};

function inr(n) {
  if (!n || n === 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function daysLabel(d) {
  if (d === null || d === undefined) return 'Never';
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
}

function getGuidance(flags, finance, service, commercial) {
  if (flags.includes('PAYMENT_OVERDUE'))
    return {
      text: 'Outstanding payment pending — coordinate with accounts before committing to a new order.',
      bg: '#fef2f2', color: '#991b1b', border: '#fca5a5',
    };
  if (flags.includes('SERVICE_RISK'))
    return {
      text: 'Open service tickets exist — ask about service experience before pitching new products.',
      bg: '#fff7ed', color: '#9a3412', border: '#fed7aa',
    };
  if (flags.includes('HIGH_VALUE') && flags.includes('REPEAT_CUSTOMER'))
    return {
      text: 'High value repeat buyer — prioritize fast response and skip basic qualification.',
      bg: '#f0fdf4', color: '#15803d', border: '#86efac',
    };
  if (flags.includes('INACTIVE_CUSTOMER'))
    return {
      text: 'Inactive customer — focus conversation on reactivation and understanding reason for gap.',
      bg: '#fef3c7', color: '#92400e', border: '#fde68a',
    };
  if (flags.includes('AMC_ACTIVE'))
    return {
      text: 'AMC customer — existing service relationship established, use this as a warm entry point.',
      bg: '#f5f3ff', color: '#5b21b6', border: '#c4b5fd',
    };
  if (flags.includes('FREQUENT_BUYER'))
    return {
      text: 'Frequent buyer — skip intro, confirm requirements and latest product availability.',
      bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe',
    };
  if (flags.includes('REPEAT_CUSTOMER'))
    return {
      text: 'Existing customer — confirm last order status and current requirements before pitching.',
      bg: '#f0fdf4', color: '#166534', border: '#bbf7d0',
    };
  if (commercial.pendingQuotations > 0)
    return {
      text: 'Pending quotation in system — confirm if this is a follow-up before creating a new one.',
      bg: '#fef3c7', color: '#92400e', border: '#fde68a',
    };
  return null;
}

function StatCard({ value, label, valueColor = '#111', bg = '#fafafa', border = theme.border }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: '10px 12px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.1 }}>{value}</div>
      <div style={{
        fontSize: 10, color: theme.textMuted, marginTop: 3,
        textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600,
      }}>
        {label}
      </div>
    </div>
  );
}

function QBtn({ label, onClick, bg, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '9px 6px',
        background: bg,
        color,
        border: 'none',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'center',
        lineHeight: 1.3,
        minWidth: 0,
      }}
    >
      {label}
    </button>
  );
}

/** Compact badge strip — used in LeadQueue cards and WorkMode top bar */
export function CustomerFlagBadges({ flags, limit = 3 }) {
  if (!flags || flags.length === 0) return null;
  const shown = flags.slice(0, limit);
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {shown.map((f) => {
        const cfg = FLAG_CONFIG[f] || { label: f, bg: '#f3f4f6', color: '#374151' };
        return (
          <span key={f} style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px',
            borderRadius: 8, background: cfg.bg, color: cfg.color,
          }}>
            {cfg.label}
          </span>
        );
      })}
      {flags.length > limit && (
        <span style={{ fontSize: 10, color: theme.textMuted, alignSelf: 'center' }}>
          +{flags.length - limit}
        </span>
      )}
    </div>
  );
}

/** Compact 2-line context for WorkMode idle panel */
export function WorkModeCustomerContext({ match }) {
  if (!match) return null;
  const { customer, commercial, finance, service, flags } = match;
  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac',
      borderRadius: 8, padding: '10px 14px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Existing Customer
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginTop: 2 }}>{customer.companyName}</div>
          <div style={{ fontSize: 12, color: '#374151' }}>{customer.city}</div>
        </div>
        <CustomerFlagBadges flags={flags} limit={2} />
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#374151', flexWrap: 'wrap' }}>
        {commercial.totalOrders > 0 && (
          <span>Orders: <strong>{commercial.totalOrders}</strong> · Last: <strong>{daysLabel(service.daysSinceLastOrder)}</strong></span>
        )}
        {finance.outstanding > 0 && (
          <span style={{ color: finance.overdue > 0 ? '#b91c1c' : '#374151' }}>
            Outstanding: <strong>{inr(finance.outstanding)}</strong>
            {finance.overdue > 0 && <span style={{ color: '#b91c1c' }}> (overdue)</span>}
          </span>
        )}
        {service.activeAmc > 0 && <span style={{ color: '#6d28d9' }}>AMC active</span>}
        {service.openTickets > 0 && (
          <span style={{ color: '#c2410c' }}>
            {service.openTickets} open ticket{service.openTickets > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {commercial.recentProducts.length > 0 && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          Recent: {commercial.recentProducts.join(', ')}
        </div>
      )}
    </div>
  );
}

/** Full intelligence panel — used in LeadDetail. Always starts collapsed; manual tap to expand. */
export default function CustomerIntelPanel({ match, leadId }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  if (match === undefined) return (
    <div style={{ fontSize: 11, color: '#9ca3af', padding: '4px 0 10px', fontStyle: 'italic' }}>
      Checking customer history…
    </div>
  );
  if (!match) return null;

  const { customer, commercial, finance, service, flags, matchedBy,
          identity_confidence, channels = [], salesmen = [], ownership = {}, health = {} } = match;
  const guidance     = getGuidance(flags, finance, service, commercial);
  const hasOverdue   = finance.overdue > 0;
  const headerBorder = hasOverdue ? '#fca5a5' : '#86efac';
  const headerBg     = hasOverdue ? '#fef2f2' : '#f0fdf4';

  return (
    <div style={{
      border: `1.5px solid ${headerBorder}`,
      borderRadius: 10,
      marginBottom: 16,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* ── Header — always visible, fully tappable ─────────────── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ background: headerBg, padding: '11px 14px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: hasOverdue ? '#b91c1c' : '#15803d',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Existing Customer
              </span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>via {matchedBy}</span>
              {identity_confidence && (() => {
                const confCfg = {
                  EXACT:  { label: 'EXACT',  bg: '#dcfce7', color: '#15803d' },
                  HIGH:   { label: 'HIGH',   bg: '#dbeafe', color: '#1d4ed8' },
                  MEDIUM: { label: 'MEDIUM', bg: '#fef3c7', color: '#92400e' },
                  LOW:    { label: 'LOW',    bg: '#f3f4f6', color: '#6b7280' },
                }[identity_confidence] || { label: identity_confidence, bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 6, background: confCfg.bg, color: confCfg.color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {confCfg.label} match
                  </span>
                );
              })()}
              {health.grade && (() => {
                const hCfg = {
                  EXCELLENT: { bg: '#dcfce7', color: '#15803d' },
                  GOOD:      { bg: '#dbeafe', color: '#1d4ed8' },
                  RISK:      { bg: '#fff7ed', color: '#c2410c' },
                  CRITICAL:  { bg: '#fee2e2', color: '#b91c1c' },
                }[health.grade] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 6, background: hCfg.bg, color: hCfg.color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {health.grade}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
              {customer.companyName}
            </div>
            {customer.contactName && customer.contactName !== customer.companyName && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>{customer.contactName}</div>
            )}
            <div style={{ fontSize: 12, color: '#6b7280' }}>{customer.city}</div>
          </div>

          {/* Rotating chevron — no separate button needed; whole header is tappable */}
          <span style={{
            fontSize: 14, color: '#9ca3af', flexShrink: 0, marginTop: 2,
            display: 'inline-block',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease',
          }}>
            ▼
          </span>
        </div>

        {/* Flag badges — always visible regardless of collapse state */}
        {flags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
            {flags.map((f) => {
              const cfg = FLAG_CONFIG[f] || { label: f, bg: '#f3f4f6', color: '#374151' };
              return (
                <span key={f} style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 10,
                  background: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}33`,
                }}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Compact summary strip — visible only when collapsed */}
        {collapsed && (
          <div style={{
            marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap',
            alignItems: 'center', fontSize: 12, color: '#374151',
          }}>
            {commercial.totalValue > 0 && (
              <span style={{ fontWeight: 700, color: commercial.totalValue >= 100000 ? '#15803d' : '#374151' }}>
                {inr(commercial.totalValue)} lifetime
              </span>
            )}
            {commercial.totalOrders > 0 && (
              <span>{commercial.totalOrders} order{commercial.totalOrders !== 1 ? 's' : ''}</span>
            )}
            {service.daysSinceLastOrder !== null && (
              <span style={{ color: '#6b7280' }}>Last: {daysLabel(service.daysSinceLastOrder)}</span>
            )}
            {finance.outstanding > 0 && (
              <span style={{ fontWeight: 700, color: finance.overdue > 0 ? '#b91c1c' : '#92400e' }}>
                {inr(finance.outstanding)} outstanding{finance.overdue > 0 ? ' ⚠' : ''}
              </span>
            )}
            {commercial.totalOrders === 0 && commercial.totalValue === 0 && service.daysSinceLastOrder === null && (
              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No orders yet</span>
            )}
            <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 'auto' }}>Tap to expand</span>
          </div>
        )}
      </div>

      {/* ── Expandable body ─────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '12px 14px 14px' }}>

          {/* Ownership risk warning */}
          {ownership.warning && (ownership.risk === 'HIGH' || ownership.risk === 'MEDIUM') && (
            <div style={{
              background: ownership.risk === 'HIGH' ? '#fef2f2' : '#fff7ed',
              border: `1px solid ${ownership.risk === 'HIGH' ? '#fca5a5' : '#fed7aa'}`,
              borderRadius: 7,
              padding: '8px 12px',
              marginBottom: 10,
              fontSize: 11,
              color: ownership.risk === 'HIGH' ? '#991b1b' : '#92400e',
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              ⚠ {ownership.warning}
            </div>
          )}

          {/* Telecaller guidance */}
          {guidance && (
            <div style={{
              background: guidance.bg,
              border: `1px solid ${guidance.border}`,
              borderRadius: 7,
              padding: '8px 12px',
              marginBottom: 12,
              fontSize: 12,
              color: guidance.color,
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              {guidance.text}
            </div>
          )}

          {/* Stat cards — row 1: Lifetime Value + Outstanding */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <StatCard
              value={inr(commercial.totalValue)}
              label="Lifetime Value"
              valueColor={commercial.totalValue >= 100000 ? '#15803d' : '#111'}
              bg={commercial.totalValue >= 100000 ? '#f0fdf4' : '#fafafa'}
              border={commercial.totalValue >= 100000 ? '#86efac' : theme.border}
            />
            <StatCard
              value={inr(finance.outstanding)}
              label={finance.overdue > 0 ? 'Outstanding ⚠' : 'Outstanding'}
              valueColor={finance.overdue > 0 ? '#b91c1c' : finance.outstanding > 0 ? '#92400e' : '#9ca3af'}
              bg={finance.overdue > 0 ? '#fef2f2' : '#fafafa'}
              border={finance.overdue > 0 ? '#fca5a5' : theme.border}
            />
          </div>

          {/* Stat cards — row 2: Last Order + Total Orders */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <StatCard
              value={daysLabel(service.daysSinceLastOrder)}
              label="Last Order"
              valueColor={
                service.daysSinceLastOrder === null ? '#9ca3af'
                  : service.daysSinceLastOrder > 180 ? '#92400e'
                  : '#111'
              }
            />
            <StatCard
              value={String(commercial.totalOrders || 0)}
              label="Total Orders"
              valueColor={commercial.totalOrders >= 4 ? '#1d4ed8' : '#111'}
            />
          </div>

          {/* Commercial details */}
          {(commercial.recentProducts.length > 0 || commercial.lastOrderNo || commercial.pendingQuotations > 0) && (
            <div style={{
              background: '#fafafa',
              border: `1px solid ${theme.border}`,
              borderRadius: 7,
              padding: '9px 12px',
              marginBottom: 12,
            }}>
              {commercial.recentProducts.length > 0 && (
                <div style={{ marginBottom: commercial.lastOrderNo || commercial.pendingQuotations > 0 ? 6 : 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: theme.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
                  }}>
                    Recently Ordered
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {commercial.recentProducts.map((p, i) => (
                      <span key={i} style={{
                        fontSize: 11, background: '#e0f2fe', color: '#0369a1',
                        padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {commercial.lastOrderNo && (
                <div style={{ fontSize: 11, color: theme.textMuted }}>
                  Last order: <strong style={{ color: '#374151' }}>{commercial.lastOrderNo}</strong>
                </div>
              )}
              {commercial.pendingQuotations > 0 && (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#92400e',
                  background: '#fef3c7', padding: '3px 8px',
                  borderRadius: 5, display: 'inline-block',
                  marginTop: commercial.lastOrderNo ? 5 : 0,
                }}>
                  {commercial.pendingQuotations} pending quotation{commercial.pendingQuotations > 1 ? 's' : ''} — may be a re-enquiry
                </div>
              )}
            </div>
          )}

          {/* Service & AMC */}
          {(service.openTickets > 0 || service.activeAmc > 0) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {service.openTickets > 0 && (
                <div style={{
                  flex: 1, background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: 7, padding: '9px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c', lineHeight: 1 }}>
                    {service.openTickets}
                  </div>
                  <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600, lineHeight: 1.3 }}>
                    Open Service<br />Ticket{service.openTickets > 1 ? 's' : ''}
                  </div>
                </div>
              )}
              {service.activeAmc > 0 && (
                <div style={{
                  flex: 1, background: '#f5f3ff', border: '1px solid #c4b5fd',
                  borderRadius: 7, padding: '9px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', lineHeight: 1 }}>
                    {service.activeAmc}
                  </div>
                  <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600, lineHeight: 1.3 }}>
                    Active AMC<br />Contract{service.activeAmc > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversion Timeline Intelligence */}
          {match.conversionTimeline && (
            match.conversionTimeline.avgSalesCycleDays !== null ||
            match.conversionTimeline.mostCommonObjection !== null ||
            match.conversionTimeline.repeatLeadFrequency > 1
          ) && (() => {
            const ct = match.conversionTimeline;
            return (
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 7, padding: '9px 12px', marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#0369a1',
                  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7,
                }}>
                  Buying Pattern
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: ct.mostCommonObjection ? 7 : 0 }}>
                  {ct.avgSalesCycleDays !== null && (
                    <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0369a1' }}>{ct.avgSalesCycleDays}d</div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Avg Sales Cycle</div>
                    </div>
                  )}
                  {ct.convertedLeads > 0 && (
                    <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>{ct.convertedLeads}×</div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Converted</div>
                    </div>
                  )}
                  {ct.repeatLeadFrequency > 1 && (
                    <div style={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px', flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>{ct.totalLeads}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Total Leads</div>
                    </div>
                  )}
                </div>
                {ct.mostCommonObjection && (
                  <div style={{ fontSize: 11, color: '#374151' }}>
                    <span style={{ fontWeight: 700, color: '#9a3412' }}>Common objection: </span>
                    {ct.mostCommonObjection}
                    <span style={{ color: '#9ca3af', marginLeft: 4 }}>— known blocker, address proactively</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Channels + Salesmen */}
          {(channels.length > 0 || salesmen.length > 0) && (
            <div style={{
              background: '#fafafa', border: `1px solid ${theme.border}`,
              borderRadius: 7, padding: '9px 12px', marginBottom: 12,
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              {channels.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
                  }}>
                    Source Channels
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {channels.map((ch) => (
                      <span key={ch} style={{
                        fontSize: 11, background: '#e0e7ff', color: '#3730a3',
                        padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                      }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {salesmen.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
                  }}>
                    Salesmen Involved
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {salesmen.map((s) => (
                      <span key={s.id} style={{
                        fontSize: 11, background: '#f0fdf4', color: '#15803d',
                        padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                        border: '1px solid #86efac',
                      }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <QBtn
              label="View Customer"
              onClick={() => navigate('/customers')}
              bg={theme.primaryLight}
              color={theme.primary}
            />
            <QBtn
              label="View Orders"
              onClick={() => navigate('/orders')}
              bg="#eff6ff"
              color="#1d4ed8"
            />
            <QBtn
              label="View Payments"
              onClick={() => navigate('/accounts/outstanding')}
              bg={finance.overdue > 0 ? '#fef2f2' : '#f3f4f6'}
              color={finance.overdue > 0 ? '#b91c1c' : '#374151'}
            />
            <QBtn
              label="New Quotation"
              onClick={() => navigate(`/quotation?customerId=${customer.id}&leadId=${leadId}`)}
              bg="#f5f3ff"
              color="#6d28d9"
            />
          </div>
        </div>
      )}
    </div>
  );
}

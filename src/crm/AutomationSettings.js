import React, { useEffect, useState, useCallback } from 'react';
import PageLayout from '../components/layout/PageLayout';
import { apiFetch } from '../utils/api';
import { theme } from '../theme';
import { useCurrentUser } from '../utils/useCurrentUser';

const SETTINGS = [
  {
    key:      'automation.lead_greeting',
    label:    'Lead greeting WhatsApp',
    desc:     'Automatically sends a WhatsApp greeting to the customer when a new lead arrives from Meta Ads, IndiaMart, Google, or LinkedIn.',
    cronKey:  null,
    schedule: 'On every new lead',
  },
  {
    key:      'automation.followup_reminders',
    label:    'Follow-up reminders',
    desc:     'Sends WhatsApp + in-app reminders to salesmen when a lead\'s follow-up date is overdue. Also escalates NEW leads that have been uncontacted for 24+ hours.',
    cronKey:  'cron.followup_reminders.last_run',
    schedule: 'Every 30 min',
  },
  {
    key:      'automation.payment_followups',
    label:    'Payment follow-ups',
    desc:     'Sends daily reminders to salesmen for completed orders that still have a pending payment balance (after 3 days).',
    cronKey:  'cron.payment_followups.last_run',
    schedule: 'Daily at 10 AM',
  },
];

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: enabled ? '#16a34a' : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function AutomationSettings() {
  const { role } = useCurrentUser();
  const isAdmin = role === 'Admin' || role === 'COO';

  const [settings, setSettings]   = useState(null);
  const [saving, setSaving]        = useState(false);
  const [savedKey, setSavedKey]    = useState(null);
  const [error, setError]          = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/crm/leads/automation/settings');
      if (res.ok) setSettings(await res.json());
    } catch (e) {
      setError('Could not load settings');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key, value) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch('/crm/leads/automation/settings', {
        method: 'PUT',
        body:   JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Failed to save setting');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Automation Settings">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Automation Settings</h2>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>
            Control which automated actions run. Changes take effect immediately.
          </p>
          {!isAdmin && (
            <div style={{
              marginTop: 10, padding: '8px 12px', background: '#fef9c3',
              border: '1px solid #fde047', borderRadius: 6, fontSize: 13, color: '#854d0e',
            }}>
              View only — only Admins and COO can change automation settings.
            </div>
          )}
        </div>

        {error && (
          <div style={{
            marginBottom: 12, padding: '8px 12px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, color: '#b91c1c',
          }}>
            {error}
          </div>
        )}

        {!settings ? (
          <p style={{ color: theme.textMuted, fontSize: 13 }}>Loading...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SETTINGS.map((s) => {
              const enabled   = settings[s.key] !== false;
              const justSaved = savedKey === s.key;
              const lastRun   = s.cronKey ? settings[s.cronKey] : null;
              const ago       = timeAgo(lastRun);
              return (
                <div
                  key={s.key}
                  style={{
                    background: '#fff',
                    border: `1px solid ${justSaved ? '#86efac' : theme.border}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    transition: 'border-color 0.3s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                        background: enabled ? '#dcfce7' : '#f3f4f6',
                        color:      enabled ? '#15803d' : '#6b7280',
                        padding: '1px 6px', borderRadius: 3,
                      }}>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                      {justSaved && (
                        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Saved</span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                      {s.desc}
                    </p>
                    {/* Cron status row */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>
                        Schedule: <strong>{s.schedule}</strong>
                      </span>
                      {s.cronKey && (
                        <span style={{ fontSize: 11, color: ago ? '#0369a1' : theme.textMuted }}>
                          Last run:{' '}
                          <strong>
                            {ago || (enabled ? 'Not yet run' : '—')}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <Toggle
                    enabled={enabled}
                    onChange={(val) => toggle(s.key, val)}
                    disabled={!isAdmin || saving}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Status legend */}
        <div style={{
          marginTop: 24, padding: '12px 14px',
          background: theme.surface || '#f8fafc',
          border: `1px solid ${theme.border}`, borderRadius: 8,
          fontSize: 12, color: theme.textMuted, lineHeight: 1.7,
        }}>
          <strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: theme.text }}>How automation labels work</strong>
          <span style={{
            fontSize: 9, fontWeight: 700, background: '#e0f2fe', color: '#0369a1',
            padding: '1px 5px', borderRadius: 3, marginRight: 6,
          }}>AUTO</span>
          Notification or action triggered by the system — cron job or webhook.<br />
          <span style={{
            fontSize: 9, fontWeight: 700, background: '#f3f4f6', color: '#6b7280',
            padding: '1px 5px', borderRadius: 3, marginRight: 6,
          }}>MANUAL</span>
          Action taken by a team member.
        </div>
      </div>
    </PageLayout>
  );
}

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const ACTION_STYLE = {
  COMPLETE_DELAYED: { bg: '#fff1f0', border: '#dc3545', icon: '🚨', btnBg: '#dc3545' },
  START_URGENT:     { bg: '#fffbeb', border: '#f59e0b', icon: '⚡', btnBg: '#f59e0b' },
  START_NEXT:       { bg: '#eff6ff', border: '#3b82f6', icon: '👉', btnBg: '#007bff' },
  ALL_CLEAR:        { bg: '#f0fff4', border: '#28a745', icon: '✅', btnBg: '#28a745' },
};

const JOB_ROUTE  = (jobId) => `/production/jobs/${jobId}`;

export default function NextActionBanner() {
  const { nextAction, fetchNextAction } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNextAction();
  }, [fetchNextAction]);

  if (!nextAction) return null;

  const s    = ACTION_STYLE[nextAction.action] ?? ACTION_STYLE.START_NEXT;
  const dest = nextAction.job_id ? JOB_ROUTE(nextAction.job_id) : null;

  return (
    <div style={{
      background:   s.bg,
      border:       `1px solid ${s.border}`,
      borderRadius: 10,
      padding:      '14px 16px',
      marginBottom: 16,
      display:      'flex',
      alignItems:   'center',
      gap:          12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Next Best Action
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
          {nextAction.message}
        </div>
      </div>

      {nextAction.action !== 'ALL_CLEAR' && dest && (
        <button
          onClick={() => navigate(dest)}
          style={{
            background:   s.btnBg,
            color:        '#fff',
            border:       'none',
            borderRadius: 8,
            padding:      '10px 16px',
            fontSize:     14,
            fontWeight:   600,
            cursor:       'pointer',
            flexShrink:   0,
          }}
        >
          Go →
        </button>
      )}
    </div>
  );
}

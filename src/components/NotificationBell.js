import React from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount, notifications, setPanel, panelOpen } = useNotifications();

  const hasUrgent = notifications.some(
    n => !n.is_read && (n.priority === 'HIGH' || n.priority === 'CRITICAL'),
  );

  return (
    <>
      <style>{`
        @keyframes bellPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          20%       { transform: scale(1.18) rotate(-8deg); }
          40%       { transform: scale(1.18) rotate(8deg); }
          60%       { transform: scale(1.12) rotate(-5deg); }
          80%       { transform: scale(1.12) rotate(5deg); }
        }
      `}</style>
      <button
        onClick={() => setPanel(!panelOpen)}
        aria-label="Notifications"
        style={{
          position:   'relative',
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          padding:    '6px 8px',
          fontSize:   22,
          lineHeight: 1,
          animation:  hasUrgent ? 'bellPulse 1.8s ease-in-out infinite' : 'none',
          transformOrigin: 'top center',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position:   'absolute',
            top:        2,
            right:      2,
            background: hasUrgent ? '#b91c1c' : '#dc3545',
            color:      '#fff',
            fontSize:   10,
            fontWeight: 700,
            minWidth:   17,
            height:     17,
            borderRadius: 99,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:    '0 4px',
            boxShadow:  hasUrgent ? '0 0 0 3px rgba(185,28,28,0.25)' : 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}

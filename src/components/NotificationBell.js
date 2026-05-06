import React from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount, setPanel, panelOpen } = useNotifications();

  return (
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
      }}
    >
      🔔
      {unreadCount > 0 && (
        <span style={{
          position:   'absolute',
          top:        2,
          right:      2,
          background: '#dc3545',
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
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

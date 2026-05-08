import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const TABS = [
  { icon: '🔧', label: 'My Jobs',  href: '/production/my-jobs' },
  { icon: '📦', label: 'Orders',   href: '/orders'             },
  { icon: '👥', label: 'Leads',    href: '/crm/leads'          },
  { icon: '🔔', label: 'Alerts',   href: '/notifications'      },
  { icon: '☰',  label: 'More',     href: null                  },
];

export default function MobileNav({ onMore }) {
  const navigate            = useNavigate();
  const { pathname }        = useLocation();
  const { unreadCount }     = useNotifications();

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 64,
      background: '#ffffff',
      borderTop: '1px solid #e9ecef',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100,
    }}>
      {TABS.map(tab => {
        const active = tab.href && (
          pathname === tab.href ||
          pathname.startsWith(tab.href + '/')
        );
        const isAlerts = tab.href === '/notifications';

        return (
          <button
            key={tab.label}
            onClick={() => tab.href ? navigate(tab.href) : onMore?.()}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, flex: 1, height: '100%',
              background: 'none', border: 'none',
              cursor: 'pointer',
              color: active ? '#2563eb' : '#6b7280',
              fontSize: 10, fontWeight: active ? 700 : 500,
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, position: 'relative' }}>
              {tab.icon}
              {isAlerts && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#dc2626', color: '#fff',
                  fontSize: 8, fontWeight: 900,
                  minWidth: 14, height: 14, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 2px',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
            {active && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                width: 24, height: 3,
                background: '#2563eb',
                borderRadius: '3px 3px 0 0',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

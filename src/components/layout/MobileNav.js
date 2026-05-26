import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadPins } from '../../utils/navPins';
import { Ic } from '../ui/NavIcon';

// Match sidebar visual language exactly
const NAV_BG     = '#0f172a';
const NAV_BORDER = 'rgba(255,255,255,0.07)';
const ACTIVE_CLR = '#60a5fa';
const ACTIVE_BG  = 'rgba(96,165,250,0.16)';
const TEXT_CLR   = 'rgba(255,255,255,0.50)';

const DASHBOARD_TAB = { label: 'Home',  href: '/dashboard', icon: 'home' };
const MORE_TAB      = { label: 'More',  href: null,         icon: 'grid' };

export default function MobileNav({ onMore }) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const [pins, setPins] = useState(loadPins);

  useEffect(() => {
    const refresh = () => setPins(loadPins());
    // same-tab: fired by savePins() in navPins.js
    window.addEventListener('saachu-pins-updated', refresh);
    // cross-tab: standard storage event
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('saachu-pins-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Up to 4 pinned items, then More. Fallback: Home + More.
  const pinSlots = pins.slice(0, 4);
  const tabs = pinSlots.length > 0
    ? [...pinSlots, MORE_TAB]
    : [DASHBOARD_TAB, MORE_TAB];

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === href
      : href && pathname.startsWith(href);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: NAV_BG,
      borderTop: `1px solid ${NAV_BORDER}`,
      display: 'flex',
      zIndex: 100,
      // Respect iPhone home indicator safe area
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const isMore = tab.href === null;

        return (
          <button
            key={tab.href ?? 'more'}
            onClick={() => isMore ? onMore?.() : navigate(tab.href)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, flex: 1,
              minHeight: 56,
              padding: '8px 4px',
              background: active ? ACTIVE_BG : 'transparent',
              border: 'none',
              borderTop: active ? `2px solid ${ACTIVE_CLR}` : '2px solid transparent',
              color: active ? ACTIVE_CLR : TEXT_CLR,
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 0.1s',
            }}
          >
            <Ic name={tab.icon} size={20} />
            <span style={{
              fontSize: 10, lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

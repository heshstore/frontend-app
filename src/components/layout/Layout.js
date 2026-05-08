import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel, { RightPanelProvider } from './RightPanel';
import MobileNav from './MobileNav';
import UniversalSearch from '../UniversalSearch';
import QuickActions from '../QuickActions';
import { useNotifications } from '../../context/NotificationContext';

const MOBILE_BP = 768;

function NotificationBell() {
  const navigate     = useNavigate();
  const { unreadCount } = useNotifications();
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={() => navigate('/notifications')}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Notification Center"
      style={{
        position: 'relative',
        background: hov ? '#f3f4f6' : 'none',
        border: 'none', borderRadius: 8,
        padding: '6px 8px', cursor: 'pointer',
        fontSize: 20, lineHeight: 1,
        transition: 'background 0.12s',
        minWidth: 40, minHeight: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      🔔
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: 3, right: 3,
          background: '#dc2626', color: '#fff',
          fontSize: 9, fontWeight: 900,
          minWidth: 16, height: 16, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
          boxShadow: '0 1px 3px rgba(220,38,38,0.4)',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

function QuickActionsButton() {
  const [hov, setHov] = useState(false);
  return (
    <button
      title="Quick actions (⌘K)"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
      style={{
        background: hov ? '#f3f4f6' : 'none',
        border: '1px solid #e5e7eb', borderRadius: 7,
        padding: '4px 9px', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, color: '#6b7280',
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'background 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      <span>⚡</span>
      <kbd style={{ fontSize: 10, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', color: '#9ca3af' }}>⌘K</kbd>
    </button>
  );
}

export default function Layout() {
  const { pathname }   = useLocation();
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < MOBILE_BP);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const h = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const openSidebar  = () => setDrawerOpen(true);
  const closeSidebar = () => setDrawerOpen(false);

  return (
    <RightPanelProvider>
      <QuickActions />
      <div style={{
        display: 'flex',
        height: '100vh',
        background: '#f4f6f9',
      }}>

        {/* ── Desktop: permanent sidebar ── */}
        {!isMobile && <Sidebar />}

        {/* ── Mobile: backdrop ── */}
        {isMobile && drawerOpen && (
          <div
            onClick={closeSidebar}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
        )}

        {/* ── Mobile: slide-in drawer ── */}
        {isMobile && (
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 280, zIndex: 201,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}>
            <Sidebar onClose={closeSidebar} />
          </div>
        )}

        {/* ── Center column ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: '#f4f6f9',
        }}>
          {/* ── Header bar ── */}
          <header style={{
            height: 52, flexShrink: 0,
            background: '#fff',
            borderBottom: '1px solid #e9ecef',
            display: 'flex', alignItems: 'center',
            padding: '0 12px', gap: 8,
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            {/* Mobile: hamburger */}
            {isMobile && (
              <button
                onClick={openSidebar}
                style={{
                  background: 'none', border: 'none', borderRadius: 8,
                  padding: '6px 8px', cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, color: '#374151',
                  minWidth: 40, minHeight: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ☰
              </button>
            )}

            {/* Universal search */}
            <div style={{ flex: 1, maxWidth: 340, margin: '0 8px' }}>
              <UniversalSearch />
            </div>

            {/* Quick actions button */}
            {!isMobile && (
              <QuickActionsButton />
            )}

            {/* Notification bell */}
            <NotificationBell />
          </header>

          <main style={{
            flex: 1,
            minHeight: 0,
            padding: '20px',
            overflowY: 'auto',
            background: '#f4f6f9',
            paddingBottom: isMobile ? '80px' : '20px',
          }}>
            <Outlet />
          </main>
        </div>

        {/* ── Right panel (desktop overlay) ── */}
        <RightPanel />

      </div>

      {/* ── Mobile bottom navigation ── */}
      {isMobile && <MobileNav onMore={openSidebar} />}

    </RightPanelProvider>
  );
}

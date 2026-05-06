import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightPanel, { RightPanelProvider } from './RightPanel';
import MobileNav from './MobileNav';

const MOBILE_BP = 768;

export default function Layout() {
  const { pathname } = useLocation();
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
          <main style={{
            flex: 1,
            minHeight: 0,
            padding: '20px',
            overflowY: 'auto',
            background: '#f4f6f9',
            // prevent content hiding behind bottom nav on mobile
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

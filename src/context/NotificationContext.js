import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { apiFetch, getToken } from '../utils/api';
import { useAuth } from './AuthContext';
import { initFCM, deregisterFCM } from '../lib/fcm';

const NotificationContext = createContext(null);

const initialState = {
  nextAction: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NEXT_ACTION':
      return { ...state, nextAction: action.payload };
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Single source of truth: both React state (currentUser) AND token must exist.
  const isAuthenticated = !!currentUser && !!getToken();

  const fetchNextAction = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiFetch('/notifications/next-action');
      if (!res?.ok) return;
      const data = await res.json();
      dispatch({ type: 'SET_NEXT_ACTION', payload: data });
    } catch {}
  }, []);

  // Kept as a no-op for API compatibility with existing callers (e.g. OrderList) —
  // there is no in-app notification list to dismiss from anymore.
  const dismissByEntity = useCallback(() => {}, []);

  /* ── Authentication lifecycle ──────────────────────────────────────────────── */
  // Notifications are push-only (FCM) now — no in-app list, no socket. On login,
  // initialize FCM (requests permission, registers service worker, stores token).
  // On logout, deregister the device token so push stops for this device.
  useEffect(() => {
    if (!isAuthenticated) {
      deregisterFCM();
      return;
    }
    initFCM(null);
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        fetchNextAction,
        dismissByEntity,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

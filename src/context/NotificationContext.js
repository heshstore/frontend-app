import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiFetch, getToken } from '../utils/api';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// Web Audio API beep — short 880Hz tone, ~350ms, fades out.
// Module-level ref prevents calling more than once per 5 seconds across re-renders.
const _lastSoundAt = { t: 0 };
function playAlertTone() {
  try {
    const now = Date.now();
    if (now - _lastSoundAt.t < 5000) return;
    _lastSoundAt.t = now;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    // Silently ignore — autoplay restrictions or missing API
  }
}

const initialState = {
  notifications:  [],
  unreadCount:    0,
  categoryCounts: {},
  nextAction:     null,
  panelOpen:      false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      if (state.notifications.some(n => n.id === action.payload.id)) return state;
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
        unreadCount:   state.unreadCount + 1,
      };
    case 'SET_ALL': {
      const seen   = new Set();
      const merged = [...action.payload, ...state.notifications].filter(n => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      return { ...state, notifications: merged };
    }
    case 'SET_COUNT':
      return {
        ...state,
        unreadCount:    action.payload.count ?? action.payload,
        categoryCounts: action.payload.byCategory ?? state.categoryCounts,
      };
    case 'SET_NEXT_ACTION':
      return { ...state, nextAction: action.payload };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications:  state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount:    0,
        categoryCounts: {},
      };
    case 'MARK_ONE_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'HIDE': {
      const hidden = state.notifications.find(n => n.id === action.id);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
        unreadCount: hidden && !hidden.is_read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }
    case 'DISMISS_BY_ENTITY':
      return {
        ...state,
        notifications: state.notifications.filter(
          n => !(n.entity_type === action.entityType && n.entity_id === action.entityId),
        ),
      };
    case 'SET_PANEL':
      return { ...state, panelOpen: action.payload };
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);
  const pollRef   = useRef(null);

  // Single source of truth: both React state (currentUser) AND token must exist.
  // currentUser drives re-renders; getToken() confirms the token is actually set.
  const isAuthenticated = !!currentUser && !!getToken();

  /* ── Action creators ───────────────────────────────────────────────────────── */

  const addNotification = useCallback((notif) => {
    dispatch({ type: 'ADD', payload: notif });
    if (notif.priority === 'HIGH' || notif.priority === 'CRITICAL') {
      playAlertTone();
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiFetch('/notifications');
      if (!res?.ok) return;
      const data = await res.json();
      dispatch({ type: 'SET_ALL', payload: Array.isArray(data) ? data : (data.items ?? []) });
    } catch {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiFetch('/notifications/count');
      if (!res?.ok) return;
      const data = await res.json();
      dispatch({ type: 'SET_COUNT', payload: data });
    } catch {}
  }, []);

  const fetchNextAction = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiFetch('/notifications/next-action');
      if (!res?.ok) return;
      const data = await res.json();
      dispatch({ type: 'SET_NEXT_ACTION', payload: data });
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      dispatch({ type: 'MARK_ALL_READ' });
    } catch {}
  }, []);

  const markOneRead = useCallback(async (notifId) => {
    try {
      await apiFetch(`/notifications/${notifId}/read`, { method: 'PATCH' });
      dispatch({ type: 'MARK_ONE_READ', id: notifId });
    } catch {}
  }, []);

  const hideNotification = useCallback(async (notifId) => {
    dispatch({ type: 'HIDE', id: notifId });
    try {
      await apiFetch(`/notifications/${notifId}`, { method: 'DELETE' });
    } catch {}
  }, []);

  const dismissByEntity = useCallback((entityType, entityId) => {
    dispatch({ type: 'DISMISS_BY_ENTITY', entityType, entityId });
  }, []);

  const setPanel = useCallback((open) => {
    dispatch({ type: 'SET_PANEL', payload: open });
  }, []);

  /* ── Polling lifecycle ─────────────────────────────────────────────────────── */
  // Starts ONLY when authenticated. Stops on logout or unmount.
  // pollRef guards against duplicate intervals (React StrictMode double-invoke).
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!isAuthenticated) {
      console.log('[Notifications] Polling stopped on logout');
      return;
    }

    console.log('[Notifications] Authenticated — starting polling');
    fetchNotifications();
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);

    return () => {
      clearInterval(pollRef.current);
      pollRef.current = null;
    };
  // fetchNotifications/fetchUnreadCount have stable identities (empty useCallback deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  /* ── WebSocket lifecycle ───────────────────────────────────────────────────── */
  // Connects ONLY when authenticated. Disconnects on logout, token expiry, or unmount.
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    // Use API_URL from env; fall back to same origin only (not a port-swap hack).
    // transports default (['polling','websocket']) lets socket.io upgrade gracefully
    // and recovers from transient WebSocket failures via long-polling.
    const socketUrl = API_URL || window.location.origin;
    const socket    = io(socketUrl, {
      query:                { userId: currentUser.id },
      transports:           ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });
    socketRef.current = socket;

    socket.on('notification.new', addNotification);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // addNotification has a stable identity — intentionally excluded from deps.
  // isAuthenticated is derived from currentUser + token and causes socket cycling
  // when auth is re-evaluated. currentUser?.id alone is sufficient as the gate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  /* ── Re-fetch when panel opens ─────────────────────────────────────────────── */
  useEffect(() => {
    if (state.panelOpen && isAuthenticated) fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.panelOpen, isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        addNotification,
        fetchNotifications,
        fetchUnreadCount,
        fetchNextAction,
        markAllRead,
        markOneRead,
        hideNotification,
        dismissByEntity,
        setPanel,
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

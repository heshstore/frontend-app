import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const NotificationContext = createContext(null);

const initialState = {
  notifications: [],
  unreadCount:   0,
  nextAction:    null,
  panelOpen:     false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 20),
        unreadCount:   state.unreadCount + 1,
      };
    case 'SET_ALL': {
      // Merge fetched with any real-time ones already in state, deduplicate by id
      const seen = new Set();
      const merged = [...state.notifications, ...action.payload].filter(n => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      return { ...state, notifications: merged };
    }
    case 'SET_COUNT':
      return { ...state, unreadCount: action.payload };
    case 'SET_NEXT_ACTION':
      return { ...state, nextAction: action.payload };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount:   0,
      };
    case 'MARK_ONE_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
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
  const [state, dispatch] = useReducer(reducer, initialState);

  const addNotification = useCallback((notif) => {
    dispatch({ type: 'ADD', payload: notif });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications');
      if (!res?.ok) return;
      const data = await res.json();
      dispatch({ type: 'SET_ALL', payload: data });
    } catch {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications/count');
      if (!res?.ok) return;
      const { count } = await res.json();
      dispatch({ type: 'SET_COUNT', payload: count });
    } catch {}
  }, []);

  const fetchNextAction = useCallback(async () => {
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

  const dismissByEntity = useCallback((entityType, entityId) => {
    dispatch({ type: 'DISMISS_BY_ENTITY', entityType, entityId });
  }, []);

  const setPanel = useCallback((open) => {
    dispatch({ type: 'SET_PANEL', payload: open });
  }, []);

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

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const NotificationContext = createContext(null);

const initialState = {
  notifications:  [],
  unreadCount:    0,
  categoryCounts: {},   // { CRM: 3, PRODUCTION: 5, ... }
  nextAction:     null,
  panelOpen:      false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
        unreadCount:   state.unreadCount + 1,
      };
    case 'SET_ALL': {
      const seen   = new Set();
      const merged = [...state.notifications, ...action.payload].filter(n => {
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
  const [state, dispatch] = useReducer(reducer, initialState);

  const addNotification = useCallback((notif) => {
    dispatch({ type: 'ADD', payload: notif });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications');
      if (!res?.ok) return;
      const data = await res.json();
      // Center response is { items, total, page }; panel is array
      dispatch({ type: 'SET_ALL', payload: Array.isArray(data) ? data : (data.items ?? []) });
    } catch {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications/count');
      if (!res?.ok) return;
      const data = await res.json();
      // data = { count: N, byCategory: {...} }
      dispatch({ type: 'SET_COUNT', payload: data });
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

  const hideNotification = useCallback(async (notifId) => {
    // Optimistic: remove from local state immediately
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

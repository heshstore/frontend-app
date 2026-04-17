import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((token, user, permissions = []) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('permissions', JSON.stringify(permissions));
    localStorage.setItem('isLoggedIn', 'true');
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('isLoggedIn');
    setCurrentUser(null);
  }, []);

  /** Check if current user has a specific permission */
  const hasPermission = useCallback((key) => {
    try {
      const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
      return Array.isArray(perms) && perms.includes(key);
    } catch {
      return false;
    }
  }, []);

  /** Check if current user has any of the given permissions */
  const hasAnyPermission = useCallback((...keys) => {
    try {
      const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
      if (!Array.isArray(perms)) return false;
      return keys.some(k => perms.includes(k));
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

/** Decode JWT payload without verifying signature (client-side only). */
function decodeJWT(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns true if the token is present and not yet expired. */
function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds; add 10s buffer
  return payload.exp * 1000 > Date.now() + 10_000;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const autoLogoutTimer       = React.useRef(null);
  const inactivityTimer       = React.useRef(null);

  /** Schedule automatic logout when JWT expires. */
  const scheduleAutoLogout = useCallback((token) => {
    if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
    const payload = decodeJWT(token);
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) return;
    autoLogoutTimer.current = setTimeout(() => {
      // Silently log out — the ProtectedRoute will redirect to /login
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
    }, msUntilExpiry);
  }, []);

  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    // 5 minutes = 300,000 ms
    inactivityTimer.current = setTimeout(() => {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
    }, 300_000);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => {
      if (user) resetInactivity();
    };
    
    events.forEach(e => window.addEventListener(e, handleActivity));
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivity]);

  /** On mount: validate stored token, refresh user from API. */
  useEffect(() => {
    const token     = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');

    if (!token || !isTokenValid(token)) {
      // Token absent or expired — clear storage and finish loading
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setLoading(false);
      return;
    }

    // Optimistically set user from cache while we verify with the server
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }

    const verifyWithServer = async () => {
      try {
        const { data } = await api.get('/auth/me');
        sessionStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        scheduleAutoLogout(token);
        resetInactivity();
      } catch {
        // Server rejected the token — force logout
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyWithServer();

    return () => {
      if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [scheduleAutoLogout, resetInactivity]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('token', data.access_token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    scheduleAutoLogout(data.access_token);
    resetInactivity();
    return data;
  };

  const signup = async (name, email, password, business, country, phone_number) => {
    await api.post('/auth/signup', { name, email, password, business, country, phone_number });
    // Don't auto-login here since it requires admin approval.
    return true;
  };

  const logout = async () => {
    if (autoLogoutTimer.current) clearTimeout(autoLogoutTimer.current);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    // Clean up local storage directly since backend token blacklisting isn't implemented
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (name, password, profile_image) => {
    const data = { name };
    if (password)      data.password      = password;
    if (profile_image) data.profile_image = profile_image;

    const { data: updated } = await api.put('/users/me', data);
    const mergedUser = { ...user, name: updated.name, profile_image: updated.profile_image };
    sessionStorage.setItem('user', JSON.stringify(mergedUser));
    setUser(mergedUser);
    return updated;
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, loading, isAuthenticated }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

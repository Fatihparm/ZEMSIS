/**
 * useAuth — Kimlik doğrulama hook'u
 *
 * token, user, handleLogin, handleLogout, authError state'lerini yönetir.
 * Daha önce App.jsx içindeydi.
 */
import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export function useAuth() {
  const [token, setToken]       = useState(() => localStorage.getItem('jg_token'));
  const [user,  setUser]        = useState(() => {
    const stored = localStorage.getItem('jg_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [authError, setAuthError] = useState('');

  // Token var ama user yoksa /me endpoint'inden yükle
  useEffect(() => {
    if (token && !user) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) handleLogout();
          else {
            setUser(data.user);
            localStorage.setItem('jg_user', JSON.stringify(data.user));
          }
        })
        .catch(() => handleLogout());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('jg_token', newToken);
    localStorage.setItem('jg_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setAuthError('');
  };

  const handleLogout = (errorMsg = '') => {
    localStorage.removeItem('jg_token');
    localStorage.removeItem('jg_user');
    setToken(null);
    setUser(null);
    setAuthError(typeof errorMsg === 'string' ? errorMsg : '');
  };

  const userInitials = (user?.fullName || 'Jet Grout')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return {
    token,
    user,
    authError,
    isOfficer: user?.role === 'municipal_officer',
    userInitials,
    handleLogin,
    handleLogout,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../config';
import { MUNICIPALITIES } from '../constants';
import './AuthPage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AuthPage({ onLogin, lang, initialError = '' }) {
  const tr = lang === 'tr';
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('user'); // 'user' | 'municipal_officer'
  const [municipality, setMunicipality] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  // Google Rol Seçim Modalı state
  const [googleRoleModal, setGoogleRoleModal] = useState(false);
  const [googlePendingData, setGooglePendingData] = useState(null); // { credential, email, fullName }
  const [googleRole, setGoogleRole] = useState('user');
  const [googleMunicipality, setGoogleMunicipality] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const API = `${API_URL}/auth`;

  // ── Google Sign-In callback ──────────────────────────────────
  const handleGoogleCredential = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || (tr ? 'Google ile giriş başarısız' : 'Google sign-in failed'));
        return;
      }

      // Yeni kullanıcı — rol seçimi gerekiyor
      if (data.pending_role_selection) {
        setGooglePendingData(data.googleData);
        setGoogleRoleModal(true);
        return;
      }

      // Başarılı giriş
      localStorage.setItem('jg_token', data.token);
      localStorage.setItem('jg_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err) {
      setError(tr ? 'Sunucuya bağlanılamıyor' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  }, [API, tr, onLogin]);

  // ── Google GSI başlat ──────────────────────────────────────
  const googleInitialized = useRef(false);

  const initializeGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || googleInitialized.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleInitialized.current = true;
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Eğer script zaten yüklendiyse hemen initialize et
    if (window.google) {
      initializeGoogle();
      return;
    }

    // Script henüz yüklenmediyse onload callback bekle
    const scriptEl = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (scriptEl) {
      const onLoad = () => initializeGoogle();
      scriptEl.addEventListener('load', onLoad);
      return () => scriptEl.removeEventListener('load', onLoad);
    }
  }, [initializeGoogle]);

  // handleGoogleCredential değiştiğinde (render'da) google'ı yeniden initialize et
  useEffect(() => {
    if (googleInitialized.current) {
      googleInitialized.current = false;
      initializeGoogle();
    }
  }, [handleGoogleCredential, initializeGoogle]);

  // Google butonunu manuel tetikle (popup flow)
  const handleGoogleButtonClick = () => {
    if (!window.google) {
      setError(tr ? 'Google servisi yüklenemedi' : 'Google service failed to load');
      return;
    }
    // Henüz initialize edilmediyse şimdi yap
    if (!googleInitialized.current) {
      initializeGoogle();
    }
    window.google.accounts.id.prompt();
  };

  // ── Rol seçimi sonrası Google kaydını tamamla ────────────────
  const handleGoogleRoleSubmit = async () => {
    setGoogleError('');
    if (googleRole === 'municipal_officer' && !googleMunicipality) {
      setGoogleError(tr ? 'Belediye seçimi zorunlu' : 'Municipality is required');
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await fetch(`${API}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: googlePendingData.credential,
          role: googleRole,
          municipality: googleRole === 'municipal_officer' ? googleMunicipality : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setGoogleError(data.error || (tr ? 'Kayıt başarısız' : 'Registration failed'));
        return;
      }

      setGoogleRoleModal(false);
      localStorage.setItem('jg_token', data.token);
      localStorage.setItem('jg_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err) {
      setGoogleError(tr ? 'Sunucuya bağlanılamıyor' : 'Cannot connect to server');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Email/Şifre giriş ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = mode === 'login' ? `${API}/login` : `${API}/register`;
      const body = mode === 'login'
        ? { email, password }
        : { email, password, fullName, role, municipality: role === 'municipal_officer' ? municipality : null };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || (tr ? 'Bir hata oluştu' : 'An error occurred'));
        return;
      }

      // Save token + user to localStorage
      localStorage.setItem('jg_token', data.token);
      localStorage.setItem('jg_user', JSON.stringify(data.user));
      onLogin(data.token, data.user);
    } catch (err) {
      setError(tr ? 'Sunucuya bağlanılamıyor' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <video
        className="auth-bg-video"
        src="/bg-video.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="auth-bg-overlay" />

      <div className="auth-card">
        <div className="auth-brand">
          <img src="/zemsis-logo.png" alt="ZEMSIS Logo" className="auth-brand-logo" />
          <h1>ZEMSIS</h1>
          <p>{tr ? 'Zemin Sistemleri Tasarım ve Analiz Aracı' : 'Ground Systems Design & Analysis Tool'}</p>
        </div>

        {/* Tab Switch */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            {tr ? 'Giriş Yap' : 'Login'}
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            {tr ? 'Kayıt Ol' : 'Register'}
          </button>
        </div>

        {/* Role Segmented Controller */}
        <div className="auth-role-selector">
          <button
            type="button"
            className={`auth-role-btn ${role === 'user' ? 'active' : ''}`}
            onClick={() => setRole('user')}
          >
            <span className="role-icon">👤</span>
            <span className="role-text">{tr ? 'Mühendis / Kullanıcı' : 'Engineer / User'}</span>
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === 'municipal_officer' ? 'active' : ''}`}
            onClick={() => setRole('municipal_officer')}
          >
            <span className="role-icon">🏛️</span>
            <span className="role-text">{tr ? 'Belediye Personeli' : 'Municipal Officer'}</span>
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>{tr ? 'Ad Soyad' : 'Full Name'}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tr ? 'Adınız Soyadınız' : 'Your full name'}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>{tr ? 'Şifre' : 'Password'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? (tr ? 'En az 6 karakter' : 'At least 6 characters') : '••••••••'}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && role === 'municipal_officer' && (
            <div className="auth-field">
              <label>{tr ? 'Belediye Seçimi' : 'Municipality'}</label>
              <div className="auth-select-wrapper">
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  required
                >
                  <option value="">{tr ? '— Belediye seçin —' : '— Select Municipality —'}</option>
                  {MUNICIPALITIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="auth-select-arrow">▾</span>
              </div>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? (tr ? 'Lütfen bekleyin...' : 'Please wait...')
              : mode === 'login'
                ? (tr ? 'Giriş Yap' : 'Login')
                : (tr ? 'Hesap Oluştur' : 'Create Account')
            }
          </button>
        </form>

        {/* Google ile Giriş */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">
              <span>{tr ? 'veya' : 'or'}</span>
            </div>
            <button
              className="auth-google-btn"
              onClick={handleGoogleButtonClick}
              disabled={loading}
              type="button"
            >
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{tr ? 'Google ile Giriş Yap' : 'Continue with Google'}</span>
            </button>
          </>
        )}

        <div className="auth-footer">
          {mode === 'login'
            ? (tr ? 'Hesabınız yok mu? ' : "Don't have an account? ")
            : (tr ? 'Zaten hesabınız var mı? ' : 'Already have an account? ')
          }
          <button
            className="auth-switch"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login'
              ? (tr ? 'Kayıt Ol' : 'Register')
              : (tr ? 'Giriş Yap' : 'Login')
            }
          </button>
        </div>
      </div>

      <div className="auth-version">v1.0 © 2026</div>

      {/* ── Google Rol Seçim Modalı ─────────────────────────────── */}
      {googleRoleModal && (
        <div className="google-role-overlay" onClick={() => setGoogleRoleModal(false)}>
          <div className="google-role-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="grm-header">
              <div className="grm-google-badge">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </div>
              <h2 className="grm-title">
                {tr ? 'Hoş geldiniz!' : 'Welcome!'}
              </h2>
              <p className="grm-subtitle">
                {tr
                  ? `${googlePendingData?.fullName || 'Kullanıcı'} olarak giriş yapıyorsunuz. Devam etmek için hesap türünüzü seçin.`
                  : `Signing in as ${googlePendingData?.fullName || 'User'}. Please select your account type to continue.`
                }
              </p>
              <p className="grm-email">{googlePendingData?.email}</p>
            </div>

            {/* Rol Seçimi */}
            <div className="grm-role-selector">
              <button
                type="button"
                className={`grm-role-card ${googleRole === 'user' ? 'active' : ''}`}
                onClick={() => setGoogleRole('user')}
              >
                <div className="grm-role-icon">👷</div>
                <div className="grm-role-info">
                  <strong>{tr ? 'Mühendis / Kullanıcı' : 'Engineer / User'}</strong>
                  <span>{tr ? 'Proje oluştur, hesapla, rapor al' : 'Create projects, calculate, generate reports'}</span>
                </div>
                <div className={`grm-role-check ${googleRole === 'user' ? 'checked' : ''}`}>
                  {googleRole === 'user' && <span>✓</span>}
                </div>
              </button>

              <button
                type="button"
                className={`grm-role-card ${googleRole === 'municipal_officer' ? 'active' : ''}`}
                onClick={() => setGoogleRole('municipal_officer')}
              >
                <div className="grm-role-icon">🏛️</div>
                <div className="grm-role-info">
                  <strong>{tr ? 'Belediye Personeli' : 'Municipal Officer'}</strong>
                  <span>{tr ? 'Başvuruları incele ve onayla' : 'Review and approve applications'}</span>
                </div>
                <div className={`grm-role-check ${googleRole === 'municipal_officer' ? 'checked' : ''}`}>
                  {googleRole === 'municipal_officer' && <span>✓</span>}
                </div>
              </button>
            </div>

            {/* Belediye Seçimi (sadece municipal_officer) */}
            {googleRole === 'municipal_officer' && (
              <div className="grm-municipality">
                <label>{tr ? 'Belediyenizi seçin' : 'Select your municipality'}</label>
                <div className="auth-select-wrapper">
                  <select
                    value={googleMunicipality}
                    onChange={(e) => setGoogleMunicipality(e.target.value)}
                  >
                    <option value="">{tr ? '— Belediye seçin —' : '— Select Municipality —'}</option>
                    {MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="auth-select-arrow">▾</span>
                </div>
              </div>
            )}

            {googleError && <div className="auth-error" style={{ margin: '0 0 12px' }}>{googleError}</div>}

            {/* Aksiyon Butonları */}
            <div className="grm-actions">
              <button
                className="grm-cancel"
                onClick={() => { setGoogleRoleModal(false); setGooglePendingData(null); }}
                disabled={googleLoading}
              >
                {tr ? 'İptal' : 'Cancel'}
              </button>
              <button
                className="grm-confirm"
                onClick={handleGoogleRoleSubmit}
                disabled={googleLoading}
              >
                {googleLoading
                  ? (tr ? 'Lütfen bekleyin...' : 'Please wait...')
                  : (tr ? 'Devam Et' : 'Continue')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthPage;

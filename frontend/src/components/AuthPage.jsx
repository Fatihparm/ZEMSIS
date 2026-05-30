import { useState } from 'react';
import { API_URL } from '../config';
import './AuthPage.css';

const MUNICIPALITIES = [
  'Bursa Büyükşehir Belediyesi',
  'Osmangazi Belediyesi',
  'Nilüfer Belediyesi',
  'Kestel Belediyesi',
];

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

  const API = `${API_URL}/auth`;

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
    </div>
  );
}

export default AuthPage;

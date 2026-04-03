import { useState } from 'react';
import './AuthPage.css';

function AuthPage({ onLogin, lang }) {
  const tr = lang === 'tr';
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = 'http://localhost:3001/api/auth';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = mode === 'login' ? `${API}/login` : `${API}/register`;
      const body = mode === 'login'
        ? { email, password }
        : { email, password, fullName };

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
      <div className="auth-bg-pattern" />

      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">🏗️</span>
          <h1>Jet-Grout-Calc</h1>
          <p>{tr ? 'Jet Grouting Tasarım ve Analiz Aracı' : 'Jet Grouting Design & Analysis Tool'}</p>
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

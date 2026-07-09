'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { saveToken, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      saveToken(data.access_token, data.username);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal login. Periksa username dan password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={loginStyles.page}>
      {/* Login Card (IBM Carbon Style Tile) */}
      <div className="animate-fade-in" style={loginStyles.card}>
        
        {/* Left Green Accent Bar */}
        <div style={loginStyles.accentBar} />

        {/* Logo & Header */}
        <div style={loginStyles.header}>
          <div style={loginStyles.logoContainer}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 28L16 4L28 28H4Z" fill="#006A4E" opacity="0.95"/>
              <path d="M8 28L16 12L24 28H8Z" fill="#1CC729" opacity="0.6"/>
              <circle cx="16" cy="22" r="3" fill="#F5C842"/>
            </svg>
          </div>
          <h1 style={loginStyles.title}>SIG PTPN</h1>
          <p style={loginStyles.subtitle}>Sistem Informasi Geografis Lahan</p>
          <p style={loginStyles.region}>PTPN I Regional 7 — Lampung</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={loginStyles.form}>
          <div style={loginStyles.fieldGroup}>
            <label style={loginStyles.label} htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="input-field"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div style={loginStyles.fieldGroup}>
            <label style={loginStyles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={loginStyles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="#da1e28" strokeWidth="1.5"/>
                <path d="M8 5v4M8 11v.5" stroke="#da1e28" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{error}</span>
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '12px', fontSize: '14px', marginTop: '8px' }}
          >
            {loading ? (
              <>
                <span style={loginStyles.spinner} />
                Memvalidasi Kredensial...
              </>
            ) : (
              'Masuk ke Sistem'
            )}
          </button>
        </form>

        <div style={loginStyles.footer}>
          Internal Enterprise Application &copy; 2026 PT Perkebunan Nusantara
        </div>
      </div>
    </div>
  );
}

const loginStyles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f4f4f4',
    fontFamily: "'IBM Plex Sans', sans-serif",
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 32px 32px 32px',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    position: 'relative',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: '#006A4E',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    background: '#f4f4f4',
    border: '1px solid #e0e0e0',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#161616',
    letterSpacing: '-0.01em',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#525252',
    fontWeight: '400',
    marginBottom: '2px',
  },
  region: {
    fontSize: '11px',
    color: '#8d8d8d',
    fontWeight: '500',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#525252',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px 12px',
    background: '#fff0f0',
    border: '1px solid #ffb3b3',
    borderLeft: '4px solid #da1e28',
    color: '#da1e28',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    fontSize: '11px',
    color: '#8d8d8d',
    lineHeight: '1.4',
  },
};

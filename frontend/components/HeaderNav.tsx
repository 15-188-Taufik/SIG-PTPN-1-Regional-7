'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getUsername } from '@/lib/auth';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('User');

  useEffect(() => {
    const user = getUsername();
    if (user) {
      setUsername(user);
    }
  }, []);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  const isMap = pathname === '/dashboard';
  const isProduksi = pathname.startsWith('/dashboard/produksi');
  const isPemeliharaan = pathname.startsWith('/dashboard/pemeliharaan');
  const isPemupukan = pathname.startsWith('/dashboard/pemupukan');

  return (
    <header style={styles.header}>
      {/* Brand & Logo */}
      <div style={styles.brandGroup}>
        <div style={styles.logoBadge}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path d="M4 28L16 4L28 28H4Z" fill="#006A4E" opacity="0.95" />
            <path d="M8 28L16 12L24 28H8Z" fill="#1CC729" opacity="0.6" />
            <circle cx="16" cy="22" r="3" fill="#F5C842" />
          </svg>
        </div>
        <div>
          <div style={styles.brandTitle}>SIG PTPN</div>
          <div style={styles.brandSubtitle}>PTPN I Regional 7</div>
        </div>
      </div>

      {/* Center Navigation Tabs (Professional Inline SVG Icons) */}
      <nav style={styles.navTabs}>
        <Link
          href="/dashboard"
          style={{
            ...styles.tabLink,
            ...(isMap ? styles.activeTab : {}),
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12 2C9.24 2 7 4.24 7 7c0 3.25 4.31 8.44 4.5 8.66.14.16.35.24.5.24s.36-.08.5-.24C12.69 15.44 17 10.25 17 7c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 3.5l4-1.5v10l-4 1.5v-10zM6 2l4 1.5v10.5L6 12.5V2z"/>
          </svg>
          Peta Spasial GIS
        </Link>

        <Link
          href="/dashboard/produksi"
          style={{
            ...styles.tabLink,
            ...(isProduksi ? styles.activeTab : {}),
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 13h12v1H1v-12h1v11zm2-7.5l3 3 3-4 4 4.5V12H4V5.5z"/>
          </svg>
          Produksi Harian
        </Link>

        <Link
          href="/dashboard/pemeliharaan"
          style={{
            ...styles.tabLink,
            ...(isPemeliharaan ? styles.activeTab : {}),
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.7 2.3c-.4-.4-1-.4-1.4 0l-3.5 3.5c-.3-.1-.7-.2-1-.2-1.7 0-3.2 1.1-3.7 2.7l1.6 1.6c-1 .4-1.8 1.1-2.3 2L1.8 9.3c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4l3 3c.2.2.5.3.7.3s.5-.1.7-.3l2.6-2.6c.9-.5 1.6-1.3 2-2.3l1.6 1.6c1.6-.5 2.7-2 2.7-3.7 0-.3-.1-.7-.2-1l3.5-3.5c.4-.4.4-1 0-1.4z"/>
          </svg>
          Pemeliharaan Harian
        </Link>

        <Link
          href="/dashboard/pemupukan"
          style={{
            ...styles.tabLink,
            ...(isPemupukan ? styles.activeTab : {}),
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15V9.5C8 6.5 10.5 4 13.5 4H14v1c0 3-2.5 5.5-5.5 5.5H8zm0 0v-4C8 8.5 5.5 6 2.5 6H2v1c0 3 2.5 5.5 5.5 5.5H8z"/>
          </svg>
          Pemupukan Harian
        </Link>
      </nav>

      {/* Right User & Actions */}
      <div style={styles.userGroup}>
        <div style={styles.userInfo}>
          <span style={styles.userDot}>●</span>
          <span style={styles.userName}>{username}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Keluar dari sistem">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2h5c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1zm10 5.5H6v1h7v2.5l3-3-3-3V7.5z"/>
          </svg>
          Keluar
        </button>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '48px',
    backgroundColor: '#161616',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid #393939',
    position: 'relative',
    zIndex: 1000,
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoBadge: {
    width: '28px',
    height: '28px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    color: '#ffffff',
    lineHeight: '1.2',
  },
  brandSubtitle: {
    fontSize: '10px',
    color: '#a8a8a8',
    lineHeight: '1',
  },
  navTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '100%',
  },
  tabLink: {
    height: '100%',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#c6c6c6',
    textDecoration: 'none',
    borderBottom: '3px solid transparent',
    transition: 'all 0.15s ease',
  },
  activeTab: {
    color: '#ffffff',
    fontWeight: '600',
    backgroundColor: '#262626',
    borderBottom: '3px solid #0f62fe',
  },
  userGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#e0e0e0',
    background: '#262626',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid #393939',
  },
  userDot: {
    color: '#24a148',
    fontSize: '10px',
  },
  userName: {
    fontWeight: '600',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #525252',
    color: '#f4f4f4',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s ease',
  },
};

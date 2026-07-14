import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'SIG PTPN — Sistem Informasi Geografis Kebun Regional 7 Lampung',
  description:
    'Dashboard Sistem Informasi Geografis (SIG) untuk pemantauan dan pengelolaan data kebun PTPN Regional 7 Lampung. Meliputi kebun Bergen, Kedaton, TUBU, Way Berulu, dan Wali.',
  keywords: 'PTPN, SIG, GIS, kebun, Lampung, peta, karet, sawit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}

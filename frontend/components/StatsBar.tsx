'use client';

import { StatsResponse } from '@/types/kebun';

interface StatsBarProps {
  stats: StatsResponse | null;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        borderRadius: '0px',
        padding: '12px 16px',
        background: '#ffffff',
        border: '1px solid var(--cds-border)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: '80px' }}>
              <div
                style={{
                  width: '40px',
                  height: '18px',
                  background: '#f4f4f4',
                  marginBottom: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: '60px',
                  height: '11px',
                  background: '#f4f4f4',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <StatItem
            value={stats.total_blok.toLocaleString('id-ID')}
            label="Total Blok"
            color="var(--cds-primary)"
          />
          <Divider />
          <StatItem
            value={`${stats.total_luas_gis.toLocaleString('id-ID', {
              maximumFractionDigits: 0,
            })} Ha`}
            label="Luas GIS"
            color="#1CC729"
          />
          <Divider />
          <StatItem
            value={`${stats.total_luas_rkap.toLocaleString('id-ID', {
              maximumFractionDigits: 0,
            })} Ha`}
            label="Luas RKAP"
            color="#F5A623"
          />
        </>
      ) : null}
    </div>
  );
}

function StatItem({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--cds-text-primary)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          lineHeight: 1.1,
          marginBottom: '2px',
          borderLeft: `3px solid ${color}`,
          paddingLeft: '6px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: 'var(--cds-text-secondary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          paddingLeft: '9px',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '24px',
        background: 'var(--cds-border)',
        flexShrink: 0,
      }}
    />
  );
}

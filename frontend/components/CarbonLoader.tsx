'use client';

import React from 'react';

interface CarbonLoaderProps {
  small?: boolean;
  overlay?: boolean;
  contrast?: boolean;
  description?: string;
}

export default function CarbonLoader({
  small = false,
  overlay = false,
  contrast = false,
  description = 'Memuat data...',
}: CarbonLoaderProps) {
  const spinner = (
    <div
      className={`cds--loading ${small ? 'cds--loading--small' : ''} ${
        contrast ? 'cds--loading--contrast' : ''
      }`}
    >
      <svg className="cds--loading__svg" viewBox="0 0 100 100">
        <circle className="cds--loading__track" cx="50" cy="50" r="44" />
        <circle className="cds--loading__stroke" cx="50" cy="50" r="44" />
      </svg>
    </div>
  );

  if (overlay) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(244, 244, 244, 0.7)', // Slightly transparent background matching var(--cds-background)
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          width: '100%',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {spinner}
          {description && (
            <span
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--cds-text-secondary)',
                letterSpacing: '0.02em',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }

  return spinner;
}

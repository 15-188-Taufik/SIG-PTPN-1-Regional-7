'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ViewMode } from './MapView';
import { getKebunDisplayName } from './MapView';

interface RightFilterPanelProps {
  kebunList: string[];
  activeKebun: string[];
  onToggleKebun: (kebun: string) => void;
  onHighlightKebun: (kebun: string) => void;
  
  selectedCropStatus: string;
  onCropStatusChange: (status: string) => void;
  
  selectedYearMin: number;
  onYearMinChange: (year: number) => void;
  
  selectedYearMax: number;
  onYearMaxChange: (year: number) => void;

  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  showEmptyData: boolean;
  onShowEmptyDataChange: (show: boolean) => void;
  
  collapsed: boolean;
  onToggleCollapse: () => void;
  onWidthChange?: (width: number) => void;
}

export default function RightFilterPanel({
  kebunList,
  activeKebun,
  onToggleKebun,
  onHighlightKebun,
  selectedCropStatus,
  onCropStatusChange,
  selectedYearMin,
  onYearMinChange,
  selectedYearMax,
  onYearMaxChange,
  viewMode,
  onViewModeChange,
  showEmptyData,
  onShowEmptyDataChange,
  collapsed,
  onToggleCollapse,
  onWidthChange,
}: RightFilterPanelProps) {
  
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(600, window.innerWidth - e.clientX));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const years = Array.from({ length: 37 }, (_, i) => 1990 + i);

  function handleToggleAll() {
    if (activeKebun.length === kebunList.length) {
      kebunList.forEach((k) => {
        if (activeKebun.includes(k)) onToggleKebun(k);
      });
    } else {
      kebunList.forEach((k) => {
        if (!activeKebun.includes(k)) onToggleKebun(k);
      });
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: collapsed ? '48px' : `${width}px`,
        transition: isResizing ? 'none' : 'width 0.15s cubic-bezier(0.2, 0, 0.38, 0.9)',
        overflow: 'hidden',
        background: '#ffffff',
        borderLeft: '1px solid var(--cds-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        zIndex: 1000,
      }}
    >
      {/* Header Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--cds-border)',
          background: '#f4f4f4',
          height: '40px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggleCollapse}
          style={{
            background: '#ffffff',
            border: '1px solid var(--cds-border)',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            color: 'var(--cds-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
          title={collapsed ? 'Buka Filter Control' : 'Tutup Filter Control'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        
        {!collapsed && (
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--cds-primary)', fontFamily: 'inherit' }}>
            CONTROL CENTER 
          </span>
        )}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECTION 1: VIEW METRIC SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Tampilan Visual Peta
            </label>
            <select
              value={viewMode}
              onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                border: '1px solid var(--cds-border)',
                outline: 'none',
                background: '#ffffff',
                fontFamily: 'inherit',
                color: 'var(--cds-text-primary)',
              }}
            >
              <option value="default">Default (Wilayah Kebun)</option>
              <option value="productivity">Analisis Produktivitas (kg/Ha)</option>
              <option value="age">Analisis Umur Tanaman (Tahun)</option>
              <option value="density">Analisis Kerapatan (Pohon/Ha)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: 0 }} />

          {/* SECTION 2: KEBUN FILTERS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>
                Filter Unit Kebun
              </label>
              <button
                onClick={handleToggleAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cds-primary)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {activeKebun.length === kebunList.length ? 'Kosongkan' : 'Pilih Semua'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {kebunList.map((kebun) => {
                const isActive = activeKebun.includes(kebun);
                return (
                  <div key={kebun} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => onToggleKebun(kebun)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isActive ? 'var(--cds-primary)' : 'var(--cds-text-secondary)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isActive ? 1 : 0.5,
                          transition: 'opacity 0.15s, color 0.15s',
                        }}
                        title={isActive ? 'Sembunyikan wilayah kebun' : 'Tampilkan wilayah kebun'}
                      >
                        {isActive ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                      <span
                        onClick={() => onToggleKebun(kebun)}
                        style={{
                          fontSize: '12px',
                          color: isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                          cursor: 'pointer',
                          opacity: isActive ? 1 : 0.6,
                          userSelect: 'none',
                          transition: 'opacity 0.15s, color 0.15s',
                        }}
                      >
                        {getKebunDisplayName(kebun)}
                      </span>
                    </div>
                    <button
                      onClick={() => onHighlightKebun(kebun)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--cds-primary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '2px',
                      }}
                      title={`Zoom ke ${getKebunDisplayName(kebun)}`}
                    >
                      🔍
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: 0 }} />

          {/* SECTION 4: CROP STATUS FILTER */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Filter Status Tanaman
            </label>
            <select
              value={selectedCropStatus}
              onChange={(e) => onCropStatusChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                border: '1px solid var(--cds-border)',
                outline: 'none',
                background: '#ffffff',
                fontFamily: 'inherit',
                color: 'var(--cds-text-primary)',
              }}
            >
              <option value="Semua">Semua Status</option>
              <option value="TM">Tanaman Menghasilkan (TM)</option>
              <option value="TBM">Tanaman Belum Menghasilkan (TBM)</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: 0 }} />

          {/* SECTION 5: PLANTING YEAR FILTER RANGE */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Filter Tahun Tanam
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedYearMin}
                onChange={(e) => onYearMinChange(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '11px',
                  border: '1px solid var(--cds-border)',
                  background: '#ffffff',
                  fontFamily: 'inherit',
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y} disabled={y > selectedYearMax}>{y}</option>
                ))}
              </select>
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>s/d</span>
              <select
                value={selectedYearMax}
                onChange={(e) => onYearMaxChange(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '11px',
                  border: '1px solid var(--cds-border)',
                  background: '#ffffff',
                  fontFamily: 'inherit',
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y} disabled={y < selectedYearMin}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: 0 }} />

          {/* SECTION 6: DISPLAY EMPTY DATA TOGGLE */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--cds-text-primary)', cursor: 'pointer' }}>
              Tampilkan Blok Tanpa Data
            </label>
            <input
              type="checkbox"
              checked={showEmptyData}
              onChange={(e) => onShowEmptyDataChange(e.target.checked)}
              style={{
                width: '14px',
                height: '14px',
                accentColor: 'var(--cds-primary)',
                cursor: 'pointer',
              }}
            />
          </div>

        </div>
      )}

      {/* Resize Handler Handle (Left edge since panel is on the right) */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isResizing ? 'var(--cds-primary)' : 'transparent',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 106, 78, 0.1)'; }}
          onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Visual Grip Indicator (Vertical Pill in the center) */}
          <div
            style={{
              width: '3px',
              height: '32px',
              borderRadius: '1.5px',
              background: '#8d8d8d',
              opacity: 0.6,
            }}
          />
        </div>
      )}
    </div>
  );
}

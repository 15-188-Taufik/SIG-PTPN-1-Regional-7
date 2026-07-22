'use client';

import { useState } from 'react';
import type { ViewMode } from './MapView';
import { getKebunDisplayName } from './MapView';

interface RightFilterPanelProps {
  kebunList: string[];
  activeKebun: string[];
  onToggleKebun: (kebun: string) => void;
  onHighlightKebun: (kebun: string) => void;
  
  // Looker Studio style filters
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  
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
}

export default function RightFilterPanel({
  kebunList,
  activeKebun,
  onToggleKebun,
  onHighlightKebun,
  selectedCommodity,
  onCommodityChange,
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
}: RightFilterPanelProps) {
  
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
        width: collapsed ? '48px' : '280px',
        transition: 'width 0.15s cubic-bezier(0.2, 0, 0.38, 0.9)',
        overflow: 'hidden',
        background: '#ffffff',
        borderLeft: '1px solid var(--cds-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        zIndex: 10,
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
            fill="currentColor"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          >
            <path d="M12 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1zm-1 12H5V3h6v10zM6 5h4v1H6V5zm0 2h4v1H6V7zm0 2h3v1H6V9z" />
          </svg>
        </button>
        
        {!collapsed && (
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--cds-primary)', fontFamily: 'inherit' }}>
            CONTROL CENTER (LOOKER)
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--cds-text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => onToggleKebun(kebun)}
                        style={{
                          width: '14px',
                          height: '14px',
                          accentColor: 'var(--cds-primary)',
                          cursor: 'pointer',
                        }}
                      />
                      <span>{getKebunDisplayName(kebun)}</span>
                    </label>
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

          {/* SECTION 3: COMMODITY FILTER */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Filter Komoditi
            </label>
            <select
              value={selectedCommodity}
              onChange={(e) => onCommodityChange(e.target.value)}
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
              <option value="Semua">Semua Komoditi</option>
              <option value="Karet">Karet</option>
              <option value="Tebu">Tebu</option>
              <option value="Lainnya">Lainnya</option>
            </select>
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
    </div>
  );
}

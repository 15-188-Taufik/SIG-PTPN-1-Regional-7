'use client';

import { useState } from 'react';
import { StatsResponse, GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import { ViewMode } from './MapView';

const KEBUN_COLORS: Record<string, string> = {
  Bergen: '#0f62fe', // Carbon Blue
  Kedaton: '#006A4E', // PTPN Green
  KSO: '#11a391', // Carbon Teal
  TUBU: '#f5a623', // Carbon Orange
  Wabe: '#8a3ffc', // Carbon Purple
  Wali: '#6f6f6f', // Carbon Gray
};

export function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  if (norm.toLowerCase() === 'wabe') return 'Way Belulu';
  return norm;
}

interface SidePanelProps {
  kebunList: string[];
  activeKebun: string[];
  onToggleKebun: (kebun: string) => void;
  stats: StatsResponse | null;
  loading: boolean;
  onLogout: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showEmptyData: boolean;
  onShowEmptyDataChange: (show: boolean) => void;
  geojsonData: FeatureCollection | null;
  onSelectFeature: (feature: GeoJSONFeature) => void;
  onSelectKebunAnalysis?: (kebun: string) => void;
  detailLevel: 'block' | 'kebun';
  onDetailLevelChange: (level: 'block' | 'kebun') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface AlertItem {
  feature: GeoJSONFeature;
  type: 'density' | 'pica' | 'productivity' | 'replanting';
  title: string;
  desc: string;
  severity: 'high' | 'medium';
}

export default function SidePanel({
  kebunList,
  activeKebun,
  onToggleKebun,
  stats,
  loading,
  viewMode,
  onViewModeChange,
  showEmptyData,
  onShowEmptyDataChange,
  geojsonData,
  onSelectFeature,
  onSelectKebunAnalysis,
  detailLevel,
  onDetailLevelChange,
  collapsed,
  onToggleCollapse,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'filter' | 'alerts'>('filter');

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

  // Parse alerts from GeoJSON data
  const alerts: AlertItem[] = [];
  if (geojsonData) {
    geojsonData.features.forEach((f) => {
      const p = f.properties;
      const blockName = `${getKebunDisplayName(p.kebun)} - Afd ${p.afdeling || '-'} - ${p.kode_blok || p.no_polygon || 'Blok'}`;

      // 1. Critical SPH Density (< 150)
      const lgis = p.l_gis || 0;
      const pop = p.populasi || 0;
      if (lgis > 0 && pop > 0) {
        const sph = pop / lgis;
        if (sph < 150) {
          alerts.push({
            feature: f,
            type: 'density',
            title: 'SPH Kritis',
            desc: `${blockName}: Kerapatan ${Math.round(sph)} pohon/Ha`,
            severity: 'high',
          });
        }
      }

      // 2. Active PICA Issue
      if (p.pica && p.pica.trim() !== '' && p.pica !== 'null') {
        alerts.push({
          feature: f,
          type: 'pica',
          title: 'Isu Operasional (PICA)',
          desc: `${blockName}: Kendala '${p.pica}'`,
          severity: 'high',
        });
      }

      // 3. Low Productivity (< 15 kg/Ha)
      const protas = p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
      if (lgis > 0 && protas > 0 && p.status && p.status.toUpperCase().includes('TM')) {
        const yieldPerHa = protas / lgis;
        if (yieldPerHa < 15) {
          alerts.push({
            feature: f,
            type: 'productivity',
            title: 'Produktivitas Rendah',
            desc: `${blockName}: Hasil ${Math.round(yieldPerHa)} kg/Ha`,
            severity: 'medium',
          });
        }
      }

      // 4. Old Tree Replanting Warning (> 25 years old)
      if (p.thn_tanam) {
        try {
          const plantYear = parseInt(p.thn_tanam.toString().replace(/[^0-9]/g, ''), 10);
          if (!isNaN(plantYear) && plantYear > 1900) {
            const age = 2026 - plantYear;
            if (age > 25) {
              alerts.push({
                feature: f,
                type: 'replanting',
                title: 'Butuh Replanting',
                desc: `${blockName}: Tanaman berumur ${age} tahun`,
                severity: 'medium',
              });
            }
          }
        } catch {}
      }
    });
  }

  return (
    <div
      style={{
        width: collapsed ? '48px' : '300px',
        transition: 'width 0.15s cubic-bezier(0.2, 0, 0.38, 0.9)',
        overflow: 'hidden',
        background: '#ffffff',
        borderRight: '1px solid var(--cds-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Collapse Toggle Button Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: '8px 12px',
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
          title={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
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
              d="M10 4L6 8L10 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Carbon Styled Tab Selector */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--cds-border)',
              background: '#ffffff',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setActiveTab('filter')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'filter' ? '#ffffff' : '#f4f4f4',
                border: 'none',
                borderBottom: activeTab === 'filter' ? '3px solid var(--cds-primary)' : '3px solid transparent',
                color: activeTab === 'filter' ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Filter Kebun
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'alerts' ? '#ffffff' : '#f4f4f4',
                border: 'none',
                borderBottom: activeTab === 'alerts' ? '3px solid var(--cds-primary)' : '3px solid transparent',
                color: activeTab === 'alerts' ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              Peringatan
              {alerts.length > 0 && (
                <span
                  style={{
                    background: 'var(--cds-support-error)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: '0px',
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </button>
          </div>

          {/* Panel Content Area */}
          <div
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
              flex: 1,
              background: '#ffffff',
            }}
          >
            {activeTab === 'filter' && (
              <>
                {/* Visual Detail Level Selector (Segmented Control) */}
                <div>
                  <div style={sectionLabel}>Detail Peta</div>
                  <div
                    style={{
                      display: 'flex',
                      background: '#e0e0e0',
                      padding: '2px',
                      borderRadius: '0px',
                      marginBottom: '12px',
                    }}
                  >
                    <button
                      onClick={() => onDetailLevelChange('block')}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: detailLevel === 'block' ? '#ffffff' : 'transparent',
                        border: 'none',
                        color: 'var(--cds-text-primary)',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    >
                      Per Blok (Afdeling)
                    </button>
                    <button
                      onClick={() => onDetailLevelChange('kebun')}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: detailLevel === 'kebun' ? '#ffffff' : 'transparent',
                        border: 'none',
                        color: 'var(--cds-text-primary)',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    >
                      Per Kebun
                    </button>
                  </div>
                </div>

                {/* View Mode Selector */}
                <div>
                  <div style={sectionLabel}>Tampilan Analisis</div>
                  <select
                    value={viewMode}
                    onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid var(--cds-border-strong)',
                      borderBottom: '2px solid var(--cds-border-strong)',
                      color: 'var(--cds-text-primary)',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: 'inherit',
                      borderRadius: '0px',
                    }}
                  >
                    <option value="default">Tampilan Wilayah Kebun</option>
                    <option value="productivity">Produktivitas Lahan (kg/Ha)</option>
                    <option value="age">Umur Lahan Tanaman</option>
                    <option value="density">Kerapatan Pohon (Pohon/Ha)</option>
                  </select>
                </div>

                {/* Show Empty Data Toggle Checkbox */}
                {viewMode !== 'default' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <input
                      id="show-empty-checkbox"
                      type="checkbox"
                      checked={showEmptyData}
                      onChange={(e) => onShowEmptyDataChange(e.target.checked)}
                      style={{
                        width: '14px',
                        height: '14px',
                        cursor: 'pointer',
                        accentColor: 'var(--cds-primary)',
                      }}
                    />
                    <label
                      htmlFor="show-empty-checkbox"
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--cds-text-secondary)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        fontWeight: '500',
                      }}
                    >
                      Tampilkan Data Kosong (Abu-abu)
                    </label>
                  </div>
                )}

                {/* Stats Summary Tile */}
                {stats && (
                  <div>
                    <div style={sectionLabel}>Ringkasan Kebun</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <StatMini
                        label="Total Blok"
                        value={stats.total_blok.toLocaleString('id-ID')}
                        color="#006A4E"
                      />
                      <StatMini
                        label="Luas (Ha)"
                        value={stats.total_luas_gis.toLocaleString('id-ID', {
                          maximumFractionDigits: 1,
                        })}
                        color="#1CC729"
                      />
                    </div>
                  </div>
                )}

                {/* Kebun Filter Checklist */}
                <div>
                  <div
                    style={{
                      ...sectionLabel,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Filter Kebun</span>
                    <button onClick={handleToggleAll} style={toggleAllStyle}>
                      {activeKebun.length === kebunList.length ? 'Kosongkan' : 'Pilih'} Semua
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {loading
                      ? [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
                      : kebunList.map((kebun) => {
                          const isActive = activeKebun.includes(kebun);
                          const color = KEBUN_COLORS[kebun] || '#848684';
                          const kebunStat = stats?.per_kebun.find((s) => s.kebun === kebun);
                          return (
                             <div
                               key={kebun}
                               style={{
                                 display: 'flex',
                                 alignItems: 'stretch',
                                 width: '100%',
                                 background: 'var(--cds-border)',
                                 gap: '1px',
                               }}
                             >
                               <button
                                 onClick={() => onToggleKebun(kebun)}
                                 style={{
                                   flex: 1,
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '12px',
                                   padding: '10px 12px',
                                   background: isActive ? '#f4f4f4' : '#ffffff',
                                   borderTop: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   borderRight: 'none',
                                   borderBottom: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   borderLeft: `4px solid ${color}`,
                                   cursor: 'pointer',
                                   textAlign: 'left',
                                   transition: 'all 0.1s ease',
                                   fontFamily: 'inherit',
                                   borderRadius: '0px',
                                 }}
                               >
                                 <div style={{ flex: 1, minWidth: 0 }}>
                                   <div
                                     style={{
                                       fontSize: '13px',
                                       fontWeight: '600',
                                       color: 'var(--cds-text-primary)',
                                     }}
                                   >
                                     Kebun {getKebunDisplayName(kebun)}
                                   </div>
                                   {kebunStat && (
                                     <div
                                       style={{
                                         fontSize: '11px',
                                         color: 'var(--cds-text-secondary)',
                                         marginTop: '2px',
                                       }}
                                     >
                                       {kebunStat.jumlah_blok} blok ·{' '}
                                       {kebunStat.total_luas.toLocaleString('id-ID', {
                                         maximumFractionDigits: 1,
                                       })}{' '}
                                       Ha
                                     </div>
                                   )}
                                 </div>
                                 <div
                                   style={{
                                     width: '14px',
                                     height: '14px',
                                     border: '1.5px solid var(--cds-border-strong)',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     flexShrink: 0,
                                     background: isActive ? 'var(--cds-primary)' : 'transparent',
                                     borderColor: isActive ? 'var(--cds-primary)' : 'var(--cds-border-strong)',
                                   }}
                                 >
                                   {isActive && (
                                     <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                       <path
                                         d="M2 5L4 7L8 3"
                                         stroke="white"
                                         strokeWidth="2.5"
                                         strokeLinecap="round"
                                       />
                                     </svg>
                                   )}
                                 </div>
                               </button>

                               {/* Aggregate Chart Action Button */}
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (onSelectKebunAnalysis) {
                                     onSelectKebunAnalysis(kebun);
                                   }
                                 }}
                                 style={{
                                   width: '40px',
                                   background: '#ffffff',
                                   border: 'none',
                                   borderTop: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   borderBottom: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   borderRight: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   cursor: 'pointer',
                                   color: 'var(--cds-primary)',
                                   transition: 'background 0.1s ease',
                                   borderRadius: '0px',
                                 }}
                                 title={`Analisis Graf Kebun ${kebun}`}
                                 onMouseEnter={(e) => e.currentTarget.style.background = '#f4f4f4'}
                                 onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                               >
                                 <svg width="16" height="16" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
                                   <path d="M4 4v24h24" />
                                   <path d="M8 20l6-6 6 6 8-8" />
                                 </svg>
                               </button>
                             </div>
                          );
                        })}
                  </div>
                </div>

                {/* Komoditi breakdown */}
                {stats && stats.per_komoditi.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Distribusi Komoditi</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stats.per_komoditi.map((k) => (
                        <div key={k.komoditi} style={komoditiRowStyle}>
                          <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', fontWeight: '500' }}>
                            {k.komoditi}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--cds-text-primary)', fontWeight: '600' }}>
                            {k.total_luas.toLocaleString('id-ID', { maximumFractionDigits: 0 })} Ha
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'alerts' && (
              <>
                <div style={sectionLabel}>Daftar Blok Bermasalah</div>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cds-text-muted)', fontSize: '12px' }}>
                    ✅ Tidak ada isu kritis terdeteksi pada blok kebun saat ini.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alerts.map((item, index) => {
                      const isHigh = item.severity === 'high';
                      return (
                        <button
                          key={index}
                          onClick={() => onSelectFeature(item.feature)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '10px 12px',
                            background: '#ffffff',
                            borderTop: '1px solid var(--cds-border)',
                            borderRight: '1px solid var(--cds-border)',
                            borderBottom: '1px solid var(--cds-border)',
                            borderLeft: `4px solid ${isHigh ? 'var(--cds-support-error)' : 'var(--cds-support-warning)'}`,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            fontFamily: 'inherit',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f4f4f4';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                color: isHigh ? 'var(--cds-support-error)' : '#b27b00',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {item.title}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--cds-text-secondary)',
                              lineHeight: '1.4',
                            }}
                          >
                            {item.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: '#ffffff',
        borderTop: '1px solid var(--cds-border)',
        borderRight: '1px solid var(--cds-border)',
        borderBottom: '1px solid var(--cds-border)',
        borderLeft: `3px solid ${color}`,
        borderRadius: '0px',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--cds-text-primary)',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        height: '48px',
        background: '#f4f4f4',
        border: '1px solid var(--cds-border)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: 'var(--cds-text-secondary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '8px',
};

const komoditiRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#f4f4f4',
  border: '1px solid var(--cds-border)',
};

const toggleAllStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--cds-primary)',
  fontSize: '11px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: '600',
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

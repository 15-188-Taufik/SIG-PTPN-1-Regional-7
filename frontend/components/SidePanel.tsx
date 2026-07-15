'use client';

import { useState } from 'react';
import { StatsResponse, GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import { ViewMode } from './MapView';

const KEBUN_COLORS: Record<string, string> = {
  'Unit Bekri': '#0072B2',
  'Unit Bergen': '#009E73',
  'Unit Rejosari': '#CC79A7',
  'Unit Way Berulu': '#E69F00',
  'Unit Kedaton': '#56B4E9',
};

export function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  if (norm.toLowerCase() === 'wabe') return 'Way Berulu';
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
  onHighlightKebun?: (kebun: string) => void;
  onUploadSuccess?: () => void;
  detailLevel: 'block' | 'afdeling' | 'kebun';
  onDetailLevelChange: (level: 'block' | 'afdeling' | 'kebun') => void;
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
  onHighlightKebun,
  onUploadSuccess,
  detailLevel,
  onDetailLevelChange,
  collapsed,
  onToggleCollapse,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'filter' | 'alerts' | 'upload'>('filter');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [expandedKebunAlerts, setExpandedKebunAlerts] = useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  function toggleKebunAlerts(kebun: string) {
    setExpandedKebunAlerts((prev) => ({
      ...prev,
      [kebun]: !prev[kebun],
    }));
  }

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
              onClick={() => {
                setActiveTab('filter');
                setUploadResult(null);
              }}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: activeTab === 'filter' ? '#ffffff' : '#f4f4f4',
                border: 'none',
                borderBottom: activeTab === 'filter' ? '3px solid var(--cds-primary)' : '3px solid transparent',
                color: activeTab === 'filter' ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Filter Kebun
            </button>
            <button
              onClick={() => {
                setActiveTab('alerts');
                setUploadResult(null);
              }}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: activeTab === 'alerts' ? '#ffffff' : '#f4f4f4',
                border: 'none',
                borderBottom: activeTab === 'alerts' ? '3px solid var(--cds-primary)' : '3px solid transparent',
                color: activeTab === 'alerts' ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
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
                    padding: '1px 5px',
                    borderRadius: '0px',
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                setUploadResult(null);
              }}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: activeTab === 'upload' ? '#ffffff' : '#f4f4f4',
                border: 'none',
                borderBottom: activeTab === 'upload' ? '3px solid var(--cds-primary)' : '3px solid transparent',
                color: activeTab === 'upload' ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              Upload Data
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
                {/* Search Box Section */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <div style={sectionLabel}>Cari Blok / Afdeling</div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', color: '#8d8d8d', fontSize: '14px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Cari Kode Blok, No Polygon, Afdeling..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => {
                        // Delay blurring slightly to allow click event to register on dropdown items
                        setTimeout(() => setIsSearchFocused(false), 200);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 30px',
                        background: '#ffffff',
                        border: '1px solid #8d8d8d',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        color: '#161616',
                        borderRadius: '0px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchQuery('');
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#8d8d8d',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchFocused && (() => {
                    if (!searchQuery.trim() || !geojsonData) return null;
                    const q = searchQuery.toLowerCase().trim();
                    const matches: GeoJSONFeature[] = [];
                    for (const feat of geojsonData.features) {
                      const p = feat.properties;
                      const blockCode = (p.kode_blok || '').toString().toLowerCase();
                      const polygonNo = (p.no_polygon || '').toString().toLowerCase();
                      const afd = (p.afdeling || '').toString().toLowerCase();
                      const kebunName = (p.kebun || '').toString().toLowerCase();
                      
                      if (
                        blockCode.includes(q) ||
                        polygonNo.includes(q) ||
                        afd.includes(q) ||
                        (q.length > 2 && kebunName.includes(q))
                      ) {
                        matches.push(feat);
                        if (matches.length >= 8) break;
                      }
                    }

                    if (matches.length === 0 && searchQuery.trim().length > 1) {
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #8d8d8d',
                            borderTop: 'none',
                            zIndex: 9999,
                            padding: '10px 12px',
                            fontSize: '11px',
                            color: '#8d8d8d',
                            fontStyle: 'italic',
                            textAlign: 'center',
                          }}
                        >
                          Tidak ada blok atau afdeling yang cocok.
                        </div>
                      );
                    }

                    if (matches.length > 0) {
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #8d8d8d',
                            borderTop: 'none',
                            zIndex: 9999,
                            maxHeight: '240px',
                            overflowY: 'auto',
                          }}
                        >
                          {matches.map((feat, idx) => {
                            const p = feat.properties;
                            const displayName = getKebunDisplayName(p.kebun);
                            const afdName = p.afdeling ? `Afd ${p.afdeling}` : 'Afd -';
                            const blockCode = p.kode_blok || p.no_polygon || 'Blok';
                            
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  onSelectFeature(feat);
                                  setSearchQuery(`${blockCode} (${afdName})`);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: idx < matches.length - 1 ? '1px solid #e0e0e0' : 'none',
                                  fontSize: '11px',
                                  fontFamily: 'inherit',
                                  transition: 'background-color 0.15s',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f4f4f4';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                              >
                                <div style={{ fontWeight: '700', color: 'var(--cds-primary)', marginBottom: '2px' }}>
                                  Blok {blockCode}
                                </div>
                                <div style={{ color: '#525252' }}>
                                  Kebun {displayName} &middot; {afdName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

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
                        padding: '6px 6px',
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
                      Blok
                    </button>
                    <button
                      onClick={() => onDetailLevelChange('afdeling')}
                      style={{
                        flex: 1,
                        padding: '6px 6px',
                        background: detailLevel === 'afdeling' ? '#ffffff' : 'transparent',
                        border: 'none',
                        color: 'var(--cds-text-primary)',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                      }}
                    >
                      Afdeling
                    </button>
                    <button
                      onClick={() => onDetailLevelChange('kebun')}
                      style={{
                        flex: 1,
                        padding: '6px 6px',
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
                      Kebun
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
                               {/* Card Button: Highlights/zooms to kebun */}
                               <button
                                 onClick={() => onHighlightKebun && onHighlightKebun(kebun)}
                                 style={{
                                   flex: 1,
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '12px',
                                   padding: '10px 12px',
                                   background: '#ffffff',
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
                                 title={`Klik untuk menyoroti kebun ${getKebunDisplayName(kebun)}`}
                                 onMouseEnter={(e) => e.currentTarget.style.background = '#f4f4f4'}
                                 onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
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
                               </button>

                               {/* Checkbox Button: Toggles kebun on/off on map */}
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onToggleKebun(kebun);
                                 }}
                                 style={{
                                   width: '40px',
                                   background: '#ffffff',
                                   border: 'none',
                                   borderTop: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   borderBottom: `1px solid ${isActive ? 'var(--cds-border-strong)' : 'var(--cds-border)'}`,
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   cursor: 'pointer',
                                   color: 'var(--cds-primary)',
                                   transition: 'background 0.1s ease',
                                   borderRadius: '0px',
                                 }}
                                 title={isActive ? 'Sembunyikan dari peta' : 'Tampilkan di peta'}
                                 onMouseEnter={(e) => e.currentTarget.style.background = '#f4f4f4'}
                                 onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                               >
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

            {activeTab === 'alerts' && (() => {
              // Group alerts by kebun name
              const alertsByKebun: Record<string, AlertItem[]> = {};
              alerts.forEach((alert) => {
                const k = alert.feature.properties.kebun || 'Tidak Diketahui';
                if (!alertsByKebun[k]) {
                  alertsByKebun[k] = [];
                }
                alertsByKebun[k].push(alert);
              });

              return (
                <>
                  <div style={sectionLabel}>Daftar Blok Bermasalah</div>
                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cds-text-muted)', fontSize: '12px' }}>
                      ✅ Tidak ada isu kritis terdeteksi pada blok kebun saat ini.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(alertsByKebun)
                        .sort(([a], [b]) => {
                          if (a.toLowerCase() === 'kso') return 1;
                          if (b.toLowerCase() === 'kso') return -1;
                          return a.localeCompare(b);
                        })
                        .map(([kebun, items]) => {
                          const isExpanded = !!expandedKebunAlerts[kebun];
                          const displayName = getKebunDisplayName(kebun);
                          const hasHighSeverity = items.some((item) => item.severity === 'high');

                          return (
                            <div
                              key={kebun}
                              style={{
                                border: '1px solid var(--cds-border)',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              {/* Accordion Group Header Button */}
                              <button
                                onClick={() => toggleKebunAlerts(kebun)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: isExpanded ? '#f4f4f4' : '#ffffff',
                                  border: 'none',
                                  borderLeft: `4px solid ${hasHighSeverity ? 'var(--cds-support-error)' : 'var(--cds-support-warning)'}`,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontFamily: 'inherit',
                                  transition: 'background 0.1s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {/* Expand/Collapse Chevron Indicator */}
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    style={{
                                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                                      transition: 'transform 0.15s ease-in-out',
                                      color: 'var(--cds-text-secondary)',
                                    }}
                                  >
                                    <path
                                      d="M6 4L10 8L6 12"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--cds-text-primary)' }}>
                                    Kebun {displayName}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    background: hasHighSeverity ? 'var(--cds-support-error)' : '#b27b00',
                                    color: '#ffffff',
                                    fontSize: '9.5px',
                                    fontWeight: '700',
                                    padding: '2px 6px',
                                    borderRadius: '0px',
                                  }}
                                >
                                  {items.length} Isu
                                </span>
                              </button>

                              {/* Accordion Group Content */}
                              {isExpanded && (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1px',
                                    background: 'var(--cds-border)',
                                    paddingTop: '1px',
                                  }}
                                >
                                  {items.map((item, idx) => {
                                    const isHigh = item.severity === 'high';
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => onSelectFeature(item.feature)}
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          padding: '10px 12px 10px 24px', // Indented alerts list
                                          background: '#ffffff',
                                          border: 'none',
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
                                              fontSize: '9px',
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
                                          {item.desc.replace(/^[^-]+-\s*/, '') /* Remove redundant kebun prefix */}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              );
            })()}

            {activeTab === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cds-text-primary)' }}>
                  Unggah Data Baru (.geojson)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '1.5' }}>
                  Unggah berkas GeoJSON untuk menambahkan blok baru atau memperbarui data blok yang sudah ada. 
                  Sistem akan mencocokkan kode polygon (`no_polygon`) untuk mencegah duplikasi data.
                </div>

                {/* Dropzone area */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                        setSelectedFile(file);
                        setUploadResult(null);
                      } else {
                        setUploadResult({ success: false, message: 'Hanya berkas .geojson atau .json yang didukung.' });
                      }
                    }
                  }}
                  style={{
                    border: '1px dashed var(--cds-border-strong)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f4f4f4',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '120px',
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.geojson,.json';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files[0]) {
                        setSelectedFile(files[0]);
                        setUploadResult(null);
                      }
                    };
                    input.click();
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--cds-text-secondary)', transition: 'transform 0.15s ease' }}>
                    <path d="M6 20v6h20v-6M16 4v16M9 11l7-7 7 7" />
                  </svg>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--cds-text-primary)' }}>
                    {selectedFile ? selectedFile.name : 'Pilih berkas GeoJSON'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)' }}>
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Tarik & lepas file di sini atau klik untuk menjelajah'}
                  </div>
                </div>

                {selectedFile && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (!selectedFile) return;
                        setUploading(true);
                        setUploadResult(null);
                        try {
                          const { uploadGeoJSON } = await import('@/lib/api');
                          const res = await uploadGeoJSON(selectedFile);
                          setUploadResult({
                            success: true,
                            message: res.message || 'Data berhasil diunggah dan disinkronkan.',
                          });
                          setSelectedFile(null);
                          if (onUploadSuccess) {
                            onUploadSuccess();
                          }
                        } catch (err: any) {
                          setUploadResult({
                            success: false,
                            message: err.response?.data?.detail || err.message || 'Gagal mengunggah data.',
                          });
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'var(--cds-primary)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {uploading ? 'Mengunggah...' : 'Proses Impor'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadResult(null);
                      }}
                      disabled={uploading}
                      style={{
                        padding: '10px 16px',
                        background: 'transparent',
                        color: 'var(--cds-text-primary)',
                        border: '1px solid var(--cds-border-strong)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Batal
                    </button>
                  </div>
                )}

                {uploadResult && (
                  <div
                    style={{
                      padding: '12px',
                      background: uploadResult.success ? '#e5f6ed' : '#fdf3f2',
                      borderLeft: `4px solid ${uploadResult.success ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}`,
                      fontSize: '12px',
                      color: 'var(--cds-text-primary)',
                      lineHeight: '1.4',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {uploadResult.success ? 'Sukses' : 'Gagal'}
                    </div>
                    {uploadResult.message}
                  </div>
                )}
              </div>
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

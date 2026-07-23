'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatsResponse, GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import { ViewMode } from './MapView';

const KEBUN_COLORS: Record<string, string> = {
  'Unit Way Berulu': '#0072B2',
  'Unit Bergen': '#009E73',
  'Unit Way Lima': '#CC79A7',
  'Unit Tulungbuyut': '#E69F00',
  'Unit Kedaton': '#56B4E9',
};

export function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  const lower = norm.toLowerCase();
  if (lower === 'wabe' || lower === 'unit bekri') return 'Unit Way Berulu';
  if (lower === 'wali' || lower === 'unit rejosari') return 'Unit Way Lima';
  if (lower === 'tubu') return 'Unit Tulungbuyut';
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
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Constrain width between 240px and 600px
      const newWidth = Math.max(240, Math.min(600, e.clientX));
      setWidth(newWidth);
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
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? '48px' : `${width}px`,
        transition: isResizing ? 'none' : 'width 0.15s cubic-bezier(0.2, 0, 0.38, 0.9)',
        overflow: 'hidden',
        background: '#ffffff',
        borderRight: '1px solid var(--cds-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        zIndex: 1000,
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
                      let isMatch = false;
                      for (const value of Object.values(p)) {
                        if (value !== null && value !== undefined && value !== '') {
                          if (value.toString().toLowerCase().includes(q)) {
                            isMatch = true;
                            break;
                          }
                        }
                      }
                      if (isMatch) {
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
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  console.log('🔍 [SidePanel] Search result selected:', p.kode_blok, p.kebun, p.afdeling);
                                  onSelectFeature(feat);
                                  setSearchQuery(`${blockCode} (${afdName})`);
                                  setIsSearchFocused(false);
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
                                {p.nomor_peta && (
                                  <div style={{ color: '#6f6f6f', fontSize: '9px', marginTop: '2px' }}>
                                    No. Peta: {p.nomor_peta}
                                  </div>
                                )}
                                {p.keterangan && p.keterangan !== 'null' && (
                                  <div style={{ color: '#8d8d8d', fontSize: '9px', fontStyle: 'italic', marginTop: '1px' }}>
                                    Ket: {p.keterangan}
                                  </div>
                                )}
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
                  <div style={sectionLabel}>Garis Tepi Berdasarkan </div>
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


                {/* Stats Summary Tile */}
                {stats && (
                  <div>
                    <div style={sectionLabel}>Ringkasan Kebun</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <StatMini
                        label="Total Blok"
                        value={stats.total_blok.toLocaleString('id-ID')}
                        color="#006A4E"
                      />
                      <StatMini
                        label="Luas GIS"
                        value={`${stats.total_luas_gis.toLocaleString('id-ID', {
                          maximumFractionDigits: 1,
                        })} Ha`}
                        color="#0F62FE"
                      />
                      <StatMini
                        label="Luas RKAP"
                        value={`${stats.total_luas_rkap.toLocaleString('id-ID', {
                          maximumFractionDigits: 1,
                        })} Ha`}
                        color="#24A148"
                      />
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

      {/* Resize Handler Handle */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
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


function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

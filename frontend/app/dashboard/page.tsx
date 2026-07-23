'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchKebun, fetchStats, fetchKebunList } from '@/lib/api';
import { clearToken, isAuthenticated } from '@/lib/auth';
import { FeatureCollection, GeoJSONFeature, StatsResponse } from '@/types/kebun';

import InfoDrawer from '@/components/InfoDrawer';
import SidePanel from '@/components/SidePanel';
import RightFilterPanel from '@/components/RightFilterPanel';
import type { ViewMode } from '@/components/MapView';
import CarbonLoader from '@/components/CarbonLoader';
import HeaderNav from '@/components/HeaderNav';

// Dynamically import Leaflet map (client-side only, no SSR)
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();

  const [geojsonData, setGeojsonData] = useState<FeatureCollection | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [kebunList, setKebunList] = useState<string[]>([]);
  const [activeKebun, setActiveKebun] = useState<string[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [showEmptyData, setShowEmptyData] = useState(true);
  const [selectedKebunAnalysis, setSelectedKebunAnalysis] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<'block' | 'afdeling' | 'kebun'>('block');
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Looker Studio style filters
  const [selectedCropStatus, setSelectedCropStatus] = useState<string>('Semua');
  const [selectedYearMin, setSelectedYearMin] = useState<number>(1990);
  const [selectedYearMax, setSelectedYearMax] = useState<number>(2026);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(280);

  const mapInstanceRef = useRef<any>(null);

  // Set mounted status on client load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  // Toggle loading class on body during initial dashboard API fetching
  useEffect(() => {
    if (loading) {
      document.body.classList.add('loading-state');
    } else {
      document.body.classList.remove('loading-state');
    }
    return () => document.body.classList.remove('loading-state');
  }, [loading]);

  // Load initial data in parallel
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (!geojsonData || forceRefresh) {
        setLoading(true);
      }
      const [geoData, statsData, listData] = await Promise.all([
        fetchKebun(undefined, forceRefresh),
        fetchStats(forceRefresh),
        fetchKebunList(forceRefresh),
      ]);
      const sortedList = [...listData].sort((a, b) => a.localeCompare(b));
      setGeojsonData(geoData);
      setStats(statsData);
      setKebunList(sortedList);
      
      setActiveKebun((prev) => {
        if (prev.length > 0) {
          return prev.filter((k) => sortedList.includes(k));
        }
        return sortedList;
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Gagal memuat data. Periksa koneksi ke server.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [geojsonData]);

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleKebun = useCallback((kebun: string) => {
    setActiveKebun((prev) =>
      prev.includes(kebun) ? prev.filter((k) => k !== kebun) : [...prev, kebun]
    );
  }, []);

  const handleHighlightKebun = useCallback((kebun: string) => {
    if (!mapInstanceRef.current || !geojsonData) return;
    const kebunFeatures = geojsonData.features.filter(
      (f) => f.properties.kebun && f.properties.kebun.toLowerCase() === kebun.toLowerCase()
    );
    if (kebunFeatures.length > 0) {
      const L = require('leaflet');
      try {
        const tempLayer = L.geoJSON({ type: 'FeatureCollection', features: kebunFeatures });
        const bounds = tempLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.flyToBounds(bounds, { 
            padding: [60, 60],
            animate: true,
            duration: 1.5
          });
        }
      } catch (err) {
        console.error('Error fitting bounds for kebun:', err);
      }
    }
  }, [geojsonData]);

  const handleFeatureClick = useCallback((feature: GeoJSONFeature) => {
    setSelectedKebunAnalysis(null);
    setSelectedFeature(feature);
  }, []);

  const handleSelectFeatureFromAlert = useCallback((feature: GeoJSONFeature) => {
    console.log('🚀 [DashboardPage] handleSelectFeatureFromAlert called:', feature.properties);
    setSelectedKebunAnalysis(null);
    setDetailLevel('block');

    const kebun = feature.properties.kebun;
    if (kebun) {
      setActiveKebun((prev) => {
        if (prev.length > 0 && !prev.includes(kebun)) {
          console.log('📌 [DashboardPage] Automatically activating kebun filter:', kebun);
          return [...prev, kebun];
        }
        return prev;
      });
    }

    setSelectedFeature({ ...feature, _ts: Date.now() } as any);
  }, []);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  // 1. Recalculate filtered GeoJSON features on the fly based on Looker filters
  const filteredGeojsonData = useMemo(() => {
    if (!geojsonData) return null;
    
    let features = geojsonData.features;

    // Filter by active Kebun
    if (activeKebun.length > 0) {
      features = features.filter((f) => activeKebun.includes(f.properties.kebun || ''));
    }

    // Filter by Crop Status
    if (selectedCropStatus !== 'Semua') {
      features = features.filter((f) => {
        const s = (f.properties.status || '').toLowerCase();
        if (selectedCropStatus === 'TM') return s.includes('tm');
        if (selectedCropStatus === 'TBM') return s.includes('tbm');
        return false;
      });
    }

    // Filter by Planting Year Range
    features = features.filter((f) => {
      const yr = f.properties.thn_tanam;
      if (!yr) return true;
      const plantYear = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
      if (isNaN(plantYear) || plantYear < 1900) return true;
      return plantYear >= selectedYearMin && plantYear <= selectedYearMax;
    });

    return { ...geojsonData, features };
  }, [geojsonData, activeKebun, selectedCropStatus, selectedYearMin, selectedYearMax]);

  // 2. Recalculate dashboard statistics dynamically based on Looker active filters
  const computedStats = useMemo(() => {
    if (!geojsonData) return null;

    // Base filtered features before applying Kebun unit filter (for per-kebun counts)
    let baseFiltered = geojsonData.features;

    if (selectedCropStatus !== 'Semua') {
      baseFiltered = baseFiltered.filter((f) => {
        const s = (f.properties.status || '').toLowerCase();
        if (selectedCropStatus === 'TM') return s.includes('tm');
        if (selectedCropStatus === 'TBM') return s.includes('tbm');
        return false;
      });
    }

    baseFiltered = baseFiltered.filter((f) => {
      const yr = f.properties.thn_tanam;
      if (!yr) return true;
      const plantYear = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
      if (isNaN(plantYear) || plantYear < 1900) return true;
      return plantYear >= selectedYearMin && plantYear <= selectedYearMax;
    });

    // Compute per-kebun list based on these baseFiltered features
    const kebunStatsMap: Record<string, { jumlah_blok: number; total_luas: number }> = {};
    kebunList.forEach((k) => {
      kebunStatsMap[k] = { jumlah_blok: 0, total_luas: 0 };
    });

    baseFiltered.forEach((f) => {
      const k = f.properties.kebun;
      if (k && kebunStatsMap[k] !== undefined) {
        kebunStatsMap[k].jumlah_blok += 1;
        kebunStatsMap[k].total_luas += f.properties.l_gis || 0;
      }
    });

    const per_kebun = Object.entries(kebunStatsMap).map(([name, stat]) => ({
      kebun: name,
      jumlah_blok: stat.jumlah_blok,
      total_luas: stat.total_luas
    }));

    // Apply activeKebun filter for final overall totals
    let finalFiltered = baseFiltered;
    if (activeKebun.length > 0) {
      finalFiltered = finalFiltered.filter((f) => activeKebun.includes(f.properties.kebun || ''));
    }

    let total_blok = finalFiltered.length;
    let total_luas_gis = 0;
    let total_luas_rkap = 0;

    finalFiltered.forEach((f) => {
      total_luas_gis += f.properties.l_gis || 0;
      total_luas_rkap += f.properties.l_rkap || 0;
    });

    return {
      total_blok,
      total_luas_gis,
      total_luas_rkap,
      per_kebun,
      per_komoditi: [],
      per_status: []
    } as StatsResponse;
  }, [geojsonData, activeKebun, selectedCropStatus, selectedYearMin, selectedYearMax, kebunList]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--cds-background)',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Top Header Navigation */}
      <HeaderNav />

      {/* Main Grid Area */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Left Docked Sidebar */}
        <SidePanel
          kebunList={kebunList}
          activeKebun={activeKebun}
          onToggleKebun={handleToggleKebun}
          onHighlightKebun={handleHighlightKebun}
          onUploadSuccess={loadData}
          stats={computedStats}
          loading={loading}
          onLogout={handleLogout}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showEmptyData={showEmptyData}
          onShowEmptyDataChange={setShowEmptyData}
          geojsonData={filteredGeojsonData}
          onSelectFeature={handleSelectFeatureFromAlert}
          onSelectKebunAnalysis={setSelectedKebunAnalysis}
          detailLevel={detailLevel}
          onDetailLevelChange={(level) => {
            setSelectedFeature(null);
            setSelectedKebunAnalysis(null);
            setDetailLevel(level);
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onWidthChange={setSidebarWidth}
        />

        {/* Center/Right Spacious Content View */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            background: 'var(--cds-background)',
          }}
        >
          {error && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: '16px',
                zIndex: 1000,
                background: '#fff0f0',
                border: '1px solid #ffb3b3',
                borderLeft: '4px solid var(--cds-support-error)',
                padding: '12px 16px',
                color: 'var(--cds-support-error)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: '700',
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Map View */}
          {!loading ? (
            <MapView
              geojsonData={filteredGeojsonData}
              onFeatureClick={handleFeatureClick}
              activeKebun={activeKebun}
              viewMode={viewMode}
              showEmptyData={showEmptyData}
              detailLevel={detailLevel}
              selectedFeature={selectedFeature}
              mapInstanceRef={mapInstanceRef}
              rightOffset={rightSidebarCollapsed ? 48 : rightSidebarWidth}
              leftOffset={sidebarCollapsed ? 48 : sidebarWidth}
            />
          ) : (
            <CarbonLoader overlay description="Memuat Peta & Data SIG..." />
          )}
        </div>

        {/* Bottom sliding InfoDrawer */}
        <InfoDrawer
          feature={selectedFeature}
          kebunName={selectedKebunAnalysis}
          geojsonData={filteredGeojsonData}
          onClose={() => {
            setSelectedFeature(null);
            setSelectedKebunAnalysis(null);
          }}
        />

        {/* Right Docked Filter Panel (Looker Center) */}
        <RightFilterPanel
          kebunList={kebunList}
          activeKebun={activeKebun}
          onToggleKebun={handleToggleKebun}
          onHighlightKebun={handleHighlightKebun}
          selectedCropStatus={selectedCropStatus}
          onCropStatusChange={setSelectedCropStatus}
          selectedYearMin={selectedYearMin}
          onYearMinChange={setSelectedYearMin}
          selectedYearMax={selectedYearMax}
          onYearMaxChange={setSelectedYearMax}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showEmptyData={showEmptyData}
          onShowEmptyDataChange={setShowEmptyData}
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          onWidthChange={setRightSidebarWidth}
        />
      </div>
    </div>
  );
}

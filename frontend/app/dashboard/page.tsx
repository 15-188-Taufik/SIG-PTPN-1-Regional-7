'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchKebun, fetchStats, fetchKebunList } from '@/lib/api';
import { clearToken, isAuthenticated, getUsername } from '@/lib/auth';
import { FeatureCollection, GeoJSONFeature, StatsResponse } from '@/types/kebun';
import StatsBar from '@/components/StatsBar';
import InfoDrawer from '@/components/InfoDrawer';
import SidePanel from '@/components/SidePanel';
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

  // Load initial data in parallel (utilizing in-memory cache for instant tab switching)
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
      // Sort kebun names: alphabetical order, but KSO is placed at the very bottom
      const sortedList = [...listData].sort((a, b) => a.localeCompare(b));
      setGeojsonData(geoData);
      setStats(statsData);
      setKebunList(sortedList);
      
      // Preserve active selection status, otherwise set all active by default
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
            duration: 1.5 // 1.5 seconds smooth flying zoom transition
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
    setSelectedKebunAnalysis(null);
    setSelectedFeature(feature);

    if (mapInstanceRef.current && feature.geometry) {
      const L = require('leaflet');
      try {
        const tempLayer = L.geoJSON(feature);
        const bounds = tempLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.flyToBounds(bounds, { 
            padding: [80, 80], 
            maxZoom: 16,
            animate: true,
            duration: 1.2
          });
        }
      } catch (err) {
        console.error('Error flying to bounds:', err);
      }
    }
  }, []);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

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
          stats={stats}
          loading={loading}
          onLogout={handleLogout}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showEmptyData={showEmptyData}
          onShowEmptyDataChange={setShowEmptyData}
          geojsonData={geojsonData}
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
        />

        {/* Center/Right Spacious Content View */}
        <div
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
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
              geojsonData={geojsonData}
              onFeatureClick={handleFeatureClick}
              activeKebun={activeKebun}
              viewMode={viewMode}
              showEmptyData={showEmptyData}
              detailLevel={detailLevel}
              mapInstanceRef={mapInstanceRef}
            />
          ) : (
            <CarbonLoader overlay description="Memuat Peta & Data SIG..." />
          )}

          {/* Top-right floating Stats panel (Carbon light style) */}
          <StatsBar stats={stats} loading={loading} />

          {/* Bottom sliding InfoDrawer */}
          <InfoDrawer
            feature={selectedFeature}
            kebunName={selectedKebunAnalysis}
            geojsonData={geojsonData}
            onClose={() => {
              setSelectedFeature(null);
              setSelectedKebunAnalysis(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

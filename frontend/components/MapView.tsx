'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map } from 'leaflet';
import type { GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import * as turf from '@turf/turf';

export type ViewMode = 'default' | 'productivity' | 'age' | 'density';

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

function getKebunColor(kebun: string | null): string {
  if (!kebun) return '#848684';
  const key = Object.keys(KEBUN_COLORS).find(
    (k) => k.toLowerCase() === kebun.toLowerCase()
  );
  return key ? KEBUN_COLORS[key] : '#848684';
}

function getFeatureColor(
  feature: GeoJSONFeature,
  viewMode: ViewMode,
  showEmptyData: boolean
): string {
  const p = feature.properties;

  if (viewMode === 'default') {
    return getKebunColor(p.kebun);
  }

  if (viewMode === 'productivity') {
    const lgis = p.l_gis || 0;
    const protas = p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
    if (lgis <= 0 || protas <= 0) {
      return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
    }
    const yieldPerHa = protas / lgis;
    if (yieldPerHa < 15) return '#EF4444';      // Very Low
    if (yieldPerHa < 50) return '#F97316';      // Low
    if (yieldPerHa < 150) return '#FACC15';     // Medium
    if (yieldPerHa < 500) return '#A3E635';     // High
    return '#22C55E';                           // Very High
  }

  if (viewMode === 'age') {
    const yr = p.thn_tanam;
    if (!yr) {
      return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
    }
    try {
      const plantYear = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
      if (isNaN(plantYear) || plantYear < 1900) {
        return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
      }
      const age = 2026 - plantYear;
      if (age > 25) return '#EF4444';      // Tua / Rusak
      if (age > 15) return '#F97316';      // TM Tua
      if (age > 7) return '#15803D';       // TM Prima
      return '#38BDF8';                    // TBM / Muda
    } catch {
      return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
    }
  }

  if (viewMode === 'density') {
    const lgis = p.l_gis || 0;
    const pop = p.populasi || 0;
    if (lgis <= 0 || pop <= 0) {
      return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
    }
    const sph = pop / lgis;
    if (sph < 150) return '#EF4444';  // Kritis / Jarang
    if (sph < 350) return '#F97316';  // Kurang Padat
    if (sph < 500) return '#22C55E';  // Optimal
    return '#A855F7';                 // Sangat Rapat
  }

  return '#848684';
}

interface MapViewProps {
  geojsonData: FeatureCollection | null;
  onFeatureClick: (feature: GeoJSONFeature) => void;
  activeKebun: string[];
  viewMode: ViewMode;
  showEmptyData: boolean;
  detailLevel: 'block' | 'kebun';
  mapInstanceRef?: React.MutableRefObject<Map | null>;
}

export default function MapView({
  geojsonData,
  onFeatureClick,
  activeKebun,
  viewMode,
  showEmptyData,
  detailLevel,
  mapInstanceRef,
}: MapViewProps) {
  const [mapType, setMapType] = useState<'silver' | 'standard' | 'satellite' | 'dark'>('silver');
  const [roadsOpacity, setRoadsOpacity] = useState(0.4);
  const [placesOpacity, setPlacesOpacity] = useState(0.4);
  const [labelsOpacity, setLabelsOpacity] = useState(0.6);
  const [showTypePanel, setShowTypePanel] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const geojsonLayerRef = useRef<any>(null);

  const baseLayerRef = useRef<any>(null);
  const roadsLayerRef = useRef<any>(null);
  const placesLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);

  // Initialize map (runs once client-side)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = require('leaflet');

    const map = L.map(mapContainerRef.current, {
      center: [-5.2, 105.2],
      zoom: 11,
      zoomControl: true,
      preferCanvas: true,
    });

    mapRef.current = map;
    if (mapInstanceRef) {
      mapInstanceRef.current = map;
    }

    return () => {
      map.remove();
      mapRef.current = null;
      if (mapInstanceRef) {
        mapInstanceRef.current = null;
      }
    };
  }, [mapInstanceRef]);

  // Update map tiles based on mapType
  useEffect(() => {
    if (!mapRef.current) return;
    const L = require('leaflet');

    // Remove old layers if they exist
    if (baseLayerRef.current) mapRef.current.removeLayer(baseLayerRef.current);
    if (roadsLayerRef.current) mapRef.current.removeLayer(roadsLayerRef.current);
    if (placesLayerRef.current) mapRef.current.removeLayer(placesLayerRef.current);
    if (labelsLayerRef.current) mapRef.current.removeLayer(labelsLayerRef.current);

    let baseUrl = '';
    let labelsUrl = '';
    const roadsUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
    const placesUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    let attribution = '';

    if (mapType === 'silver') {
      baseUrl = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
      labelsUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://carto.com">CARTO</a>';
    } else if (mapType === 'standard') {
      baseUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
      labelsUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://carto.com">CARTO</a>';
    } else if (mapType === 'dark') {
      baseUrl = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
      labelsUrl = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://carto.com">CARTO</a>';
    } else if (mapType === 'satellite') {
      baseUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      labelsUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &copy; CARTO';
    }

    baseLayerRef.current = L.tileLayer(baseUrl, { attribution, maxZoom: 20 }).addTo(mapRef.current);
    
    roadsLayerRef.current = L.tileLayer(roadsUrl, {
      opacity: roadsOpacity,
      maxZoom: 20,
    }).addTo(mapRef.current);

    placesLayerRef.current = L.tileLayer(placesUrl, {
      opacity: placesOpacity,
      maxZoom: 20,
    }).addTo(mapRef.current);

    labelsLayerRef.current = L.tileLayer(labelsUrl, {
      opacity: labelsOpacity,
      maxZoom: 20,
    }).addTo(mapRef.current);

    // Ensure outlines & blocks stay on top of base layers
    if (geojsonLayerRef.current) {
      if (typeof geojsonLayerRef.current.bringToFront === 'function') {
        geojsonLayerRef.current.bringToFront();
      } else if (typeof geojsonLayerRef.current.eachLayer === 'function') {
        geojsonLayerRef.current.eachLayer((lyr: any) => {
          if (typeof lyr.bringToFront === 'function') {
            lyr.bringToFront();
          }
        });
      }
    }
  }, [mapType]);

  // Dynamically adjust tile layer opacities on slider change
  useEffect(() => {
    if (roadsLayerRef.current) roadsLayerRef.current.setOpacity(roadsOpacity);
  }, [roadsOpacity]);

  useEffect(() => {
    if (placesLayerRef.current) placesLayerRef.current.setOpacity(placesOpacity);
  }, [placesOpacity]);

  useEffect(() => {
    if (labelsLayerRef.current) labelsLayerRef.current.setOpacity(labelsOpacity);
  }, [labelsOpacity]);

  // Update GeoJSON layer when data, filter, or viewMode changes
  useEffect(() => {
    if (!mapRef.current || !geojsonData) return;

    const L = require('leaflet');

    // Remove existing GeoJSON layer
    if (geojsonLayerRef.current) {
      mapRef.current.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    // Filter by active kebun
    const filteredFeatures =
      activeKebun.length === 0
        ? geojsonData.features
        : geojsonData.features.filter((f) =>
            activeKebun.includes(f.properties.kebun || '')
          );

    if (filteredFeatures.length === 0) return;

    // Pre-calculate aggregate values per kebun
    const kebunAggregates: Record<string, { l_gis: number; l_rkap: number; populasi: number; protas_24: number }> = {};
    filteredFeatures.forEach((feat) => {
      const k = feat.properties.kebun || 'Unknown';
      if (!kebunAggregates[k]) {
        kebunAggregates[k] = { l_gis: 0, l_rkap: 0, populasi: 0, protas_24: 0 };
      }
      const p = feat.properties;
      kebunAggregates[k].l_gis += p.l_gis || 0;
      kebunAggregates[k].l_rkap += p.l_rkap || 0;
      kebunAggregates[k].populasi += p.populasi || 0;
      kebunAggregates[k].protas_24 += p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
    });

    // Group features by kebun name to dissolve/union
    const kebunGroups: Record<string, any[]> = {};
    filteredFeatures.forEach((feat) => {
      const k = feat.properties.kebun || 'Unknown';
      if (!kebunGroups[k]) {
        kebunGroups[k] = [];
      }
      kebunGroups[k].push(feat);
    });

    const outlineFeatures: any[] = [];
    Object.entries(kebunGroups).forEach(([kebunName, feats]) => {
      try {
        let dissolved: any = null;
        if (feats.length === 1) {
          dissolved = JSON.parse(JSON.stringify(feats[0]));
        } else if (feats.length > 1) {
          const fc = turf.featureCollection(feats);
          dissolved = turf.union(fc as any);
        }

        if (dissolved) {
          const agg = kebunAggregates[kebunName] || { l_gis: 1, l_rkap: 0, populasi: 0, protas_24: 0 };
          const pYears = feats.map((f) => {
            const yr = f.properties.thn_tanam;
            if (!yr) return null;
            const num = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? null : num;
          }).filter(Boolean) as number[];
          const avgYr = pYears.length > 0 ? Math.round(pYears.reduce((a, b) => a + b, 0) / pYears.length) : null;

          dissolved.properties = {
            kebun: kebunName,
            l_gis: agg.l_gis,
            l_rkap: agg.l_rkap,
            populasi: agg.populasi,
            protas_24: agg.protas_24,
            thn_tanam: avgYr ? `${avgYr}` : null,
          };
          outlineFeatures.push(dissolved);
        }
      } catch (err) {
        console.error(`Failed to union/dissolve features for kebun ${kebunName}:`, err);
      }
    });

    let outlinesLayerInstance: any = null;
    let layerGroup: any = null;

    const effectiveDetailLevel = viewMode === 'default' ? 'kebun' : detailLevel;

    if (effectiveDetailLevel === 'block') {
      const blocksLayer = L.geoJSON(
        { type: 'FeatureCollection', features: filteredFeatures },
        {
          style: (feature: GeoJSONFeature) => {
            const color = getFeatureColor(feature, viewMode, showEmptyData);
            return {
              fillColor: color,
              fillOpacity: 0.95,
              stroke: true,
              color: color,
              weight: 0.8,
              opacity: 1,
            };
          },
          onEachFeature: (feature: GeoJSONFeature, lyr: any) => {
            lyr.on({
              mouseover: () => {
                lyr.setStyle({ fillOpacity: 1.0 });
                lyr.bringToFront();
                if (outlinesLayerInstance) {
                  outlinesLayerInstance.bringToFront();
                }
              },
              mouseout: () => {
                blocksLayer.resetStyle(lyr);
              },
              click: () => {
                onFeatureClick(feature);
              },
            });
          },
        }
      );

      outlinesLayerInstance = L.geoJSON(
        { type: 'FeatureCollection', features: outlineFeatures },
        {
          style: () => ({
            fill: false,
            color: '#262626',
            weight: 1.2,
            opacity: 1,
          }),
          interactive: false,
        }
      );

      layerGroup = L.layerGroup([blocksLayer, outlinesLayerInstance]).addTo(mapRef.current);
    } else {
      // Per Kebun mode: outline features represent the entire kebun as solid interactive shapes
      outlinesLayerInstance = L.geoJSON(
        { type: 'FeatureCollection', features: outlineFeatures },
        {
          style: (feature: GeoJSONFeature) => {
            const color = getFeatureColor(feature, viewMode, showEmptyData);
            return {
              fillColor: color,
              fillOpacity: 0.95,
              stroke: true,
              color: '#262626', // Outlines always drawn in charcoal
              weight: 1.2,
              opacity: 1,
            };
          },
          onEachFeature: (feature: GeoJSONFeature, lyr: any) => {
            lyr.on({
              mouseover: () => {
                lyr.setStyle({ fillOpacity: 1.0 });
                lyr.bringToFront();
              },
              mouseout: () => {
                outlinesLayerInstance.resetStyle(lyr);
              },
              click: () => {
                onFeatureClick(feature);
              },
            });
          },
        }
      );

      layerGroup = L.layerGroup([outlinesLayerInstance]).addTo(mapRef.current);
    }

    geojsonLayerRef.current = layerGroup;
  }, [geojsonData, activeKebun, viewMode, showEmptyData, detailLevel, onFeatureClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      />

      {/* Floating Map Style Panel Widget */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          zIndex: 1000,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {!showTypePanel ? (
          <button
            onClick={() => setShowTypePanel(true)}
            style={{
              width: '40px',
              height: '40px',
              background: '#ffffff',
              border: '1px solid var(--cds-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '0px',
              color: 'var(--cds-text-primary)',
            }}
            title="Ubah Tampilan Peta"
          >
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 10L16 3L30 10L16 17Z" />
              <path d="M2 16L16 23L30 16" />
              <path d="M2 22L16 29L30 22" />
            </svg>
          </button>
        ) : (
          <div
            style={{
              width: '280px',
              background: '#ffffff',
              border: '1px solid var(--cds-border-strong)',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderRadius: '0px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--cds-text-primary)' }}>
                Tampilan Peta
              </span>
              <button
                onClick={() => setShowTypePanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  color: 'var(--cds-text-secondary)',
                  padding: '2px 6px',
                }}
              >
                &times;
              </button>
            </div>

            {/* Grid of Map Types */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>
                Jenis Peta
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'standard', name: 'Standard', bg: 'linear-gradient(135deg, #a5d6a7 50%, #90caf9 50%)' },
                  { id: 'satellite', name: 'Satelit', bg: 'linear-gradient(135deg, #2e7d32 50%, #1b5e20 50%)' },
                  { id: 'silver', name: 'Silver', bg: 'linear-gradient(135deg, #e0e0e0 50%, #f5f5f5 50%)' },
                  { id: 'dark', name: 'Dark Matter', bg: 'linear-gradient(135deg, #212121 50%, #37474f 50%)' },
                ].map((type) => {
                  const isActive = mapType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setMapType(type.id as any)}
                      style={{
                        padding: '6px',
                        background: '#ffffff',
                        border: isActive ? '2px solid var(--cds-primary)' : '1px solid var(--cds-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '0px',
                        transition: 'border-color 0.1s ease',
                      }}
                    >
                      <div style={{ width: '100%', height: '40px', background: type.bg }} />
                      <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500', color: 'var(--cds-text-primary)' }}>
                        {type.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Details Opacity Sliders */}
            <div style={{ borderTop: '1px solid var(--cds-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--cds-text-secondary)' }}>
                Kepekaan Detail
              </div>

              {/* Slider 1: Roads */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}>
                  <span>Jalan</span>
                  <span>{Math.round(roadsOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={roadsOpacity}
                  onChange={(e) => setRoadsOpacity(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--cds-primary)',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Slider 2: Places */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}>
                  <span>Tempat Terkenal (POIs)</span>
                  <span>{Math.round(placesOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={placesOpacity}
                  onChange={(e) => setPlacesOpacity(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--cds-primary)',
                    cursor: 'pointer',
                  }}
                />
              </div>

              {/* Slider 3: Labels */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cds-text-primary)', marginBottom: '4px' }}>
                  <span>Label (Nama Wilayah/Blok)</span>
                  <span>{Math.round(labelsOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={labelsOpacity}
                  onChange={(e) => setLabelsOpacity(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--cds-primary)',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Legend (IBM Carbon style: flat white card with border) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '16px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid var(--cds-border)',
          borderRadius: '0px',
          padding: '12px 16px',
          width: '240px',
          fontSize: '11px',
          color: 'var(--cds-text-primary)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            fontWeight: '700',
            marginBottom: '8px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: '12px',
            color: 'var(--cds-primary)',
          }}
        >
          {viewMode === 'default' && 'Legenda Wilayah Kebun'}
          {viewMode === 'productivity' && 'Legenda Produktivitas (kg/Ha)'}
          {viewMode === 'age' && 'Legenda Umur Tanaman (Tahun)'}
          {viewMode === 'density' && 'Legenda Kerapatan (Pohon/Ha)'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {viewMode === 'default' &&
            Object.entries(KEBUN_COLORS).map(([name, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '0px', background: color }} />
                <span style={{ color: 'var(--cds-text-secondary)' }}>Kebun {getKebunDisplayName(name)}</span>
              </div>
            ))}

          {viewMode === 'productivity' && [
            { label: '> 500 kg/Ha (Sangat Tinggi)', color: '#22C55E' },
            { label: '150 - 500 kg/Ha (Tinggi)', color: '#A3E635' },
            { label: '50 - 150 kg/Ha (Sedang)', color: '#FACC15' },
            { label: '15 - 50 kg/Ha (Rendah)', color: '#F97316' },
            { label: '< 15 kg/Ha (Sangat Rendah)', color: '#EF4444' },
            { label: 'Tidak Ada Data / Kosong', color: '#a8a8a8' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color }} />
              <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
            </div>
          ))}

          {viewMode === 'age' && [
            { label: '< 7 Tahun (Muda / TBM)', color: '#38BDF8' },
            { label: '7 - 15 Tahun (TM Prima)', color: '#15803D' },
            { label: '15 - 25 Tahun (TM Tua)', color: '#F97316' },
            { label: '> 25 Tahun (Tua / Rusak)', color: '#EF4444' },
            { label: 'Tidak Ada Data', color: '#a8a8a8' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color }} />
              <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
            </div>
          ))}

          {viewMode === 'density' && [
            { label: '> 500 Pohon/Ha (Padat / Rapat)', color: '#A855F7' },
            { label: '350 - 500 Pohon/Ha (Optimal)', color: '#22C55E' },
            { label: '150 - 350 Pohon/Ha (Jarang)', color: '#F97316' },
            { label: '< 150 Pohon/Ha (Kritis / Rendah)', color: '#EF4444' },
            { label: 'Tidak Ada Data', color: '#a8a8a8' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color }} />
              <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

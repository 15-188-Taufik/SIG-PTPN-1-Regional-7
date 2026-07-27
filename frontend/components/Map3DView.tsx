'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FeatureCollection, GeoJSONFeature } from '@/types/kebun';
import * as turf from '@turf/turf';

export type ViewMode = 'default' | 'productivity' | 'age' | 'density';
export type HeightMetric = 'protas' | 'sph' | 'umur';
export type StyleType = 'dark' | 'satellite' | 'osm';

interface Map3DViewProps {
  geojsonData: FeatureCollection | null;
  onFeatureClick: (feature: GeoJSONFeature) => void;
  activeKebun: string[];
  viewMode: ViewMode;
  showEmptyData: boolean;
  selectedFeature?: GeoJSONFeature | null;
  rightOffset?: number;
  leftOffset?: number;
  zoomRequest?: { kebun: string; timestamp: number } | null;
}

const KEBUN_COLORS: Record<string, string> = {
  'Unit Way Berulu': '#0072B2',
  'Unit Bergen': '#009E73',
  'Unit Way Lima': '#CC79A7',
  'Unit Tulungbuyut': '#E69F00',
  'Unit Kedaton': '#56B4E9',
};

const FOUR_COLOR_PALETTE = [
  '#0F62FE', // Biru
  '#24A148', // Hijau
  '#EE5396', // Magenta / Pink
  '#F5A623', // Amber / Yellow
];

function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  const lower = norm.toLowerCase();
  if (lower === 'wabe' || lower === 'unit bekri') return 'Unit Way Berulu';
  if (lower === 'wali' || lower === 'unit rejosari') return 'Unit Way Lima';
  if (lower === 'tubu') return 'Unit Tulungbuyut';
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
  showEmptyData: boolean,
  fourColorBlockMap?: Map<string | number, string>
): string {
  const p = feature.properties;

  const statusVal = (p.status || '').toString().trim().toLowerCase();
  if (statusVal === 'okupasi') {
    return '#EF4444';
  }

  if (viewMode === 'default') {
    const key = feature.id ?? p.id ?? p.kode_blok ?? 0;
    return (fourColorBlockMap && fourColorBlockMap.get(key)) || FOUR_COLOR_PALETTE[0];
  }

  if (viewMode === 'productivity') {
    const lgis = p.l_gis || 0;
    const protas = p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
    if (lgis <= 0 || protas <= 0) {
      return showEmptyData ? '#a8a8a8' : getKebunColor(p.kebun);
    }
    const yieldPerHa = protas / lgis;
    if (yieldPerHa < 15) return '#EF4444';
    if (yieldPerHa < 50) return '#F97316';
    if (yieldPerHa < 150) return '#FACC15';
    if (yieldPerHa < 500) return '#A3E635';
    return '#22C55E';
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
      if (age > 25) return '#EF4444';
      if (age > 15) return '#F97316';
      if (age > 7) return '#15803D';
      return '#38BDF8';
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
    const Math_sph = pop / lgis;
    if (Math_sph < 150) return '#EF4444';
    if (Math_sph < 350) return '#F97316';
    if (Math_sph < 500) return '#22C55E';
    return '#A855F7';
  }

  return '#848684';
}

function computeFourColorAssignment(features: GeoJSONFeature[]): Map<string | number, string> {
  const n = features.length;
  const assigned = new Map<number, number>();

  const meta = features.map((f) => {
    try {
      const bbox = turf.bbox(f as any);
      const centroid = turf.centroid(f as any);
      return { bbox, centroid };
    } catch {
      return { bbox: [0, 0, 0, 0], centroid: turf.point([0, 0]) };
    }
  });

  const adj: number[][] = Array.from({ length: n }, () => []);
  const tol = 0.005;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const b1 = meta[i].bbox;
      const b2 = meta[j].bbox;
      if (!(b1[2] + tol < b2[0] || b2[2] + tol < b1[0] || b1[3] + tol < b2[1] || b2[3] + tol < b1[1])) {
        try {
          const dist = turf.distance(meta[i].centroid, meta[j].centroid, { units: 'kilometers' });
          if (dist < 20.0) {
            adj[i].push(j);
            adj[j].push(i);
          }
        } catch {}
      }
    }
  }

  const order = Array.from({ length: n }, (_, idx) => idx);
  order.sort((a, b) => adj[b].length - adj[a].length);

  for (const u of order) {
    const usedColors = new Set<number>();
    for (const v of adj[u]) {
      if (assigned.has(v)) {
        usedColors.add(assigned.get(v)!);
      }
    }
    const get_color = () => {
      let color = 0;
      while (usedColors.has(color) && color < 4) {
        color++;
      }
      return color;
    };
    let color = get_color();
    if (color >= 4 || adj[u].length === 0) color = u % 4;
    assigned.set(u, color);
  }

  const resultMap = new Map<string | number, string>();
  features.forEach((feat, idx) => {
    const key = feat.properties.id ?? feat.properties.kode_blok ?? feat.properties.afdeling ?? idx;
    const colorIdx = assigned.get(idx) ?? (idx % 4);
    resultMap.set(key, FOUR_COLOR_PALETTE[colorIdx]);
  });

  return resultMap;
}

const getInitialStyle = (defaultType: StyleType): any => {
  return {
    version: 8,
    sources: {
      'dark-tiles': {
        type: 'raster',
        tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CartoDB',
      },
      'satellite-tiles': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles © Esri',
      },
      'osm-tiles': {
        type: 'raster',
        tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap, © CartoDB',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f4f4f4',
        },
      },
      {
        id: 'dark-base',
        type: 'raster',
        source: 'dark-tiles',
        minzoom: 0,
        maxzoom: 20,
        layout: {
          visibility: defaultType === 'dark' ? 'visible' : 'none',
        },
      },
      {
        id: 'satellite-base',
        type: 'raster',
        source: 'satellite-tiles',
        minzoom: 0,
        maxzoom: 20,
        layout: {
          visibility: defaultType === 'satellite' ? 'visible' : 'none',
        },
      },
      {
        id: 'osm-base',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 20,
        layout: {
          visibility: defaultType === 'osm' ? 'visible' : 'none',
        },
      },
    ],
  };
};

export default function Map3DView({
  geojsonData,
  onFeatureClick,
  activeKebun,
  viewMode,
  showEmptyData,
  selectedFeature,
  rightOffset = 280,
  leftOffset = 300,
  zoomRequest,
}: Map3DViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [styleType, setStyleType] = useState<StyleType>('osm');
  const [heightMetric, setHeightMetric] = useState<HeightMetric>('protas');
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showHelperToast, setShowHelperToast] = useState(true);
  const addLog = (msg: string) => {};

  // Pre-calculate processed 3D features to map heights and colors
  const processedFeatures = useMemo(() => {
    if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
      return [];
    }

    const fourColorBlockMap = computeFourColorAssignment(geojsonData.features);

    return geojsonData.features.map((feat, idx) => {
      const p = feat.properties;
      const color = getFeatureColor(feat, viewMode, showEmptyData, fourColorBlockMap);

      // Heights mapping
      let rawHeight = 0;
      if (heightMetric === 'protas') {
        const lgis = p.l_gis || 1;
        const protas = p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
        rawHeight = protas / lgis;
      } else if (heightMetric === 'sph') {
        const lgis = p.l_gis || 1;
        const pop = p.populasi || 0;
        rawHeight = pop / lgis;
      } else if (heightMetric === 'umur') {
        const yr = p.thn_tanam;
        if (yr) {
          const plantYear = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
          if (!isNaN(plantYear) && plantYear > 1900) {
            rawHeight = 2026 - plantYear;
          }
        }
      }

      // Height scaling for visual extrusion (scaled realistically and clamped to max 500m to prevent clipping)
      let height = 0;
      if (heightMetric === 'protas') {
        height = Math.min(500, Math.max(15, rawHeight * 0.15));
      } else if (heightMetric === 'sph') {
        height = Math.min(500, Math.max(15, rawHeight * 0.8));
      } else if (heightMetric === 'umur') {
        height = Math.min(500, Math.max(15, rawHeight * 10));
      }

      return {
        ...feat,
        id: feat.id ?? idx,
        properties: {
          ...p,
          _height: height,
          _color: color,
          _rawHeight: rawHeight,
        },
      };
    });
  }, [geojsonData, viewMode, showEmptyData, heightMetric]);

  // Find center of current features to focus the camera
  const mapCenter = useMemo<[number, number]>(() => {
    if (processedFeatures.length === 0) return [105.266289, -5.397139];
    try {
      const fc = turf.featureCollection(processedFeatures as any);
      const center = turf.center(fc);
      return [center.geometry.coordinates[0], center.geometry.coordinates[1]];
    } catch {
      return [105.266289, -5.397139];
    }
  }, [processedFeatures]);

  // Fit 3D map camera when a specific kebun zoom request is triggered
  useEffect(() => {
    if (!zoomRequest || !mapRef.current) return;
    const map = mapRef.current;
    const kebun = zoomRequest.kebun;

    // Find features matching the requested kebun
    const kebunFeatures = processedFeatures.filter(
      (f) => f.properties && f.properties.kebun && f.properties.kebun.toLowerCase() === kebun.toLowerCase()
    );
    if (kebunFeatures.length === 0) return;

    try {
      const validFeatures = kebunFeatures.filter(
        (f) => f && f.geometry && (f.geometry as any).coordinates && (f.geometry as any).coordinates.length > 0
      );
      if (validFeatures.length === 0) return;

      const bbox = turf.bbox(turf.featureCollection(validFeatures as any));
      map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ], {
        padding: 60,
        duration: 1200,
        pitch: 50,
      });
    } catch (err) {
      console.warn('Error flying to kebun bounds in 3D:', err);
    }
  }, [zoomRequest, processedFeatures]);

  // Keep a reference to latest processedFeatures for the load closure
  const featuresRef = useRef(processedFeatures);
  useEffect(() => {
    featuresRef.current = processedFeatures;
  }, [processedFeatures]);

  // Initial MapLibre GL setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    setIsLoading(true);
    addLog('Creating MapLibre instance...');

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getInitialStyle('osm'),
      center: mapCenter,
      zoom: 12.5,
      pitch: 50,
      bearing: -15,
    });

    mapRef.current = map;

    // Error handling
    map.on('error', (e: any) => {
      addLog('MapLibre error: ' + (e.error?.message || e.message || 'unknown'));
    });

    // Controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }));

    // Popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'maplibre-3d-popup',
    });

    map.on('load', () => {
      addLog('Map load event fired.');
      setIsLoading(false);
      
      try {
        addLog(`Adding source with ${featuresRef.current.length} features.`);
        // Add data source
        map.addSource('ptpn-3d-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: featuresRef.current as any,
          },
        });
        addLog('Source added successfully.');

        addLog('Adding 2D footprint layer...');
        map.addLayer({
          id: 'ptpn-2d-footprint',
          type: 'fill',
          source: 'ptpn-3d-source',
          paint: {
            'fill-color': ['get', '_color'],
            'fill-opacity': 0.65,
            'fill-outline-color': '#ffffff',
          },
        });
        addLog('2D footprint layer added successfully.');



        addLog('Adding fill-extrusion layer...');
        // Extrusion Layer
        map.addLayer({
          id: 'ptpn-3d-extrusion',
          type: 'fill-extrusion',
          source: 'ptpn-3d-source',
          paint: {
            'fill-extrusion-color': ['get', '_color'],
            'fill-extrusion-height': ['get', '_height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.88,
          },
        });
        addLog('3D layer added successfully.');
      } catch (err: any) {
        addLog('Error in load callback: ' + err.message);
        console.error(err);
      }

      // Hover behavior
      map.on('mousemove', 'ptpn-3d-extrusion', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';

        const f = e.features[0];
        const p = f.properties;
        const kebunName = getKebunDisplayName(p.kebun);
        const afd = p.afdeling ? `Afd ${p.afdeling}` : 'Afd -';
        const blockCode = p.kode_blok || p.no_polygon || 'Blok';

        let metricLabel = '';
        let metricVal = '';
        if (heightMetric === 'protas') {
          metricLabel = 'Yield (Protas/Ha)';
          metricVal = `${parseFloat(p._rawHeight || '0').toFixed(2)} Kg/Ha`;
        } else if (heightMetric === 'sph') {
          metricLabel = 'SPH (Pohon/Ha)';
          metricVal = `${Math.round(parseFloat(p._rawHeight || '0'))} Pohon`;
        } else if (heightMetric === 'umur') {
          metricLabel = 'Umur Tanaman';
          metricVal = `${Math.round(parseFloat(p._rawHeight || '0'))} Tahun`;
        }

        const tooltipHtml = `
          <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 8px 12px; font-size: 11px; line-height: 1.4; color: #161616; background: rgba(255,255,255,0.95); box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 4px; border-left: 4px solid #0F62FE;">
            <div style="font-weight: 700; color: #0f62fe; margin-bottom: 2px;">
              Kebun ${kebunName} &middot; ${afd}
            </div>
            <div style="font-weight: 600; color: #525252; margin-bottom: 4px;">
              Blok: ${blockCode}
            </div>
            <div style="font-weight: 700; font-size: 12px; color: #161616; border-top: 1px solid #e0e0e0; padding-top: 4px; margin-top: 4px;">
              ${metricLabel}: <span style="color: #24a148;">${metricVal}</span>
            </div>
          </div>
        `;

        popup.setLngLat(e.lngLat).setHTML(tooltipHtml).addTo(map);
      });

      map.on('mouseleave', 'ptpn-3d-extrusion', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });

      // Click behavior
      map.on('click', 'ptpn-3d-extrusion', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        onFeatureClick(f as any);
      });
    });

    // Cleanup
    return () => {
      addLog('Destroying MapLibre instance...');
      map.remove();
    };
  }, []);

  // Update data source when features change
  useEffect(() => {
    const map = mapRef.current;
    addLog(`update useEffect: map=${!!map}, count=${processedFeatures.length}, loading=${isLoading}`);
    if (!map || isLoading) return;

    const source = map.getSource('ptpn-3d-source') as maplibregl.GeoJSONSource;
    addLog(`update useEffect: source found=${!!source}`);
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: processedFeatures as any,
      });
      addLog(`source.setData called with ${processedFeatures.length} features.`);
    }
  }, [processedFeatures, isLoading]);

  // Update layer styles/heights when heightMetric changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    if (map.getLayer('ptpn-3d-extrusion')) {
      map.setPaintProperty('ptpn-3d-extrusion', 'fill-extrusion-height', ['get', '_height']);
      map.setPaintProperty('ptpn-3d-extrusion', 'fill-extrusion-color', ['get', '_color']);
    }
    if (map.getLayer('ptpn-2d-footprint')) {
      map.setPaintProperty('ptpn-2d-footprint', 'fill-color', ['get', '_color']);
    }
  }, [heightMetric, viewMode, isLoading]);

  // Handle background style switching (toggle layer visibility instantly, 0 reload delay)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bases = ['dark-base', 'satellite-base', 'osm-base'];
    const activeLayerId = `${styleType}-base`;

    bases.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          layerId === activeLayerId ? 'visible' : 'none'
        );
      }
    });

    addLog(`Switched style to: ${styleType}`);
  }, [styleType]);

  // Fly to selected feature bounding box
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFeature || isLoading) return;

    try {
      const bbox = turf.bbox(selectedFeature as any);
      map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ], {
        padding: 60,
        maxZoom: 16,
        duration: 1500,
        pitch: 55,
      });
    } catch (err) {
      console.warn('Could not fit 3D bounds:', err);
    }
  }, [selectedFeature, isLoading]);

  // Fit camera bounds to all active features on load or kebun switch
  const fitToFeatures = () => {
    const map = mapRef.current;
    addLog(`fitToFeatures: map=${!!map}, count=${processedFeatures.length}, loading=${isLoading}`);
    if (!map || processedFeatures.length === 0 || isLoading) return;

    try {
      const layers = map.getStyle().layers || [];
      addLog(`Map layers: ${layers.map(l => l.id).join(', ')}`);
      // Filter features with valid geometry to avoid turf.bbox crashing
      const validFeatures = processedFeatures.filter(
        (f) => f && f.geometry && (f.geometry as any).coordinates && (f.geometry as any).coordinates.length > 0
      );
      addLog(`Valid features for bounds: ${validFeatures.length}/${processedFeatures.length}`);
      if (validFeatures.length === 0) return;

      const bbox = turf.bbox(turf.featureCollection(validFeatures as any));
      addLog(`Bounds: ${bbox.map(n => n.toFixed(4)).join(', ')}`);
      
      map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ], {
        padding: 50,
        duration: 1200,
        pitch: 50,
      });
      addLog('fitBounds called successfully.');
    } catch (err: any) {
      addLog('Error in fitToFeatures: ' + err.message);
      console.warn('Error fitting 3D bounds:', err);
    }
  };

  useEffect(() => {
    addLog(`fitToFeatures useEffect fired. count=${processedFeatures.length}, loading=${isLoading}`);
    if (!isLoading && processedFeatures.length > 0) {
      fitToFeatures();
    }
  }, [processedFeatures, activeKebun, isLoading]);

  const handleResetCamera = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: mapCenter,
      zoom: 12.5,
      pitch: 50,
      bearing: -15,
      duration: 1500,
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Map canvas wrapper */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          bottom: 0,
        }}
      />

      {/* Floating 3D Control Center Card */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: `${leftOffset + 20}px`,
          right: `${rightOffset + 20}px`,
          zIndex: 1001,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {/* Controls Card */}
        {showControls ? (
          <div
            style={{
              pointerEvents: 'auto',
              background: 'rgba(22, 22, 22, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #393939',
              padding: '12px 16px',
              color: '#f4f4f4',
              borderRadius: '4px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: '240px',
              position: 'relative',
            }}
          >
            {/* Close / Minimize Button */}
            <button
              onClick={() => setShowControls(false)}
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#8a8a8a',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              title="Sembunyikan panel kontrol"
              onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8a8a8a'}
            >
              ×
            </button>

            {/* Height Metric Selector */}
            <div style={{ marginTop: '4px' }}>
              <label style={{ fontSize: '10px', color: '#a8a8a8', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Metrik Tinggi 3D
              </label>
              <div style={{ display: 'flex', gap: '4px', background: '#262626', padding: '2px', borderRadius: '3px' }}>
                <button
                  onClick={() => setHeightMetric('protas')}
                  style={{
                    flex: 1,
                    background: heightMetric === 'protas' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '6px 4px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Protas
                </button>
                <button
                  onClick={() => setHeightMetric('sph')}
                  style={{
                    flex: 1,
                    background: heightMetric === 'sph' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '6px 4px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  SPH
                </button>
                <button
                  onClick={() => setHeightMetric('umur')}
                  style={{
                    flex: 1,
                    background: heightMetric === 'umur' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '6px 4px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Umur
                </button>
              </div>
            </div>

            {/* Map Base Style Selector */}
            <div>
              <label style={{ fontSize: '10px', color: '#a8a8a8', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gaya Peta Latar
              </label>
              <div style={{ display: 'flex', gap: '4px', background: '#262626', padding: '2px', borderRadius: '3px' }}>
                <button
                  onClick={() => setStyleType('dark')}
                  style={{
                    flex: 1,
                    background: styleType === 'dark' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '5px 2px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Gelap
                </button>
                <button
                  onClick={() => setStyleType('satellite')}
                  style={{
                    flex: 1,
                    background: styleType === 'satellite' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '5px 2px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Satelit
                </button>
                <button
                  onClick={() => setStyleType('osm')}
                  style={{
                    flex: 1,
                    background: styleType === 'osm' ? '#0F62FE' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '5px 2px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  OSM
                </button>
              </div>
            </div>

            {/* Utility Buttons */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #393939', paddingTop: '10px', marginTop: '4px' }}>
              <button
                onClick={handleResetCamera}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#f4f4f4',
                  border: '1px solid #393939',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '6px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#262626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Reset Kamera
              </button>
              <button
                onClick={fitToFeatures}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#f4f4f4',
                  border: '1px solid #393939',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '6px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#262626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Fokus Lahan
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowControls(true)}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(22, 22, 22, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #393939',
              padding: '8px 14px',
              color: '#f4f4f4',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            title="Tampilkan panel kontrol"
            onMouseEnter={(e) => e.currentTarget.style.background = '#262626'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(22, 22, 22, 0.85)'}
          >
            ⚙️ Panel Kontrol 3D
          </button>
        )}

        {/* Floating Rotation Instruction Helper */}
        {showHelperToast && (
          <div
            style={{
              background: 'rgba(22, 22, 22, 0.75)',
              border: '1px solid #393939',
              padding: '8px 12px',
              color: '#a8a8a8',
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'auto',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0F62FE' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Gunakan klik kanan + seret untuk memutar & memiringkan peta</span>
            <button
              onClick={() => setShowHelperToast(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8a8a8a',
                marginLeft: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '0 2px',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              title="Sembunyikan info"
              onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8a8a8a'}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(22, 22, 22, 0.8)',
            zIndex: 1002,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #393939',
              borderTopColor: '#0F62FE',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ color: '#f4f4f4', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Merender Peta 3D...
          </span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}

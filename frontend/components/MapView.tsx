'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import * as turf from '@turf/turf';
import CarbonLoader from './CarbonLoader';

export type ViewMode = 'default' | 'productivity' | 'age' | 'density';

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

function computeFourColorAssignment(features: GeoJSONFeature[]): Map<string | number, string> {
  const n = features.length;
  const assigned = new Map<number, number>();

  // Precompute spatial meta (bbox & centroid) for efficient spatial adjacency checks
  const meta = features.map((f) => {
    try {
      const bbox = turf.bbox(f as any);
      const centroid = turf.centroid(f as any);
      return { bbox, centroid };
    } catch {
      return { bbox: [0, 0, 0, 0], centroid: turf.point([0, 0]) };
    }
  });

  // Build spatial adjacency graph
  const adj: number[][] = Array.from({ length: n }, () => []);
  const tol = 0.005; // Spatial tolerance for bounding box overlap

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const b1 = meta[i].bbox;
      const b2 = meta[j].bbox;
      // Fast Bounding Box Overlap Check
      if (
        !(
          b1[2] + tol < b2[0] ||
          b2[2] + tol < b1[0] ||
          b1[3] + tol < b2[1] ||
          b2[3] + tol < b1[1]
        )
      ) {
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

  // DSATUR / Degree-Descending Greedy Graph 4-Coloring
  const order = Array.from({ length: n }, (_, idx) => idx);
  order.sort((a, b) => adj[b].length - adj[a].length);

  for (const u of order) {
    const usedColors = new Set<number>();
    for (const v of adj[u]) {
      if (assigned.has(v)) {
        usedColors.add(assigned.get(v)!);
      }
    }
    let color = 0;
    while (usedColors.has(color) && color < 4) {
      color++;
    }
    if (color >= 4 || adj[u].length === 0) color = u % 4; // Round-robin cycle for isolated units
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

function dissolveFeaturesCleanly(features: any[]): any {
  if (!features || features.length === 0) return null;
  if (features.length === 1) return JSON.parse(JSON.stringify(features[0]));

  try {
    const fc = turf.featureCollection(features);
    // Micro-buffer +0.0002 km (~2 meters) bridges internal block seams/micro-gaps along shared borders
    const buffered = turf.buffer(fc as any, 0.0002, { units: 'kilometers' });
    let merged = turf.union(buffered as any);
    if (merged) {
      // Shrink back by -0.0002 km to restore exact original geometry
      const unbuffered = turf.buffer(merged as any, -0.0002, { units: 'kilometers' });
      if (unbuffered) merged = unbuffered;
    }
    return merged || turf.union(fc as any);
  } catch (err) {
    try {
      return turf.union(turf.featureCollection(features) as any);
    } catch {
      return JSON.parse(JSON.stringify(features[0]));
    }
  }
}

export function getKebunDisplayName(name: string | null): string {
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

function getColorName(hex: string): string {
  const norm = hex.toUpperCase();
  if (norm === '#0F62FE') return 'Empat Warna 1 (Biru)';
  if (norm === '#24A148') return 'Empat Warna 2 (Hijau)';
  if (norm === '#EE5396') return 'Empat Warna 3 (Magenta)';
  if (norm === '#F5A623') return 'Empat Warna 4 (Amber)';

  if (norm === '#0072B2') return 'Biru (Okabe-Ito Blue)';
  if (norm === '#009E73') return 'Hijau Kebiruan (Okabe-Ito Green)';
  if (norm === '#CC79A7') return 'Merah Muda Keunguan (Okabe-Ito Reddish Purple)';
  if (norm === '#E69F00') return 'Jingga/Orange (Okabe-Ito Orange)';
  if (norm === '#56B4E9') return 'Biru Langit (Okabe-Ito Sky Blue)';
  if (norm === '#D55E00') return 'Merah Jingga/Vermillion (Okabe-Ito Vermillion)';
  
  // Analysis colors
  if (norm === '#22C55E') return 'Hijau (Sangat Tinggi / Optimal)';
  if (norm === '#A3E635') return 'Hijau Muda (Tinggi)';
  if (norm === '#FACC15') return 'Kuning (Sedang)';
  if (norm === '#F97316') return 'Jingga/Orange (Rendah / TM Tua)';
  if (norm === '#EF4444') return 'Merah (Sangat Rendah / Kritis)';
  if (norm === '#A8A8A8') return 'Abu-abu (Tidak Ada Data)';
  if (norm === '#38BDF8') return 'Biru Muda (Muda / TBM)';
  if (norm === '#15803D') return 'Hijau Tua (TM Prima)';
  if (norm === '#A855F7') return 'Ungu (Padat / Rapat)';
  
  return hex;
}

function getFeatureColor(
  feature: GeoJSONFeature,
  viewMode: ViewMode,
  showEmptyData: boolean,
  detailLevel: 'block' | 'afdeling' | 'kebun',
  fourColorBlockMap?: Map<string | number, string>,
  fourColorAfdMap?: Map<string | number, string>
): string {
  const p = feature.properties;

  if (viewMode === 'default') {
    if (detailLevel === 'kebun') {
      return getKebunColor(p.kebun);
    }
    if (detailLevel === 'afdeling') {
      const key = `${p.kebun || 'Unknown'}|||${p.afdeling || 'Unknown'}`;
      return (fourColorAfdMap && fourColorAfdMap.get(key)) || FOUR_COLOR_PALETTE[0];
    }
    // Block level uses 4-Coloring by default
    const key = p.id ?? p.kode_blok ?? 0;
    return (fourColorBlockMap && fourColorBlockMap.get(key)) || FOUR_COLOR_PALETTE[0];
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
  detailLevel: 'block' | 'afdeling' | 'kebun';
  selectedFeature?: GeoJSONFeature | null;
  mapInstanceRef?: React.MutableRefObject<LeafletMap | null>;
}

export default function MapView({
  geojsonData,
  onFeatureClick,
  activeKebun,
  viewMode,
  showEmptyData,
  detailLevel,
  selectedFeature,
  mapInstanceRef,
}: MapViewProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const isFirstRenderRef = useRef(true);

  // Compute spatial adjacency graph 4-coloring for Blocks
  const fourColorBlockMap = useMemo(() => {
    if (!geojsonData || !geojsonData.features) return new Map<string | number, string>();
    return computeFourColorAssignment(geojsonData.features);
  }, [geojsonData]);

  // Pre-calculate Afdeling outlines once to avoid heavy Turf operations during rendering
  const preCalculatedAfdOutlines = useMemo(() => {
    if (!geojsonData || !geojsonData.features) return [];
    
    const afdGroups: Record<string, any[]> = {};
    geojsonData.features.forEach((feat) => {
      const p = feat.properties;
      const key = `${p.kebun || 'Unknown'}|||${p.afdeling || 'Unknown'}`;
      if (!afdGroups[key]) afdGroups[key] = [];
      afdGroups[key].push(feat);
    });

    const outlines: any[] = [];
    Object.entries(afdGroups).forEach(([key, feats]) => {
      try {
        const dissolved = dissolveFeaturesCleanly(feats);
        if (dissolved) {
          dissolved.properties = { ...feats[0].properties, id: key };
          outlines.push(dissolved);
        }
      } catch (err) {
        console.error('Failed to dissolve afdeling outline:', key, err);
      }
    });
    return outlines;
  }, [geojsonData]);

  // Compute spatial adjacency graph 4-coloring for Afdelings
  const fourColorAfdMap = useMemo(() => {
    return computeFourColorAssignment(preCalculatedAfdOutlines);
  }, [preCalculatedAfdOutlines]);

  // Pre-calculate Kebun outlines once to avoid heavy Turf operations during rendering
  const preCalculatedKebunOutlines = useMemo(() => {
    if (!geojsonData || !geojsonData.features) return [];
    
    const kebunGroups: Record<string, any[]> = {};
    geojsonData.features.forEach((feat) => {
      const k = feat.properties.kebun || 'Unknown';
      if (!kebunGroups[k]) kebunGroups[k] = [];
      kebunGroups[k].push(feat);
    });

    const outlines: any[] = [];
    Object.entries(kebunGroups).forEach(([kebunName, feats]) => {
      try {
        const dissolved = dissolveFeaturesCleanly(feats);
        if (dissolved) {
          dissolved.properties = { kebun: kebunName };
          outlines.push(dissolved);
        }
      } catch (err) {
        console.error('Failed to dissolve kebun outline:', kebunName, err);
      }
    });
    return outlines;
  }, [geojsonData]);

  // Toggle loading class on body when rendering map vector layers
  useEffect(() => {
    if (isProcessing) {
      document.body.classList.add('loading-state');
    } else {
      document.body.classList.remove('loading-state');
    }
    return () => document.body.classList.remove('loading-state');
  }, [isProcessing]);

  const [mapType, setMapType] = useState<'silver' | 'standard' | 'satellite' | 'dark'>('silver');
  const [roadsOpacity, setRoadsOpacity] = useState(0.4);
  const [placesOpacity, setPlacesOpacity] = useState(0.4);
  const [labelsOpacity, setLabelsOpacity] = useState(0.6);
  const [showTypePanel, setShowTypePanel] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geojsonLayerRef = useRef<any>(null);
  const highlightLayerRef = useRef<any>(null);

  // Zoom & Highlight selectedFeature when searched from SidePanel or clicked
  useEffect(() => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;
    const L = require('leaflet');

    // Remove previous highlight
    if (highlightLayerRef.current) {
      try {
        currentMap.removeLayer(highlightLayerRef.current);
      } catch {}
      highlightLayerRef.current = null;
    }

    if (!currentMap.getPane('highlightPane')) {
      const pane = currentMap.createPane('highlightPane');
      pane.style.zIndex = '650';
      pane.style.pointerEvents = 'none';
    }

    if (selectedFeature && selectedFeature.geometry) {
      console.log('✨ [MapView] Zooming & Highlighting selectedFeature:', selectedFeature.properties);
      try {
        const highlightLayer = L.geoJSON(selectedFeature, {
          pane: 'highlightPane',
          style: {
            color: '#FFD700', // Bright Gold outline
            weight: 6,
            fillColor: '#00E5FF', // Neon Cyan fill
            fillOpacity: 0.5,
            opacity: 1,
            dashArray: '6, 6',
          },
        }).addTo(currentMap);

        highlightLayerRef.current = highlightLayer;

        const bounds = highlightLayer.getBounds();
        if (bounds && bounds.isValid()) {
          // 150ms timeout ensures Leaflet layer initialization completes before zoom animation starts
          setTimeout(() => {
            try {
              currentMap.flyToBounds(bounds, {
                padding: [100, 100],
                maxZoom: 16,
                animate: true,
                duration: 1.2,
              });
            } catch (zoomErr) {
              currentMap.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });
            }
          }, 150);
        }
      } catch (err) {
        console.error('Error zooming & highlighting feature:', err);
      }
    }
  }, [selectedFeature]);

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

    setIsProcessing(true);

    const L = require('leaflet');

    const timer = setTimeout(() => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      
      try {
        // Remove existing GeoJSON layer
        if (geojsonLayerRef.current) {
          currentMap.removeLayer(geojsonLayerRef.current);
          geojsonLayerRef.current = null;
        }

        // Filter by active kebun
        const filteredFeatures =
          activeKebun.length === 0
            ? geojsonData.features
            : geojsonData.features.filter((f) =>
                activeKebun.includes(f.properties.kebun || '')
              );

        if (filteredFeatures.length === 0) {
          setIsProcessing(false);
          isFirstRenderRef.current = false;
          return;
        }

        // 1. GET KEBUN OUTLINES (From pre-calculated static geometries)
        const kebunOutlineFeatures: any[] = [];
        const activeKebunNames = Array.from(new Set(filteredFeatures.map((f) => f.properties.kebun).filter(Boolean)));
        preCalculatedKebunOutlines.forEach((outline) => {
          if (activeKebunNames.includes(outline.properties.kebun)) {
            kebunOutlineFeatures.push(outline);
          }
        });

        let outlinesLayerInstance: any = null;
        let layerGroup: any = null;
        const effectiveDetailLevel = detailLevel;

        // 2. RENDER MAP LAYERS ACCORDING TO DETAIL LEVEL
        if (effectiveDetailLevel === 'block') {
          const blocksLayer = L.geoJSON(
            { type: 'FeatureCollection', features: filteredFeatures },
            {
              style: (feature: GeoJSONFeature) => {
                const color = getFeatureColor(feature, viewMode, showEmptyData, detailLevel, fourColorBlockMap, fourColorAfdMap);
                return {
                  fillColor: color,
                  fillOpacity: 0.95,
                  stroke: true,
                  color: '#ffffff', // Thin white stroke to separate adjacent blocks
                  weight: 0.6,
                  opacity: 1,
                };
              },
              onEachFeature: (feature: GeoJSONFeature, lyr: any) => {
                const p = feature.properties;
                const kebunName = getKebunDisplayName(p.kebun);
                const afdelingName = p.afdeling ? `Afd ${p.afdeling}` : 'Afdeling -';
                const blockCode = p.kode_blok || p.no_polygon || 'Blok';
                const region = [p.desa, p.kecamatan, p.kabupaten].filter(Boolean).join(', ');

                const tooltipHtml = `
                  <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 6px 10px; font-size: 11px; line-height: 1.4; color: #161616;">
                    <div style="font-weight: 700; color: var(--cds-primary); margin-bottom: 2px;">
                      Kebun ${kebunName} &middot; ${afdelingName}
                    </div>
                    <div style="font-weight: 600; color: #525252; margin-bottom: 4px;">
                      Blok: ${blockCode}
                    </div>
                    ${p.keterangan && p.keterangan !== 'null' ? `
                    <div style="font-size: 10px; font-weight: 600; color: #393939; margin-bottom: 4px;">
                      Ket: <span style="color: var(--cds-primary); font-weight: 700;">${p.keterangan}</span>
                    </div>
                    ` : ''}
                    ${region ? `<div style="font-size: 10px; color: #8d8d8d; border-top: 1px solid #e0e0e0; padding-top: 3px; margin-top: 3px;">${region}</div>` : ''}
                  </div>
                `;

                lyr.bindTooltip(tooltipHtml, {
                  sticky: true,
                  direction: 'auto',
                  className: 'carbon-map-tooltip',
                  opacity: 0.95,
                });

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
            { type: 'FeatureCollection', features: kebunOutlineFeatures },
            {
              style: () => ({
                fill: false,
                color: '#262626',
                weight: 1.4,
                opacity: 1,
              }),
              interactive: false,
            }
          );

          layerGroup = L.layerGroup([blocksLayer, outlinesLayerInstance]).addTo(currentMap);
        } else if (effectiveDetailLevel === 'afdeling') {
          const afdFeatures = filteredFeatures.map((feat) => {
            const copy = JSON.parse(JSON.stringify(feat));
            copy.properties.is_afdeling_level = true;
            return copy;
          });

          const afdLayer = L.geoJSON(
            { type: 'FeatureCollection', features: afdFeatures },
            {
              style: (feature: GeoJSONFeature) => {
                const color = getFeatureColor(feature, viewMode, showEmptyData, detailLevel, fourColorBlockMap, fourColorAfdMap);
                const hasAfd = feature.properties.afdeling && feature.properties.afdeling !== 'Unknown' && feature.properties.afdeling !== '-';
                return {
                  fillColor: hasAfd ? color : 'transparent',
                  fillOpacity: hasAfd ? 0.95 : 0,
                  stroke: true,
                  color: hasAfd ? '#525252' : '#8d8d8d', // Thin charcoal outline to separate every block, light gray for null
                  weight: 0.8,
                  opacity: 1,
                };
              },
              onEachFeature: (feature: GeoJSONFeature, lyr: any) => {
                const p = feature.properties;
                const kebunName = getKebunDisplayName(p.kebun);
                const afdelingName = p.afdeling ? `Afdeling ${p.afdeling}` : 'Afdeling -';

                const tooltipHtml = `
                  <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 6px 10px; font-size: 11px; line-height: 1.4; color: #161616;">
                    <div style="font-weight: 700; color: var(--cds-primary); margin-bottom: 2px;">
                      Kebun ${kebunName} &middot; ${afdelingName}
                    </div>
                    <div style="font-weight: 600; color: #525252; margin-bottom: 4px;">
                      No. Peta: ${p.nomor_peta || p.no_polygon || '-'}
                    </div>
                    ${p.status && p.status !== 'Unknown' && p.status !== '-' ? `
                    <div style="font-size: 10px; font-weight: 600; color: #393939; margin-bottom: 2px;">
                      Status: <span style="color: var(--cds-primary); font-weight: 700;">${p.status}</span>
                    </div>
                    ` : ''}
                    ${p.keterangan && p.keterangan !== 'null' && p.keterangan !== '-' ? `
                    <div style="font-size: 10px; font-weight: 600; color: #393939; margin-bottom: 4px;">
                      Ket: <span style="color: var(--cds-primary); font-weight: 700;">${p.keterangan}</span>
                    </div>
                    ` : ''}
                    <div style="font-size: 10px; color: #8d8d8d; border-top: 1px solid #e0e0e0; padding-top: 3px; margin-top: 3px;">
                      Luas: ${p.l_gis ? p.l_gis.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : 0} Ha
                    </div>
                  </div>
                `;

                lyr.bindTooltip(tooltipHtml, {
                  sticky: true,
                  direction: 'auto',
                  className: 'carbon-map-tooltip',
                  opacity: 0.95,
                });

                lyr.on({
                  mouseover: () => {
                    const hasAfd = feature.properties.afdeling && feature.properties.afdeling !== 'Unknown' && feature.properties.afdeling !== '-';
                    if (hasAfd) {
                      lyr.setStyle({ fillOpacity: 1.0 });
                    } else {
                      lyr.setStyle({ fillColor: '#888888', fillOpacity: 0.2 });
                    }
                  },
                  mouseout: () => {
                    afdLayer.resetStyle(lyr);
                  },
                  click: () => {
                    onFeatureClick(feature);
                  },
                });
              },
            }
          );

          // Get pre-calculated afdeling bold outlines for active kebuns
          const activeKebunNames = Array.from(new Set(filteredFeatures.map((f) => f.properties.kebun).filter(Boolean)));
          const afdOutlineFeatures = preCalculatedAfdOutlines.filter((outline) =>
            activeKebunNames.includes(outline.properties.kebun)
          );

          // Dedicated Afdeling Outline Boundary Lines
          const afdOutlineLayer = L.geoJSON(
            { type: 'FeatureCollection', features: afdOutlineFeatures },
            {
              style: (feature?: GeoJSONFeature) => {
                const hasAfd = feature?.properties?.afdeling && feature.properties.afdeling !== 'Unknown' && feature.properties.afdeling !== '-';
                return {
                  fill: false,
                  color: hasAfd ? '#161616' : '#8d8d8d', // Charcoal Afdeling Boundary, light gray for null afdeling
                  weight: 1.8,
                  opacity: 1,
                };
              },
              interactive: false,
            }
          );

          outlinesLayerInstance = L.geoJSON(
            { type: 'FeatureCollection', features: kebunOutlineFeatures },
            {
              style: () => ({
                fill: false,
                color: '#000000', // Bold Kebun Boundary
                weight: 2.6,
                opacity: 1,
              }),
              interactive: false,
            }
          );

          layerGroup = L.layerGroup([afdLayer, afdOutlineLayer, outlinesLayerInstance]).addTo(currentMap);
        }
        else {
          // effectiveDetailLevel === 'kebun'
          const kebunAggregates: Record<string, { l_gis: number; l_rkap: number; populasi: number; protas_21: number; protas_22: number; protas_23: number; protas_24: number }> = {};
          filteredFeatures.forEach((feat) => {
            const k = feat.properties.kebun || 'Unknown';
            if (!kebunAggregates[k]) {
              kebunAggregates[k] = { l_gis: 0, l_rkap: 0, populasi: 0, protas_21: 0, protas_22: 0, protas_23: 0, protas_24: 0 };
            }
            const p = feat.properties;
            kebunAggregates[k].l_gis += p.l_gis || 0;
            kebunAggregates[k].l_rkap += p.l_rkap || 0;
            kebunAggregates[k].populasi += p.populasi || 0;
            
            kebunAggregates[k].protas_21 += p.protas_21 || 0;
            kebunAggregates[k].protas_22 += p.protas_22 || 0;
            kebunAggregates[k].protas_23 += p.protas_23 || 0;
            kebunAggregates[k].protas_24 += p.protas_24 || p.protas_23 || p.protas_22 || p.protas_21 || 0;
          });

          const kebunFeatures: any[] = [];
          Object.keys(kebunAggregates).forEach((kebunName) => {
            try {
              const outline = preCalculatedKebunOutlines.find((o) => o.properties.kebun === kebunName);
              if (outline) {
                const dissolvedClone = JSON.parse(JSON.stringify(outline));
                const feats = filteredFeatures.filter((f) => (f.properties.kebun || 'Unknown') === kebunName);
                const agg = kebunAggregates[kebunName] || { l_gis: 1, l_rkap: 0, populasi: 0, protas_21: 0, protas_22: 0, protas_23: 0, protas_24: 0 };
                const pYears = feats.map((f) => {
                  const yr = f.properties.thn_tanam;
                  if (!yr) return null;
                  const num = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
                  return isNaN(num) ? null : num;
                }).filter(Boolean) as number[];
                const avgYr = pYears.length > 0 ? Math.round(pYears.reduce((a, b) => a + b, 0) / pYears.length) : null;
                
                const komodities = Array.from(new Set(feats.map((f) => f.properties.komoditi).filter(Boolean))).join(', ');
                const statuses = Array.from(new Set(feats.map((f) => f.properties.status).filter(Boolean))).join(', ');
                const varietas = Array.from(new Set(feats.map((f) => f.properties.varietas).filter(Boolean))).slice(0, 3).join(', ');

                dissolvedClone.properties = {
                  kebun: kebunName,
                  l_gis: agg.l_gis,
                  l_rkap: agg.l_rkap,
                  populasi: agg.populasi,
                  protas_21: agg.protas_21,
                  protas_22: agg.protas_22,
                  protas_23: agg.protas_23,
                  protas_24: agg.protas_24,
                  thn_tanam: avgYr ? `${avgYr}` : null,
                  komoditi: komodities,
                  status: statuses,
                  varietas: varietas,
                  is_kebun_level: true
                };
                kebunFeatures.push(dissolvedClone);
              }
            } catch (err) {
              console.error(`Failed to union kebun for ${kebunName}:`, err);
            }
          });

          const kebunLayer = L.geoJSON(
            { type: 'FeatureCollection', features: kebunFeatures },
            {
              style: (feature: GeoJSONFeature) => {
                const color = getFeatureColor(feature, viewMode, showEmptyData, detailLevel, fourColorBlockMap, fourColorAfdMap);
                return {
                  fillColor: color,
                  fillOpacity: 0.95,
                  stroke: true,
                  color: '#262626', // Charcoal borders for kebun outlines
                  weight: 1.2,
                  opacity: 1,
                };
              },
              onEachFeature: (feature: GeoJSONFeature, lyr: any) => {
                const p = feature.properties;
                const kebunName = getKebunDisplayName(p.kebun);

                const tooltipHtml = `
                  <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 6px 10px; font-size: 11px; line-height: 1.4; color: #161616;">
                    <div style="font-weight: 700; color: var(--cds-primary); margin-bottom: 2px;">
                      Kebun ${kebunName}
                    </div>
                    <div style="font-size: 10px; color: #8d8d8d; border-top: 1px solid #e0e0e0; padding-top: 3px; margin-top: 3px;">
                      Total Luas: ${p.l_gis ? p.l_gis.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : 0} Ha
                    </div>
                  </div>
                `;

                lyr.bindTooltip(tooltipHtml, {
                  sticky: true,
                  direction: 'auto',
                  className: 'carbon-map-tooltip',
                  opacity: 0.95,
                });

                lyr.on({
                  mouseover: () => {
                    lyr.setStyle({ fillOpacity: 1.0 });
                    lyr.bringToFront();
                  },
                  mouseout: () => {
                    kebunLayer.resetStyle(lyr);
                  },
                  click: () => {
                    onFeatureClick(feature);
                  },
                });
              },
            }
          );

          layerGroup = L.layerGroup([kebunLayer]).addTo(currentMap);
        }

        geojsonLayerRef.current = layerGroup;
      } catch (err) {
        console.error('Error rendering layers:', err);
      } finally {
        setIsProcessing(false);
        isFirstRenderRef.current = false;
      }
    }, 100); // Tiny timeout yields thread execution, allowing loading state to mount & paint

    return () => clearTimeout(timer);
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

      {/* Bottom Floating Map Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
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
          {viewMode === 'default' && (detailLevel === 'kebun' ? 'Legenda Wilayah Kebun' : 'Legenda Wilayah (Teorema Empat Warna)')}
          {viewMode === 'productivity' && 'Legenda Produktivitas (kg/Ha)'}
          {viewMode === 'age' && 'Legenda Umur Tanaman (Tahun)'}
          {viewMode === 'density' && 'Legenda Kerapatan (Pohon/Ha)'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {viewMode === 'default' && detailLevel === 'kebun' &&
            Object.entries(KEBUN_COLORS).map(([name, color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{ width: '10px', height: '10px', borderRadius: '0px', background: color, cursor: 'help' }}
                  title={`Warna: ${getColorName(color)}`}
                />
                <span style={{ color: 'var(--cds-text-secondary)' }}>Kebun {getKebunDisplayName(name)}</span>
              </div>
            ))}

          {viewMode === 'default' && detailLevel !== 'kebun' && [
            { label: 'Warna 1 (Biru Carbon)', color: '#0F62FE' },
            { label: 'Warna 2 (Hijau Carbon)', color: '#24A148' },
            { label: 'Warna 3 (Magenta Carbon)', color: '#EE5396' },
            { label: 'Warna 4 (Amber Carbon)', color: '#F5A623' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color, cursor: 'help' }}
                title={`Warna: ${getColorName(item.color)}`}
              />
              <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
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
              <div
                style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color, cursor: 'help' }}
                title={`Warna: ${getColorName(item.color)}`}
              />
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
              <div
                style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color, cursor: 'help' }}
                title={`Warna: ${getColorName(item.color)}`}
              />
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
              <div
                style={{ width: '10px', height: '10px', borderRadius: '0px', background: item.color, cursor: 'help' }}
                title={`Warna: ${getColorName(item.color)}`}
              />
              <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Initial full overlay loading state */}
      {isProcessing && isFirstRenderRef.current && (
        <CarbonLoader overlay description="Menggambar Peta Wilayah..." />
      )}

      {/* Busy indicator in the top-right during updates */}
      {isProcessing && !isFirstRenderRef.current && (
        <div
          style={{
            position: 'absolute',
            top: '88px', // Float below StatsBar (at top 16px, height ~56px)
            right: '16px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1px solid var(--cds-border)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            fontFamily: "'IBM Plex Sans', sans-serif",
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <CarbonLoader small />
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--cds-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Memproses Analisis...
          </span>
        </div>
      )}
    </div>
  );
}

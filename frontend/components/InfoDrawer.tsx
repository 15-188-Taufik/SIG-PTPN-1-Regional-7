'use client';

import { useState, useEffect } from 'react';
import { GeoJSONFeature, FeatureCollection } from '@/types/kebun';
import { fetchBlokHistory } from '@/lib/api';

interface InfoDrawerProps {
  feature: GeoJSONFeature | null;
  kebunName: string | null;
  geojsonData: FeatureCollection | null;
  onClose: () => void;
}

export function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  if (norm.toLowerCase() === 'wabe' || norm.toLowerCase() === 'way belulu') return 'Way Berulu';
  return norm;
}

const STATUS_LABELS: Record<string, string> = {
  TM: 'Tanaman Menghasilkan (TM)',
  TBM: 'Tanaman Belum Menghasilkan (TBM)',
  TT: 'Tanaman Tua (TT)',
};

const KEY_LABEL_MAP: Record<string, string> = {
  kebun: 'Kebun',
  kode_blok: 'Kode Blok',
  no_polygon: 'No. Polygon',
  no_aset: 'No. Aset',
  afdeling: 'Afdeling',
  komoditi: 'Komoditi',
  status: 'Status',
  thn_tanam: 'Tahun Tanam',
  varietas: 'Varietas',
  kabupaten: 'Kabupaten',
  kecamatan: 'Kecamatan',
  desa: 'Desa',
  l_gis: 'Luas GIS',
  l_rkap: 'Luas RKAP',
  l_hgu: 'Luas HGU',
  populasi: 'Populasi',
  pica: 'Status PICA',
  alas_hak: 'Alas Hak',
  kat_als_hk: 'Kategori Alas Hak',
  status_kpm: 'Manajemen / KPM',
  nomor_peta: 'Nomor Peta',
  keterangan: 'Keterangan',
};

function formatKeyLabel(key: string): string {
  const normKey = key.toLowerCase();
  if (KEY_LABEL_MAP[normKey]) return KEY_LABEL_MAP[normKey];
  return key
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '-';
  const lowerKey = key.toLowerCase();
  if (typeof val === 'number') {
    if (lowerKey.includes('luas') || lowerKey.startsWith('l_')) {
      return `${val.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ha`;
    }
    if (lowerKey === 'populasi') {
      return `${val.toLocaleString('id-ID')} pohon`;
    }
    return val.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }
  return val.toString();
}

export default function InfoDrawer({ feature, kebunName, geojsonData, onClose }: InfoDrawerProps) {
  const [height, setHeight] = useState(380); // Default bottom drawer height (380px)
  const [history, setHistory] = useState<{
    pemeliharaan: any[];
    pemupukan: any[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(180, Math.min(window.innerHeight - 80, startHeight + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY;
    const startHeight = height;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaY = startY - moveEvent.touches[0].clientY;
      const newHeight = Math.max(180, Math.min(window.innerHeight - 80, startHeight + deltaY));
      setHeight(newHeight);
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  };

  useEffect(() => {
    if (feature && feature.properties && feature.properties.id) {
      setLoadingHistory(true);
      fetchBlokHistory(feature.properties.id)
        .then((data) => {
          setHistory(data);
        })
        .catch((err) => {
          console.error('Failed to fetch block history:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    } else {
      setHistory(null);
    }
  }, [feature]);

  if (!feature && !kebunName) return null;

  let p: any = {};
  let title = '';
  let subtitle = '';

  if (feature) {
    p = feature.properties;
    title = `Kebun ${getKebunDisplayName(p.kebun) || '-'}`;
    const afdStr = p.afdeling ? `Afdeling ${p.afdeling}` : 'Afdeling -';
    subtitle = `Atribut Blok Lahan — ${afdStr}`;
  } else if (kebunName && geojsonData) {
    const kFeats = geojsonData.features.filter(
      (f) => f.properties.kebun?.toLowerCase() === kebunName.toLowerCase()
    );
    const sumGis = kFeats.reduce((sum, f) => sum + (f.properties.l_gis || 0), 0);
    const sumRkap = kFeats.reduce((sum, f) => sum + (f.properties.l_rkap || 0), 0);
    const sumPop = kFeats.reduce((sum, f) => sum + (f.properties.populasi || 0), 0);
    
    const sumProtas21 = kFeats.reduce((sum, f) => sum + (f.properties.protas_21 || 0), 0);
    const sumProtas22 = kFeats.reduce((sum, f) => sum + (f.properties.protas_22 || 0), 0);
    const sumProtas23 = kFeats.reduce((sum, f) => sum + (f.properties.protas_23 || 0), 0);
    const sumProtas24 = kFeats.reduce((sum, f) => sum + (f.properties.protas_24 || 0), 0);

    const komodities = Array.from(new Set(kFeats.map((f) => f.properties.komoditi).filter(Boolean)));
    const statuses = Array.from(new Set(kFeats.map((f) => f.properties.status).filter(Boolean)));
    const varietas = Array.from(new Set(kFeats.map((f) => f.properties.varietas).filter(Boolean)));
    
    const plantYears = kFeats.map((f) => {
      const yr = f.properties.thn_tanam;
      if (!yr) return null;
      const num = parseInt(yr.toString().replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? null : num;
    }).filter(Boolean) as number[];

    let yrStr = '-';
    if (plantYears.length > 0) {
      const minYr = Math.min(...plantYears);
      const maxYr = Math.max(...plantYears);
      yrStr = minYr === maxYr ? `${minYr}` : `${minYr} - ${maxYr}`;
    }

    const picaCount = kFeats.filter((f) => f.properties.pica && f.properties.pica !== 'null').length;

    p = {
      kebun: kebunName,
      afdeling: 'Semua Afdeling',
      komoditi: komodities.join(', ') || '-',
      status: statuses.map((s) => (s ? STATUS_LABELS[s as string] || s : '')).filter(Boolean).join(', ') || '-',
      l_gis: sumGis,
      l_rkap: sumRkap,
      thn_tanam: yrStr,
      varietas: varietas.slice(0, 3).join(', ') + (varietas.length > 3 ? '...' : '') || '-',
      populasi: sumPop,
      alas_hak: 'Terlampir per Blok',
      pica: picaCount > 0 ? `${picaCount} blok bermasalah` : 'Normal',
      status_kpm: kFeats[0]?.properties.status_kpm || '-',
      desa: Array.from(new Set(kFeats.map((f) => f.properties.desa).filter(Boolean))).slice(0, 3).join(', ') || '-',
      kecamatan: '',
      kabupaten: '',
      protas_21: sumProtas21,
      protas_22: sumProtas22,
      protas_23: sumProtas23,
      protas_24: sumProtas24,
    };

    title = `Kebun ${getKebunDisplayName(kebunName)}`;
    subtitle = `Analisis Graf Akumulatif Kebun (${kFeats.length} Blok)`;
  }

  const productionData = [
    { year: '2021', value: p.protas_21 },
    { year: '2022', value: p.protas_22 },
    { year: '2023', value: p.protas_23 },
    { year: '2024', value: p.protas_24 },
  ].filter((d) => d.value != null && d.value > 0);

  const maxProtas = Math.max(...productionData.map((d) => d.value || 0), 1);

  // Generate a list of key-value pairs to display dynamically
  const excludeKeys = new Set(['is_afdeling_level', 'is_kebun_level', 'id', 'source_file', 'imported_at', 'protas_21', 'protas_22', 'protas_23', 'protas_24', 'geom']);
  
  // Sort keys: We want to show the most important keys first in a specific order
  const priorityOrder = [
    'kebun', 'afdeling', 'nomor_peta', 'no_polygon', 'kode_blok', 
    'komoditi', 'status', 'thn_tanam', 'varietas', 'populasi',
    'l_gis', 'l_rkap', 'l_hgu', 'pica', 'alas_hak', 'status_kpm',
    'keterangan', 'mandor', 'no_aset', 'nama_pemil', 'pengelola',
    'kabupaten', 'kecamatan', 'desa'
  ];

  const keys = Object.keys(p);
  const attributeList = keys
    .filter((k) => {
      if (k !== k.toLowerCase() && keys.includes(k.toLowerCase())) {
        return false;
      }
      return !excludeKeys.has(k);
    })
    .sort((a, b) => {
      const idxA = priorityOrder.indexOf(a.toLowerCase());
      const idxB = priorityOrder.indexOf(b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })
    .map((k) => ({
      key: k,
      label: formatKeyLabel(k),
      value: formatValue(k, p[k]),
    }));

  const attributePairs: { first: any; second: any }[] = [];
  for (let i = 0; i < attributeList.length; i += 2) {
    attributePairs.push({
      first: attributeList[i],
      second: attributeList[i + 1] || null,
    });
  }

  return (
    <>
      {/* Drawer Panel (IBM Carbon style: flat white panel, sharp edges, top border accent, resizable height) */}
      <div
        className="animate-slide-up"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${height}px`,
          zIndex: 2000,
          background: '#ffffff',
          borderTop: '3px solid var(--cds-primary)',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
          padding: '28px 24px 20px 24px', // padding adjusted for drag handle
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {/* Drag Handle for Resizing */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            width: '100%',
            height: '14px',
            cursor: 'ns-resize',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f4f4f4',
            borderBottom: '1px solid #e0e0e0',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '48px',
              height: '4px',
              borderRadius: '2px',
              background: '#8d8d8d',
            }}
          />
        </div>

        {/* Drawer Header (Fixed at the top) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--cds-border)',
            paddingBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--cds-primary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {subtitle || 'Atribut Blok Lahan'}
              </span>
              {p.kode_blok && (
                <span
                  style={{
                    padding: '2px 8px',
                    background: '#f4f4f4',
                    border: '1px solid var(--cds-border-strong)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--cds-text-primary)',
                  }}
                >
                  {p.kode_blok}
                </span>
              )}
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'var(--cds-text-primary)',
                margin: '4px 0 0 0',
              }}
            >
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f4f4f4',
              border: '1px solid var(--cds-border)',
              borderRadius: '0px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              color: 'var(--cds-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2L12 12M12 2L2 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Wrapper */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
          {/* Content Layout (Table on left, Chart on right) */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          
          {/* IBM Carbon Data Table */}
          <div style={{ flex: '2 1 450px' }}>
            <table className="carbon-table">
              <tbody>
                {attributePairs.map((pair, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600', width: '25%', background: '#f4f4f4', fontSize: '11px', padding: '6px 12px' }}>
                      {pair.first.label}
                    </td>
                    <td style={{ width: '25%', fontSize: '11px', padding: '6px 12px' }}>
                      {pair.first.value}
                    </td>
                    {pair.second ? (
                      <>
                        <td style={{ fontWeight: '600', width: '25%', background: '#f4f4f4', fontSize: '11px', padding: '6px 12px' }}>
                          {pair.second.label}
                        </td>
                        <td style={{ width: '25%', fontSize: '11px', padding: '6px 12px' }}>
                          {pair.second.value}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: '600', width: '25%', background: '#f4f4f4', fontSize: '11px', padding: '6px 12px' }}>-</td>
                        <td style={{ width: '25%', fontSize: '11px', padding: '6px 12px' }}>-</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Production Chart (Carbon styled flat bar chart) */}
          {productionData.length > 0 && (
            <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--cds-text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--cds-border)',
                  paddingBottom: '6px',
                }}
              >
                Tren Hasil Produksi (kg/tahun)
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-end',
                  height: '110px',
                  background: '#f4f4f4',
                  padding: '16px',
                  border: '1px solid var(--cds-border)',
                }}
              >
                {productionData.map((d) => (
                  <div
                    key={d.year}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        color: 'var(--cds-text-primary)',
                        fontWeight: '700',
                      }}
                    >
                      {((d.value || 0) / 1000).toFixed(1)}k
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${((d.value || 0) / maxProtas) * 55}px`,
                        background: 'var(--cds-primary)',
                        minHeight: '4px',
                        transition: 'height 0.4s ease',
                      }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--cds-text-secondary)', fontWeight: '500' }}>
                      {d.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Riwayat Transaksi Blok (Google Sheets webhook data) */}
        {feature && (
          <div
            style={{
              marginTop: '28px',
              borderTop: '1px solid var(--cds-border)',
              paddingTop: '20px',
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--cds-text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              Riwayat Kegiatan Harian Blok (Input Sheets)
            </div>

            {loadingHistory ? (
              <div style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', fontStyle: 'italic' }}>
                Memuat riwayat kegiatan...
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* Kolom Pemeliharaan */}
                <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--cds-text-primary)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🛠️ Pemeliharaan Harian
                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--cds-text-secondary)' }}>
                      ({history?.pemeliharaan?.length || 0} catatan)
                    </span>
                  </div>
                  
                  {history?.pemeliharaan && history.pemeliharaan.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {history.pemeliharaan.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            background: '#f4f4f4',
                            borderLeft: '3px solid var(--cds-primary)',
                            padding: '8px 12px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: 'var(--cds-text-primary)' }}>
                            <span>{h.jenis_kegiatan}</span>
                            <span style={{ color: 'var(--cds-text-secondary)', fontWeight: 'normal' }}>{formatDateString(h.tanggal)}</span>
                          </div>
                          <div style={{ color: 'var(--cds-text-secondary)', marginTop: '4px', fontSize: '11px' }}>
                            {h.material && <span>Bahan: <strong>{h.material}</strong> ({h.dosis_aplikasi} L/Kg) | </span>}
                            <span>Luas: <strong>{h.luas_aplikasi} Ha</strong></span>
                            {h.tenaga_kerja !== null && <span> | HK: <strong>{h.tenaga_kerja}</strong></span>}
                          </div>
                          {h.keterangan && (
                            <div style={{ fontStyle: 'italic', marginTop: '4px', color: 'var(--cds-text-secondary)', fontSize: '11px' }}>
                              &ldquo;{h.keterangan}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', fontStyle: 'italic', background: '#fcfcfc', border: '1px dashed var(--cds-border)', padding: '12px', textAlign: 'center' }}>
                      {p.is_afdeling_level || p.is_kebun_level
                        ? 'Riwayat kegiatan harian hanya dapat dilihat pada tingkat detail Blok.'
                        : 'Belum ada catatan pemeliharaan harian untuk blok ini.'}
                    </div>
                  )}
                </div>

                {/* Kolom Pemupukan */}
                <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--cds-text-primary)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🌱 Pemupukan Harian
                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--cds-text-secondary)' }}>
                      ({history?.pemupukan?.length || 0} catatan)
                    </span>
                  </div>

                  {history?.pemupukan && history.pemupukan.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {history.pemupukan.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            background: '#f4f4f4',
                            borderLeft: '3px solid #24a148', // Green color accent for fertilizing
                            padding: '8px 12px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: 'var(--cds-text-primary)' }}>
                            <span>Pupuk: {h.jenis_pupuk}</span>
                            <span style={{ color: 'var(--cds-text-secondary)', fontWeight: 'normal' }}>{formatDateString(h.tanggal)}</span>
                          </div>
                          <div style={{ color: 'var(--cds-text-secondary)', marginTop: '4px', fontSize: '11px' }}>
                            <span>Jumlah: <strong>{h.jumlah_pupuk} Kg</strong> | </span>
                            <span>Luas: <strong>{h.luas_aplikasi} Ha</strong></span>
                            {h.tenaga_kerja !== null && <span> | HK: <strong>{h.tenaga_kerja}</strong></span>}
                          </div>
                          {h.keterangan && (
                            <div style={{ fontStyle: 'italic', marginTop: '4px', color: 'var(--cds-text-secondary)', fontSize: '11px' }}>
                              &ldquo;{h.keterangan}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', fontStyle: 'italic', background: '#fcfcfc', border: '1px dashed var(--cds-border)', padding: '12px', textAlign: 'center' }}>
                      {p.is_afdeling_level || p.is_kebun_level
                        ? 'Riwayat kegiatan harian hanya dapat dilihat pada tingkat detail Blok.'
                        : 'Belum ada catatan pemupukan harian untuk blok ini.'}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </>
  );
}

function formatDateString(isoDateStr: string | null): string {
  if (!isoDateStr) return '-';
  try {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    }
    return isoDateStr;
  } catch (e) {
    return isoDateStr;
  }
}

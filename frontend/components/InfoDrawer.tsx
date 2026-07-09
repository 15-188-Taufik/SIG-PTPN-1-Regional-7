'use client';

import { GeoJSONFeature, FeatureCollection } from '@/types/kebun';

interface InfoDrawerProps {
  feature: GeoJSONFeature | null;
  kebunName: string | null;
  geojsonData: FeatureCollection | null;
  onClose: () => void;
}

export function getKebunDisplayName(name: string | null): string {
  if (!name) return '-';
  const norm = name.trim();
  if (norm.toLowerCase() === 'wabe') return 'Way Belulu';
  return norm;
}

const STATUS_LABELS: Record<string, string> = {
  TM: 'Tanaman Menghasilkan (TM)',
  TBM: 'Tanaman Belum Menghasilkan (TBM)',
  TT: 'Tanaman Tua (TT)',
};

export default function InfoDrawer({ feature, kebunName, geojsonData, onClose }: InfoDrawerProps) {
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

  return (
    <>
      {/* Carbon Table Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1999,
          background: 'rgba(22, 22, 22, 0.3)',
        }}
      />

      {/* Drawer Panel (IBM Carbon style: flat white panel, sharp edges, top border accent) */}
      <div
        className="animate-slide-up"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          background: '#ffffff',
          borderTop: '3px solid var(--cds-primary)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
          padding: '24px',
          maxHeight: '60vh',
          overflowY: 'auto',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {/* Drawer Header */}
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

        {/* Content Layout (Table on left, Chart on right) */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          
          {/* IBM Carbon Data Table */}
          <div style={{ flex: '2 1 450px' }}>
            <table className="carbon-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: '600', width: '25%', background: '#f4f4f4' }}>Afdeling</td>
                  <td style={{ width: '25%' }}>{p.afdeling || '-'}</td>
                  <td style={{ fontWeight: '600', width: '25%', background: '#f4f4f4' }}>Komoditi</td>
                  <td style={{ width: '25%' }}>{p.komoditi || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Status Lahan</td>
                  <td>{p.status || '-'}</td>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Tahun Tanam</td>
                  <td>{p.thn_tanam || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Luas GIS</td>
                  <td>{p.l_gis ? `${p.l_gis.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ha` : '-'}</td>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Luas RKAP</td>
                  <td>{p.l_rkap ? `${p.l_rkap.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ha` : '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Varietas</td>
                  <td>{p.varietas || '-'}</td>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Populasi</td>
                  <td>{p.populasi ? `${p.populasi.toLocaleString('id-ID')} pohon` : '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Alas Hak (Legalitas)</td>
                  <td>{p.alas_hak || '-'}</td>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Status PICA</td>
                  <td>
                    {p.pica && p.pica !== 'null' ? (
                      <span style={{ color: 'var(--cds-support-error)', fontWeight: '700' }}>
                        ⚠️ {p.pica}
                      </span>
                    ) : (
                      'Normal'
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Manajemen / KPM</td>
                  <td>{p.status_kpm || '-'}</td>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Administratif Desa</td>
                  <td>{p.desa || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600', background: '#f4f4f4' }}>Kec. & Kab.</td>
                  <td colSpan={3}>{[p.kecamatan, p.kabupaten].filter(Boolean).join(', ') || '-'}</td>
                </tr>
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
      </div>
    </>
  );
}

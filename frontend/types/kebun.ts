export interface BlokProperties {
  id: number;
  kebun: string | null;
  kode_blok: string | null;
  no_polygon: string | null;
  afdeling: string | null;
  komoditi: string | null;
  status: string | null;
  thn_tanam: string | null;
  varietas: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  desa: string | null;
  l_gis: number | null;
  l_rkap: number | null;
  l_hgu: number | null;
  protas_21: number | null;
  protas_22: number | null;
  protas_23: number | null;
  protas_24: number | null;
  populasi: number | null;
  pica: string | null;
  alas_hak: string | null;
  kat_als_hk: string | null;
  status_kpm: string | null;
  nomor_peta: string | null;
  keterangan: string | null;
  [key: string]: any;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: BlokProperties;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  total: number;
}

export interface KebunStats {
  kebun: string;
  jumlah_blok: number;
  total_luas: number;
}

export interface StatsResponse {
  total_blok: number;
  total_luas_gis: number;
  total_luas_rkap: number;
  per_kebun: KebunStats[];
  per_komoditi: { komoditi: string; jumlah_blok: number; total_luas: number }[];
  per_status: { status: string; jumlah_blok: number }[];
}

import axios, { AxiosInstance } from 'axios';
import { getToken, clearToken } from './auth';
import { FeatureCollection, StatsResponse } from '@/types/kebun';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000, // 90 seconds to handle DB cold-start cache warm-up
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and log 404s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 404) {
      // Log 404 with URL for debugging
      const url = error.config?.url || 'unknown';
      console.warn(`[API 404] Resource not found: ${url}. Data may be stale — try refreshing the page.`);
    }
    return Promise.reject(error);
  }
);

// Persistent browser cache keys - bump version to force invalidation after re-imports
const CACHE_GEOJSON_KEY = 'sig_ptpn_geojson_v3';
const CACHE_STATS_KEY = 'sig_ptpn_stats_v3';
const CACHE_KEBUN_LIST_KEY = 'sig_ptpn_kebun_list_v3';

// In-memory cache variables to eliminate re-fetching latency when switching tabs
let cachedGeoJSON: FeatureCollection | null = null;
let cachedStats: StatsResponse | null = null;
let cachedKebunList: string[] | null = null;
let cachedKebunOutlines: FeatureCollection | null = null;
let cachedAfdOutlines: FeatureCollection | null = null;

export function invalidateGeoJSONCache() {
  cachedGeoJSON = null;
  cachedStats = null;
  cachedKebunList = null;
  cachedKebunOutlines = null;
  cachedAfdOutlines = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CACHE_GEOJSON_KEY);
      sessionStorage.removeItem(CACHE_STATS_KEY);
      sessionStorage.removeItem(CACHE_KEBUN_LIST_KEY);
    } catch (e) {
      console.warn('Could not clear sessionStorage cache', e);
    }
  }
}

export async function login(username: string, password: string) {
  const res = await api.post('/api/auth/login', { username, password });
  return res.data as { access_token: string; username: string };
}

export async function fetchKebun(
  params?: {
    kebun?: string;
    komoditi?: string;
    status?: string;
  },
  forceRefresh = false
): Promise<FeatureCollection> {
  if (!params && !forceRefresh) {
    if (cachedGeoJSON) {
      return cachedGeoJSON;
    }
  }

  const res = await api.get('/api/kebun', { params });
  if (!params) {
    cachedGeoJSON = res.data;
  }
  return res.data;
}

export async function fetchStats(forceRefresh = false): Promise<StatsResponse> {
  if (!forceRefresh) {
    if (cachedStats) {
      return cachedStats;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(CACHE_STATS_KEY);
        if (stored) {
          cachedStats = JSON.parse(stored);
          return cachedStats!;
        }
      } catch (e) {
        console.warn('Error reading stats from sessionStorage', e);
      }
    }
  }

  const res = await api.get('/api/kebun/stats');
  cachedStats = res.data;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_STATS_KEY, JSON.stringify(res.data));
    } catch (e) {
      console.warn('SessionStorage quota exceeded for stats cache', e);
    }
  }
  return res.data;
}

// Non-plantation entries that should be excluded from the Filter Unit Kebun list
const EXCLUDED_FROM_KEBUN_FILTER = new Set([
  'kso', 'infrastruktur', 'emplasemen', 'fasilitas', 'jalan', 'parit', 'embung',
]);

function isPlantationKebun(name: string): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  for (const ex of EXCLUDED_FROM_KEBUN_FILTER) {
    if (lower === ex || lower.startsWith(ex + ' ')) return false;
  }
  return true;
}


/**
 * Normalize kebun name: ensure all plantation units have "Unit " prefix.
 * Known aliases are mapped to canonical names. Non-plantation areas are kept as-is.
 */
export function normalizeKebunName(name: string | null): string {
  if (!name) return '';
  const lower = name.trim().toLowerCase();

  // Non-plantation: skip prefix
  for (const np of EXCLUDED_FROM_KEBUN_FILTER) {
    if (lower === np || lower.startsWith(np + ' ')) return name.trim();
  }

  // Already has "Unit " prefix
  if (lower.startsWith('unit ')) return name.trim();

  // Known aliases
  const ALIASES: Record<string, string> = {
    'way berulu': 'Unit Way Berulu', 'wabe': 'Unit Way Berulu',
    'way lima': 'Unit Way Lima', 'wali': 'Unit Way Lima',
    'tulungbuyut': 'Unit Tulungbuyut', 'tubu': 'Unit Tulungbuyut',
    'bergen': 'Unit Bergen',
    'kedaton': 'Unit Kedaton',
    'ketahun': 'Unit Ketahun',
    'padang pelawi': 'Unit Padang Pelawi', 'pawi': 'Unit Padang Pelawi',
  };
  if (ALIASES[lower]) return ALIASES[lower];

  // Generic: prepend "Unit "
  const title = name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return `Unit ${title}`;
}

export async function fetchKebunList(forceRefresh = false): Promise<string[]> {
  if (!forceRefresh) {
    if (cachedKebunList) {
      return cachedKebunList;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(CACHE_KEBUN_LIST_KEY);
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          // Re-normalize and filter out non-plantation entries
          const normalized = [...new Set(
            parsed.map(normalizeKebunName).filter(n => Boolean(n) && isPlantationKebun(n))
          )];
          cachedKebunList = normalized;
          return cachedKebunList!;
        }
      } catch (e) {
        console.warn('Error reading kebun list from sessionStorage', e);
      }
    }
  }

  const res = await api.get('/api/kebun/list');
  // Normalize all names from API, exclude non-plantation entries, deduplicate
  const normalized: string[] = [...new Set(
    (res.data.kebun as string[])
      .map(normalizeKebunName)
      .filter(n => Boolean(n) && isPlantationKebun(n))
  )];
  cachedKebunList = normalized;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEBUN_LIST_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn('SessionStorage quota exceeded for kebun list cache', e);
    }
  }
  return normalized;
}


export async function uploadGeoJSON(file: File): Promise<{
  status: string;
  message: string;
  imported: number;
  updated: number;
}> {
  invalidateGeoJSONCache();
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/kebun/upload-geojson', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function fetchBlokHistory(blokId: number): Promise<{
  pemeliharaan: any[];
  pemupukan: any[];
}> {
  const res = await api.get(`/api/kebun/${blokId}/history`);
  return res.data;
}

export async function warmupBackend(): Promise<boolean> {
  try {
    const rootUrl = API_URL.replace(/\/api\/?$/, '');
    await axios.get(rootUrl, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// KEGIATAN HARIAN INTERFACES & METHODS
// ----------------------------------------------------

export interface PemeliharaanItem {
  id: number;
  blok_id: number;
  tanggal: string;
  jenis_kegiatan: string;
  material?: string;
  dosis_aplikasi?: number;
  luas_aplikasi?: number;
  tenaga_kerja?: number;
  keterangan?: string;
  kebun?: string;
  afdeling?: string;
  kode_blok?: string;
}

export interface PemeliharaanListResponse {
  total: number;
  total_luas: number;
  total_dosis: number;
  total_hk: number;
  items: PemeliharaanItem[];
}

export interface PemupukanItem {
  id: number;
  blok_id: number;
  tanggal: string;
  jenis_pupuk: string;
  jumlah_pupuk: number;
  luas_aplikasi?: number;
  tenaga_kerja?: number;
  keterangan?: string;
  kebun?: string;
  afdeling?: string;
  kode_blok?: string;
}

export interface PemupukanListResponse {
  total: number;
  total_luas: number;
  total_jumlah_pupuk: number;
  total_hk: number;
  items: PemupukanItem[];
}

export async function fetchPemeliharaanList(params?: {
  kebun?: string;
  afdeling?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_order?: 'desc' | 'asc';
  limit?: number;
  offset?: number;
}): Promise<PemeliharaanListResponse> {
  const res = await api.get('/api/kegiatan/pemeliharaan', { params });
  return res.data;
}

export async function createPemeliharaan(data: Omit<PemeliharaanItem, 'id' | 'kebun' | 'afdeling' | 'kode_blok'>): Promise<PemeliharaanItem> {
  const res = await api.post('/api/kegiatan/pemeliharaan', data);
  return res.data;
}

export async function updatePemeliharaan(id: number, data: Partial<PemeliharaanItem>): Promise<PemeliharaanItem> {
  const res = await api.put(`/api/kegiatan/pemeliharaan/${id}`, data);
  return res.data;
}

export async function deletePemeliharaan(id: number): Promise<void> {
  await api.delete(`/api/kegiatan/pemeliharaan/${id}`);
}

export async function fetchPemupukanList(params?: {
  kebun?: string;
  afdeling?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_order?: 'desc' | 'asc';
  limit?: number;
  offset?: number;
}): Promise<PemupukanListResponse> {
  const res = await api.get('/api/kegiatan/pemupukan', { params });
  return res.data;
}

export async function createPemupukan(data: Omit<PemupukanItem, 'id' | 'kebun' | 'afdeling' | 'kode_blok'>): Promise<PemupukanItem> {
  const res = await api.post('/api/kegiatan/pemupukan', data);
  return res.data;
}

export async function updatePemupukan(id: number, data: Partial<PemupukanItem>): Promise<PemupukanItem> {
  const res = await api.put(`/api/kegiatan/pemupukan/${id}`, data);
  return res.data;
}

export async function deletePemupukan(id: number): Promise<void> {
  await api.delete(`/api/kegiatan/pemupukan/${id}`);
}

// ----------------------------------------------------
// PRODUKSI HARIAN INTERFACES & METHODS
// ----------------------------------------------------

export interface ProduksiItem {
  id_fakta: number;
  tanggal: string;
  id_afdeling?: number;
  kebun?: string;
  afdeling?: string;
  target_harian_ton: number;
  produksi_aktual_ton: number;
  jumlah_pemanen_hk: number;
  curah_hujan_mm: number;
  rendemen_persen: number;
}

export interface ProduksiListResponse {
  total: number;
  total_target: number;
  total_aktual: number;
  capaian_persen: number;
  total_pemanen: number;
  items: ProduksiItem[];
}

export async function fetchProduksiList(params?: {
  kebun?: string;
  afdeling?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_order?: 'desc' | 'asc';
  limit?: number;
  offset?: number;
}): Promise<ProduksiListResponse> {
  const res = await api.get('/api/kegiatan/produksi', { params });
  return res.data;
}

export async function createProduksi(data: Omit<ProduksiItem, 'id_fakta'>): Promise<ProduksiItem> {
  const res = await api.post('/api/kegiatan/produksi', data);
  return res.data;
}

export async function updateProduksi(id_fakta: number, data: Partial<ProduksiItem>): Promise<ProduksiItem> {
  const res = await api.put(`/api/kegiatan/produksi/${id_fakta}`, data);
  return res.data;
}

export async function deleteProduksi(id_fakta: number): Promise<void> {
  await api.delete(`/api/kegiatan/produksi/${id_fakta}`);
}

export async function fetchKebunOutlines(forceRefresh = false): Promise<FeatureCollection> {
  if (!forceRefresh && cachedKebunOutlines) {
    return cachedKebunOutlines;
  }
  const res = await api.get('/api/kebun/outlines/kebun');
  cachedKebunOutlines = res.data;
  return res.data;
}

export async function fetchAfdelingOutlines(forceRefresh = false): Promise<FeatureCollection> {
  if (!forceRefresh && cachedAfdOutlines) {
    return cachedAfdOutlines;
  }
  const res = await api.get('/api/kebun/outlines/afdeling');
  cachedAfdOutlines = res.data;
  return res.data;
}

export default api;

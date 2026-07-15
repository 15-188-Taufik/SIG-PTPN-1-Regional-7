import axios, { AxiosInstance } from 'axios';
import { getToken, clearToken } from './auth';
import { FeatureCollection, StatsResponse } from '@/types/kebun';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function login(username: string, password: string) {
  const res = await api.post('/api/auth/login', { username, password });
  return res.data as { access_token: string; username: string };
}

export async function fetchKebun(params?: {
  kebun?: string;
  komoditi?: string;
  status?: string;
}): Promise<FeatureCollection> {
  const res = await api.get('/api/kebun', { params });
  return res.data;
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await api.get('/api/kebun/stats');
  return res.data;
}

export async function fetchKebunList(): Promise<string[]> {
  const res = await api.get('/api/kebun/list');
  return res.data.kebun;
}

export async function uploadGeoJSON(file: File): Promise<{
  status: string;
  message: string;
  imported: number;
  updated: number;
}> {
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

export default api;

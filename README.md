# SIG PTPN 1— Sistem Informasi Geografis Kebun PTPN 1 Regional 7 Lampung

Repositori ini berisi seluruh kode sumber untuk aplikasi Sistem Informasi Geografis (SIG) Dashboard Pemantauan Lahan dan Produksi Kebun PTPN Regional 7 di Lampung (Way Lima, Bergen, Kedaton, TUBU, Wabe, dan Wali).

## 🏗️ Arsitektur Sistem

Aplikasi ini menggunakan arsitektur modern 3-tier:
1. **Database Layer**: PostgreSQL dengan ekstensi **PostGIS** untuk penyimpanan data spasial polygon kebun dan blok.
2. **Backend API Layer**: **FastAPI (Python)** sebagai API server dengan otentikasi JWT (Single Login), koneksi ORM via SQLAlchemy & GeoAlchemy2.
3. **Frontend Presentation Layer**: **Next.js (React/TypeScript)** dan **Leaflet.js** untuk merender peta interaktif dengan visual premium glassmorphism.

---

## 📁 Struktur Repositori

```
SIG PTPN/
├── datas/                       # File mentah spasial (.geojson & .shp)
├── backend/                     # Backend API (FastAPI)
│   ├── app/                     # Source code aplikasi
│   │   ├── core/                # JWT security & dependencies
│   │   ├── models/              # Model data spasial SQLAlchemy
│   │   ├── routers/             # Endpoint Auth & Kebun
│   │   └── schemas/             # Pydantic validation schemas
│   └── etl/                     # DDL Database & Script import GeoJSON
└── frontend/                    # Frontend (Next.js + Leaflet)
    ├── app/                     # Halaman dan routing App Router
    ├── components/              # Komponen Map, SidePanel, StatsBar, InfoDrawer
    ├── lib/                     # Client API (Axios) & Auth handler
    └── types/                   # TypeScript interfaces
```

---

## 🚀 Memulai Secara Lokal (Local Development)

### 1. Jalankan Backend (FastAPI)

1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat Virtual Environment Python:
   ```bash
   python -m venv .venv
   # Aktifkan venv di Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya (terutama `DATABASE_URL` Supabase Anda):
   ```bash
   copy .env.example .env
   ```
5. Jalankan server local:
   ```bash
   uvicorn app.main:app --reload
   ```
   API akan berjalan di `http://localhost:8000`. Dokumentasi Swagger UI interaktif dapat diakses di `http://localhost:8000/docs`.

---

### 2. Jalankan Frontend (Next.js)

1. Masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Salin file `.env.local.example` menjadi `.env.local` jika ingin mengganti URL API target. Defaultnya mengarah ke `http://localhost:8000`.
4. Jalankan dev server:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` pada browser Anda.

---

## 📥 Cara Impor Data Spasial Kebun (.geojson)

Seluruh data spasial kebun diimpor otomatis ke database Postgres/PostGIS menggunakan script ETL yang telah disediakan.

1. Hubungkan database PostgreSQL (Supabase/Lokal).
2. Jalankan schema database di database tool atau Supabase SQL Editor menggunakan script:
   `backend/etl/create_schema.sql`.
3. Jalankan script import dengan memastikan virtual env aktif:
   ```bash
   cd backend
   python etl/import_geojson.py
   ```

---

## 📦 Panduan Deployment ke Production

Untuk melakukan deployment online menggunakan layanan gratis (Supabase + Render.com + Vercel), silakan ikuti langkah demi langkah panduan lengkap yang berada pada file:
[Panduan Deployment](walkthrough.md) (atau buka path `C:\Users\taufi\.gemini\antigravity\brain\b5b7e058-59de-4b28-8944-ddb5fb1038e3\walkthrough.md`).

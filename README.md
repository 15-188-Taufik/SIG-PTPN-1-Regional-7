# Sistem Informasi Geografis (SIG) Kebun PTPN 1 Regional 7 Lampung
## *Dashboard Pemantauan Lahan, Produktivitas, dan Produksi Kebun Real-Time*

---

Sistem Informasi Geografis (SIG) Kebun PTPN 1 Regional 7 Lampung adalah platform pemetaan berbasis spasial yang dikembangkan untuk mengintegrasikan koordinat fisik kebun dengan pencatatan harian produksi, pemeliharaan, dan pemupukan. Aplikasi ini membantu menyederhanakan pelaporan dari lapangan (via Google Sheets Sync Webhook) dan menyajikan analisis data tematik secara real-time kepada pihak manajemen/eksekutif.

Aplikasi ini didesain secara modular dan skalabel. Saat ini, sistem telah diimplementasikan untuk **5 Unit Kebun percontohan**, namun arsitektur spasialnya dirancang agar dapat diekspansi secara dinamis hingga mencakup seluruh **32 Unit Kebun** di wilayah kerja PTPN 1 Regional 7 Lampung.

---

## 🚀 Fitur Utama Sistem

1.  **Peta Spasial Interaktif (Leaflet.js)**: Rendering batas blok kebun menggunakan polygon GeoJSON dengan tingkat presisi tinggi berbasis koordinat GPS.
2.  **4 Mode Visualisasi Tematik**:
    *   **Default Mode (Batas Kebun & Blok)**: Mewarnai blok tanaman secara otomatis menggunakan algoritma *DSATUR Degree-Descending Greedy Graph 4-Coloring* agar blok bersebelahan memiliki warna berbeda. Lahan dengan status sengketa atau **Okupasi** diwarnai **Merah Terang (`#EF4444`)** secara global.
    *   **Productivity Mode (Yield per Ha)**: Menampilkan tingkat produktivitas (Tonase Aktual / Luas GIS) dengan gradasi warna Merah (<15 Ton/Ha), Orange (15-49 Ton/Ha), Kuning (50-149 Ton/Ha), Hijau Muda (150-499 Ton/Ha), hingga Hijau Tua (>=500 Ton/Ha).
    *   **Age of Crop Mode (Umur Tanaman)**: Mendeteksi usia tanaman guna menentukan jadwal replanting: TBM (<= 7 tahun, Biru Muda), TM Prima (8-15 tahun, Hijau Tua), TM Tua (16-25 tahun, Orange), dan Tua/Rusak (>25 tahun, Merah).
    *   **SPH Density Mode (Kerapatan Pohon per Hektar)**: Memantau populasi pohon per Ha dengan skala: Kritis (<150, Merah), Kurang Padat (150-349, Orange), Optimal (350-499, Hijau), dan Sangat Rapat (>=500, Unggu).
3.  **Google Sheets Real-Time Webhook Sync**: Kerani kebun cukup mengisi laporan harian di Google Sheets afdeling masing-masing, dan data otomatis masuk ke database postgres melalui Google Apps Script `sigAutoSync` berbasis event *OnEdit*.
4.  **Alerts & Early Warning System**: Panel ringkasan otomatis untuk mengidentifikasi blok-blok dengan kondisi SPH kritis (<150 pohon/Ha) dan daftar kendala aktif di lapangan (PICA - *Problem Identification & Corrective Actions*).
5.  **Info Drawer & Data Sheet**: Panel laci interaktif yang menyajikan detail operasional lengkap (grafik produksi, status pemeliharaan, riwayat pemupukan) dari blok yang diklik di peta.

---

## 🛠️ Arsitektur & Alur Data

Aplikasi ini dibangun menggunakan arsitektur 3-tier modern:
1.  **Database Layer**: PostgreSQL dengan ekstensi **PostGIS** untuk penyimpanan data spasial polygon kebun dan blok secara efisien.
2.  **Backend API Layer**: **FastAPI (Python)** dengan SQLAlchemy ORM, GeoAlchemy2, dan autentikasi JWT (JSON Web Token).
3.  **Frontend Presentation Layer**: **Next.js (React/TypeScript)** dan **Leaflet.js** untuk merender peta interaktif dengan UI premium glassmorphism.

### Diagram Alur Data (Data Flow)

```mermaid
graph TD
    A[User 01: Google Sheets Kerani] -->|Input Data / Edit Baris| B(Google Apps Script)
    B -->|Webhook POST dengan X-API-Key| C[User 02: FastAPI Backend Server]
    D[User 02: Web UI Admin] -->|Unggah GeoJSON / CRUD UI| C
    C -->|Normalisasi & Validasi Geometri| E[(PostgreSQL + PostGIS DB)]
    E -->|Ambil Data Spasial & Transaksi| F[User 03: Web UI Dashboard SIG]
    C -->|Kirim ID Baru / Status Sukses| B
    B -->|Tulis Balik ID ke Kolom id_fakta| A
```

---

## 📁 Struktur Repositori

```text
SIG-PTPN-1-Regional-7/
├── datas/                       # File spasial awal (.geojson & .shp)
├── backend/                     # Source Code Backend (FastAPI)
│   ├── app/                     # Logika Utama Aplikasi
│   │   ├── core/                # Konfigurasi Keamanan (JWT) & Database
│   │   ├── models/              # Model Tabel SQLAlchemy & Geometri PostGIS
│   │   ├── routers/             # Endpoint API (Auth, Kebun, Sync Webhook)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   └── main.py              # Entry point aplikasi FastAPI
│   └── etl/                     # DDL Database & Script ETL
│       ├── create_schema.sql    # DDL untuk membuat tabel awal
│       ├── google_apps_script.js# Template kode Google Apps Script
│       └── import_geojson.py    # Script python import data spasial
├── frontend/                    # Source Code Frontend (Next.js)
│   ├── app/                     # Next.js App Router (Layouts & Pages)
│   ├── components/              # Komponen MapView, SidePanel, InfoDrawer, StatsBar
│   ├── lib/                     # Handler API client (Axios) & Auth
│   ├── types/                   # Deklarasi Type/Interface TypeScript
│   └── package.json             # Dependensi Node.js frontend
├── render.yaml                  # Konfigurasi Deployment ke Render.com
└── README.md                    # Dokumentasi utama proyek
```

---

## 💻 Memulai Secara Lokal (Local Development)

### Prasyarat (Prerequisites)
Sebelum menjalankan aplikasi, pastikan komputer Anda telah terinstal:
*   Python 3.10 atau versi terbaru
*   Node.js v18 atau versi terbaru
*   PostgreSQL dengan ekstensi PostGIS (atau Anda dapat menggunakan cloud database Supabase)

---

### Langkah 1: Pengaturan Basis Data (Database Setup)
1.  Buat database kosong bernama `sig_ptpn` di PostgreSQL lokal atau Supabase.
2.  Aktifkan ekstensi PostGIS pada database:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    ```
3.  Jalankan seluruh perintah SQL di file [create_schema.sql](file:///d:/kuliah%20praktik/PTPN/SIG%20PTPN/backend/etl/create_schema.sql) untuk membentuk tabel awal sistem.

---

### Langkah 2: Setup & Jalankan Backend (FastAPI)
1.  Masuk ke direktori backend:
    ```bash
    cd backend
    ```
2.  Buat virtual environment Python dan aktifkan:
    ```bash
    python -m venv .venv
    
    # Windows (PowerShell):
    .venv\Scripts\Activate.ps1
    
    # Linux / macOS:
    source .venv/bin/activate
    ```
3.  Instal seluruh pustaka dependensi:
    ```bash
    pip install -r requirements.txt
    ```
4.  Buat file `.env` dengan menyalin file `.env.example`:
    ```bash
    copy .env.example .env
    ```
5.  Sesuaikan variabel lingkungan dalam file `.env`:
    ```env
    DATABASE_URL=postgresql://postgres.user:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
    ADMIN_USERNAME=ptpnr7
    ADMIN_PASSWORD=lampung2026
    SYNC_API_KEY=lampung2026
    SECRET_KEY=kunci-rahasia-jwt-anda-di-sini
    ```
6.  Jalankan server backend FastAPI:
    ```bash
    uvicorn app.main:app --reload
    ```
    Backend akan aktif di `http://localhost:8000`. Dokumentasi interaktif API (Swagger UI) dapat diakses di `http://localhost:8000/docs`.

---

### Langkah 3: Setup & Jalankan Frontend (Next.js)
1.  Buka terminal baru, lalu masuk ke direktori frontend:
    ```bash
    cd frontend
    ```
2.  Instal dependensi Node.js:
    ```bash
    npm install
    ```
3.  Buat file `.env.local` di folder `frontend`:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000/api
    ```
    *(Ubah menjadi URL Render/Production Anda jika ingin menghubungkan frontend lokal dengan backend online).*
4.  Jalankan server development Next.js:
    ```bash
    npm run dev
    ```
5.  Buka browser Anda dan akses aplikasi di alamat `http://localhost:3000`.

---

## 📥 Prosedur Impor Data Spasial Kebun (.geojson)

Untuk memuat batas-batas wilayah spasial kebun (polygon blok), Staff TI (User 02) dapat mengimpor file GeoJSON secara otomatis ke database:
1.  Pastikan virtual environment backend aktif dan file `.env` telah terkonfigurasi dengan benar.
2.  Letakkan file spasial Anda di folder `datas` (misal: `datas/kedaton.geojson`).
3.  Pastikan properti di dalam file GeoJSON memiliki field minimum: `kebun`, `afdeling`, `kode_blok`, `no_polygon`, `komoditi`, `status`, `thn_tanam`, dan `populasi`.
4.  Jalankan script Python impor:
    ```bash
    cd backend
    python etl/import_geojson.py
    ```
    Script secara otomatis mem-parsing koordinat spasial polygon, mencocokkan ke unit kebun/afdeling, dan melakukan *UPSERT* data ke tabel `blok_kebun`.

---

## 📊 Integrasi Google Sheets Real-Time Sync (Webhook)

Sistem pencatatan harian menggunakan Google Sheets agar memudahkan Kerani Kebun (User 01) menginput data di lapangan tanpa perlu membuka aplikasi web.

### 1. Struktur Tab Lembar Kerja
Buat file Google Sheets baru dengan **3 tab utama** dan kolom sebagai berikut:
*   **Tab `produksi_harian`**:
    `id_fakta` (Kolom A) | `tanggal` | `kebun` | `afdeling` | `target_harian_ton` | `produksi_aktual_ton` | `jumlah_pemanen_hk` | `curah_hujan_mm` | `rendemen_persen`
*   **Tab `pemeliharaan_harian`**:
    `id_fakta` (Kolom A) | `tanggal` | `kebun` | `afdeling` | `no_polygon` | `kode_blok` | `jenis_kegiatan` | `material` | `dosis_aplikasi` | `luas_aplikasi` | `tenaga_kerja` | `keterangan`
*   **Tab `pemupukan_harian`**:
    `id_fakta` (Kolom A) | `tanggal` | `kebun` | `afdeling` | `no_polygon` | `kode_blok` | `jenis_pupuk` | `jumlah_pupuk` | `luas_aplikasi` | `tenaga_kerja` | `keterangan`

### 2. Aturan Pengisian
*   Kolom `id_fakta` (Kolom A) **wajib dikosongkan** saat menulis baris data baru.
*   Setelah baris data diisi dan dipindahkan kursornya, Google Apps Script akan mengirimkannya ke server backend SIG.
*   Jika sinkronisasi sukses, server akan mengembalikan ID fakta dari database, dan Apps Script akan menuliskan ID tersebut ke Kolom A secara otomatis.
*   Untuk merevisi data lama, cukup ubah nilai pada baris bersangkutan. Keberadaan `id_fakta` di Kolom A akan membuat backend melakukan *update* data, bukan membuat data baru.

### 3. Pemasangan Google Apps Script & Trigger
1.  Buka Google Sheets Anda $\rightarrow$ Pilih **Extensions** $\rightarrow$ **Apps Script**.
2.  Salin dan tempel kode dari [google_apps_script.js](file:///d:/kuliah%20praktik/PTPN/SIG%20PTPN/backend/etl/google_apps_script.js) ke dalam editor Apps Script. Sesuaikan `API_BASE_URL` dengan alamat server online Anda.
3.  Simpan proyek script tersebut.
4.  Buka menu **Triggers** (ikon jam di sebelah kiri), lalu tambahkan trigger baru:
    *   *Function to run*: `sigAutoSync`
    *   *Deployment*: `Head`
    *   *Event source*: `From spreadsheet`
    *   *Event type*: `On edit`
5.  Simpan dan berikan izin otorisasi akun Google Anda.

---

## 📦 Panduan Deployment ke Production

### 1. Database (Supabase PostgreSQL)
*   Buat project baru di Supabase.
*   Masuk ke SQL Editor dan jalankan DDL dari `backend/etl/create_schema.sql`.
*   Catat Connection String PostgreSQL bertipe *Transaction Pooler* (port 6543) untuk digunakan sebagai `DATABASE_URL` di server backend.

### 2. Backend (FastAPI di Render.com)
*   Buat Web Service baru di Render.com dan hubungkan dengan repository GitHub Anda.
*   Gunakan konfigurasi build berikut (atau biarkan otomatis membaca `render.yaml`):
    *   *Runtime*: `Python`
    *   *Build Command*: `pip install -r requirements.txt`
    *   *Start Command*: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
*   Tambahkan Environment Variables berikut di dashboard Render:
    *   `DATABASE_URL` = *(Connection String Supabase)*
    *   `ADMIN_USERNAME` = `ptpnr7`
    *   `ADMIN_PASSWORD` = `lampung2026`
    *   `SYNC_API_KEY` = `lampung2026`
    *   `SECRET_KEY` = *(String rahasia random)*

### 3. Frontend (Next.js di Vercel)
*   Impor project Next.js Anda ke Vercel.
*   Tambahkan Environment Variable:
    *   `NEXT_PUBLIC_API_URL` = `https://nama-web-service-backend-anda.onrender.com/api`
*   Klik **Deploy**. Vercel akan menghasilkan alamat web HTTPS gratis (contoh: `https://sig-ptpn-1-regional-7.vercel.app/`).

---

## 🔒 Autentikasi & Keamanan Default

Sistem ini dilindungi autentikasi JWT pada setiap pemanggilan endpoint data transaksional dan spasial:
*   **Username Default**: `ptpnr7`
*   **Password Default**: `lampung2026`

> [!WARNING]
> Demi keamanan basis data perusahaan, perubahan kredensial login default harus dikoordinasikan secara langsung melalui pengembang utama di nomor **089517954410** (Taufik Hidayat NST).

---

## 👥 Tim Pengembang (Authors)

*   **Taufik Hidayat NST** (NIM: 123140188)
*   **Bonifasius Ezra Mariano** (NIM: 123140196)

*Program Studi Teknik Informatika, Fakultas Teknologi Industri, Institut Teknologi Sumatera (2026).*

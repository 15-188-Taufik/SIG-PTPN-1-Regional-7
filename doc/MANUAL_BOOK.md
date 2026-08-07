# BUKU PANDUAN PENGGUNAAN (MANUAL BOOK)
# SISTEM INFORMASI GEOGRAFIS (SIG) KEBUN PTPN 1 REGIONAL 7 LAMPUNG
## *Dashboard Pemantauan Lahan dan Produksi Kebun*

---

Dokumen ini dirancang sebagai panduan operasional bagi seluruh staf, asisten kebun, asisten afdeling, administrator, dan pihak manajemen PTPN 1 Regional 7 Lampung dalam mengoperasikan aplikasi Sistem Informasi Geografis (SIG).

*   **URL Sistem Produksi (Online)**: `https://sig-ptpn-1-regional-7.vercel.app/`
*   **URL Sistem Lokal (Development)**: `http://localhost:3000`

---

## DAFTAR ISI

1. [PENDAHULUAN](#1-pendahuluan)
   - 1.1 [Deskripsi & Tujuan Sistem](#11-deskripsi--tujuan-sistem)
   - 1.2 [Wilayah Cakupan Kerja & Ekspansi](#12-wilayah-cakupan-kerja--ekspansi)
   - 1.3 [Kredensial Default & Keamanan](#13-kredensial-default--keamanan)
2. [PENGELOMPOKAN PERAN PENGGUNA (USER ROLES)](#2-pengelompokan-peran-pengguna-user-roles)
   - 2.1 [User 01: Kerani Kebun](#21-user-01-kerani-kebun)
   - 2.2 [User 02: Staff TI (Administrator & Developer)](#22-user-02-staff-ti-administrator--developer)
   - 2.3 [User 03: Pimpinan & Eksekutif](#23-user-03-pimpinan--eksekutif)
3. [ARSITEKTUR & ALUR DATA SISTEM](#3-arsitektur--alur-data-sistem)
   - 3.1 [Teknologi Utama (Stack)](#31-teknologi-utama-stack)
   - 3.2 [Alur Sinkronisasi Data (Diagram)](#32-alur-sinkronisasi-data-diagram)
4. [PANDUAN OPERASIONAL PER PERAN PENGGUNA](#4-panduan-operasional-per-peran-pengguna)
   - 4.1 [Panduan User 01: Kerani Kebun (Pencatatan Harian & Sheets Sync)](#41-panduan-user-01-kerani-kebun-pencatatan-harian--sheets-sync)
   - 4.2 [Panduan User 02: Staff TI (Setup Lokal & Pemeliharaan Sistem)](#42-panduan-user-02-staff-ti-setup-lokal--pemeliharaan-sistem)
     - 4.2.1 [Langkah-langkah Clone Repository & Setup Backend](#421-langkah-langkah-clone-repository--setup-backend)
     - 4.2.2 [Langkah-langkah Menjalankan Frontend Next.js](#422-langkah-langkah-menjalankan-frontend-nextjs)
     - 4.2.3 [Prosedur Pembaruan Peta Spasial (Upload GeoJSON)](#423-prosedur-pembaruan-peta-spasial-upload-geojson)
     - 4.2.4 [Mengubah Kredensial Login Default](#424-mengubah-kredensial-login-default)
   - 4.3 [Panduan User 03: Pimpinan & Eksekutif (Monitoring & Analisis Tematik)](#43-panduan-user-03-pimpinan--eksekutif-monitoring--analisis-tematik)
     - 4.3.1 [Menavigasi 4 Mode Tampilan Peta](#431-menavigasi-4-mode-tampilan-peta)
     - 4.3.2 [Membaca Peringatan Dini (Alerts Panel)](#432-membaca-peringatan-dini-alerts-panel)
5. [INTEGRASI GOOGLE SHEETS & GOOGLE APPS SCRIPT](#5-integrasi-google-sheets--google-apps-script)
   - 5.1 [Persiapan Template Kolom Lembar Kerja](#51-persiapan-template-kolom-lembar-kerja)
   - 5.2 [Kode Google Apps Script (sigAutoSync)](#52-kode-google-apps-script-sigautosync)
   - 5.3 [Pemasangan Installable Trigger *onEdit*](#53-pemasangan-installable-trigger-onedit)
6. [PANDUAN ADMINISTRATOR (DATABASE SCHEMA)](#6-panduan-administrator-database-schema)
   - 6.1 [Struktur Tabel Database (PostgreSQL + PostGIS)](#61-struktur-tabel-database-postgresql--postgis)
   - 6.2 [Kontak Dukungan Pengembang](#62-kontak-dukungan-pengembang)

---

## 1. PENDAHULUAN

### 1.1 Deskripsi & Tujuan Sistem
Sistem Informasi Geografis (SIG) Kebun PTPN 1 Regional 7 Lampung merupakan aplikasi pemetaan berbasis spasial yang mengintegrasikan koordinat fisik kebun dengan pencatatan harian produksi, pemeliharaan, dan pemupukan. Sistem ini membantu menyederhanakan pelaporan lapangan dan visualisasi performa blok tanaman karet, kelapa sawit, atau tebu secara real-time.

### 1.2 Wilayah Cakupan Kerja & Ekspansi
Saat ini sistem telah terisi data spasial dan transaksional untuk 5 Unit Kebun utama:
1.  **Unit Way Lima** (Di dalam sistem teridentifikasi dengan alias/nama singkat **Wali**).
2.  **Unit Bergen**
3.  **Unit Kedaton**
4.  **Unit Tulungbuyut** (Teridentifikasi dengan nama singkat **TUBU**).
5.  **Unit Way Berulu** (Teridentifikasi dengan nama singkat **Wabe** atau **Way Belulu**).

**Skalabilitas 32 Kebun**: Walaupun saat ini cakupan data terbatas pada 5 kebun tersebut, arsitektur SIG ini mendukung ekspansi dinamis hingga mencakup seluruh +-32 kebun di bawah wilayah kerja PTPN 1 Regional 7 tanpa perlu memodifikasi kode program backend atau frontend.

### 1.3 Kredensial Default & Keamanan
Aplikasi web SIG (baik online maupun local) dilindungi sistem autentikasi terpusat berbasis JSON Web Token (JWT).
*   **Username Default**: `ptpnr7`
*   **Password Default**: `lampung2026`

**Pemberitahuan Keamanan**: Demi menjaga privasi dan keamanan data perusahaan, perubahan kredensial masuk seperti username dan password harus dikoordinasikan secara langsung melalui pengembang utama sistem di nomor `089517954410` atas nama Taufik Hidayat NST.

---

## 2. PENGELOMPOKAN PERAN PENGGUNA (USER ROLES)

Untuk memastikan pengoperasian sistem berjalan efektif, penggunaan SIG dibagi menjadi tiga peran (User Roles):

### 2.1 User 01: Kerani Kebun
*   **Profil**: Staf administrasi divisi/afdeling kebun di lapangan.
*   **Tanggung Jawab**: Menginput data harian produksi afdeling, kegiatan pemeliharaan blok, dan aplikasi pemupukan.
*   **Media Kerja**: Google Sheets (Spreadsheet) harian yang tersinkronisasi otomatis dengan server SIG.

### 2.2 User 02: Staff TI (Administrator & Developer)
*   **Profil**: Personel Departemen TI di Kantor Direksi/Regional.
*   **Tanggung Jawab**: Memelihara server API backend, melakukan deployment/pembaruan kode frontend, memperbarui data batas wilayah kebun (GeoJSON), mengelola database relasional, dan melakukan pengembangan aplikasi lokal.
*   **Media Kerja**: Repository GitHub, Web Dashboard Admin, Terminal CLI, dan database viewer.

### 2.3 User 03: Pimpinan & Eksekutif
*   **Profil**: Manajer Unit, Kepala Bagian Tanaman, atau Direksi Regional.
*   **Tanggung Jawab**: Memantau grafik produksi harian, menganalisis produktivitas lahan, memantau kondisi tanaman tua (replanting), serta mengevaluasi peringatan dini (Alerts) untuk pengambilan keputusan strategis.
*   **Media Kerja**: Dashboard Web SIG Online (`https://sig-ptpn-1-regional-7.vercel.app/`).

---

## 3. ARSITEKTUR & ALUR DATA SISTEM

### 3.1 Teknologi Utama (Stack)
*   **Frontend**: Next.js (React / TypeScript), Tailwind CSS, Leaflet.js (Map Library).
*   **Backend**: FastAPI (Python), SQLAlchemy ORM, GeoAlchemy2 (Geospatial Extension).
*   **Database**: PostgreSQL dengan ekstensi **PostGIS** untuk penyimpanan data spasial polygon.

### 3.2 Alur Sinkronisasi Data (Diagram)

```mermaid
graph TD
    A[User 01: Google Sheets Kerani] -->|Input Data / Edit Baris| B(Google Apps Script)
    B -->|Webhook Post dengan X-API-Key| C[User 02: FastAPI Backend Server]
    D[User 02: Web UI Admin] -->|Unggah GeoJSON / CRUD UI| C
    C -->|Normalisasi & Validasi Geometri| E[(PostgreSQL + PostGIS DB)]
    E -->|Ambil Data Spasial & Transaksi| F[User 03: Web UI Dashboard SIG]
    C -->|Kirim ID Baru / Status Sukses| B
    B -->|Tulis Balik ID ke Kolom id_fakta| A
```

---

## 4. PANDUAN OPERASIONAL PER PERAN PENGGUNA

### 4.1 Panduan User 01: Kerani Kebun (Pencatatan Harian & Sheets Sync)

Kerani kebun tidak perlu membuka situs web SIG untuk mengunggah laporan harian. Cukup lakukan pencatatan harian melalui file Google Sheets afdeling masing-masing:

1.  **Pengisian Baris Baru**:
    *   Setiap kali ada transaksi harian baru (Produksi, Pemeliharaan, atau Pemupukan), buka tab sheet yang sesuai.
    *   Tulis tanggal kegiatan, nama kebun, nama afdeling, dan data numerik yang diperlukan.
    *   **PENTING**: Biarkan kolom **`id_fakta`** (Kolom A) kosong saat mengisi baris baru.
2.  **Proses Sinkronisasi Otomatis**:
    *   Setelah selesai mengetik satu baris data dan memindahkan kursor (menekan Enter atau mengklik sel lain), Google Sheets akan memicu Apps Script di latar belakang.
    *   Apps Script mengirimkan baris tersebut ke server SIG online.
    *   Setelah sukses tersimpan di database server, sistem akan menuliskan ID data dari database secara otomatis ke dalam kolom **`id_fakta`** di baris bersangkutan.
    *   Di pojok kanan bawah Google Sheets akan muncul notifikasi kecil berbunyi: `"Berhasil sinkronisasi X data baris ke database."`
3.  **Pengeditan Data Lama**:
    *   Jika terdapat kesalahan input data pada baris yang **sudah memiliki** angka `id_fakta`, Anda cukup mengedit nilai kolom yang salah pada baris tersebut.
    *   Sistem backend secara otomatis mendeteksi keberadaan `id_fakta` dan melakukan *update* (pembaruan) data di database tanpa membuat baris ganda.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot file Google Sheets dengan id_fakta terisi otomatis di sini (sheets_interface.png)] -->

---

### 4.2 Panduan User 02: Staff TI (Setup Lokal & Pemeliharaan Sistem)

Bagian ini memuat panduan lengkap untuk Staff TI yang akan melakukan cloning kode sumber dan menjalankan lingkungan pengembangan local (Local Development) di komputer lokal.

#### 4.2.1 Langkah-langkah Clone Repository & Setup Backend
Jalankan perintah berikut pada terminal Git Bash atau PowerShell komputer Staff TI:

1.  **Clone Repository dari GitHub**:
    ```bash
    git clone https://github.com/15-188-Taufik/SIG-PTPN-1-Regional-7.git
    cd SIG-PTPN-1-Regional-7
    ```
2.  **Setup Environment Backend (FastAPI)**:
    ```bash
    cd backend
    # Membuat Virtual Environment Python
    python -m venv .venv
    
    # Aktifkan virtual env di Windows:
    .venv\Scripts\Activate.ps1
    
    # Instal dependensi Python
    pip install -r requirements.txt
    ```
3.  **Konfigurasi File Environment (`.env`)**:
    Salin berkas `.env.example` menjadi `.env` di folder `backend`:
    ```bash
    copy .env.example .env
    ```
    Buka file `.env` menggunakan teks editor dan sesuaikan parameternya:
    ```env
    DATABASE_URL=postgresql://postgres.user:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
    ADMIN_USERNAME=ptpnr7
    ADMIN_PASSWORD=lampung2026
    SYNC_API_KEY=lampung2026
    SECRET_KEY=kunci-rahasia-enkripsi-jwt-anda
    ```
    Koneksi `DATABASE_URL` di atas merupakan contoh konfigurasi menggunakan layanan basis data Supabase PostgreSQL dengan ekstensi PostGIS. Gantilah dengan rincian basis data lokal atau produksi yang sedang aktif.
4.  **Menjalankan Server Backend FastAPI**:
    ```bash
    uvicorn app.main:app --reload
    ```
    Server backend lokal akan aktif di `http://localhost:8000`. Staff TI dapat membuka dokumentasi API interaktif (Swagger UI) di `http://localhost:8000/docs`.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot FastAPI Swagger UI (/docs) di sini (fastapi_swagger.png)] -->

#### 4.2.2 Langkah-langkah Menjalankan Frontend Next.js
1.  Buka terminal baru dan masuk ke folder `frontend` di dalam repository:
    ```bash
    cd SIG-PTPN-1-Regional-7/frontend
    ```
2.  **Instal Dependensi Node.js**:
    ```bash
    npm install
    ```
3.  **Konfigurasi File Environment Lokal (`.env.local`)**:
    Buat file baru bernama `.env.local` di folder `frontend`:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000/api
    ```
    Apabila frontend lokal ingin dihubungkan langsung dengan server API production yang berada secara online, ubah isinya menjadi:
    `NEXT_PUBLIC_API_URL=https://sig-ptpn-1-regional-7.onrender.com/api`
4.  **Jalankan Next.js Development Server**:
    ```bash
    npm run dev
    ```
    Buka browser Anda dan akses halaman `http://localhost:3000`.

#### 4.2.3 Prosedur Pembaruan Peta Spasial (Upload GeoJSON)
Ketika ada penambahan area lahan baru (ekspansi ke-32 kebun), Staff TI bertanggung jawab mengunggah file polygon spasial:
1.  Siapkan berkas batas spasial berformat GeoJSON (`.geojson`) dengan proyeksi koordinat WGS 84 (SRID 4326).
2.  Pastikan nama properti / atribut di dalam file GeoJSON memiliki field minimum seperti: `kebun`, `afdeling`, `kode_blok`, `no_polygon`, `komoditi`, `status`, `thn_tanam`, `populasi`.
3.  Buka antarmuka SIG utama, masuk ke menu **Upload** di panel kiri, pilih berkas `.geojson`, lalu klik tombol **Unggah GeoJSON**.
4.  Sistem backend FastAPI akan melakukan parsing geometries dan memperbarui isi tabel `blok_kebun` secara instan menggunakan mekanisme SQL UPSERT.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot modul upload GeoJSON di sini (upload_geojson_ui.png)] -->

#### 4.2.4 Mengubah Kredensial Login Default
Jika manajemen meminta perubahan username/password demi keamanan:
1.  Buka file konfigurasi `.env` pada server backend (atau konfigurasi Environment Variables di platform hosting backend seperti Render.com).
2.  Ubah nilai `ADMIN_USERNAME` dan `ADMIN_PASSWORD`.
3.  Restart aplikasi backend FastAPI. Pengguna akan secara otomatis menggunakan kredensial baru pada upaya login berikutnya.

---

### 4.3 Panduan User 03: Pimpinan & Eksekutif (Monitoring & Analisis Tematik)

Pimpinan dan pihak eksekutif dapat mengakses web SIG secara langsung secara online melalui link [https://sig-ptpn-1-regional-7.vercel.app/](https://sig-ptpn-1-regional-7.vercel.app/).

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot halaman Login Web SIG di sini (login_interface.png)] -->

#### 4.3.1 Menavigasi 4 Mode Tampilan Peta
Untuk melakukan analisis kinerja lahan, eksekutif dapat mengubah legenda dan pewarnaan peta di panel kanan (Looker Studio style filters):

1.  **Analisis Kepemilikan & Batas (Mode Default)**:
    *   Melihat batas kepemilikan blok berdasarkan unit kebun.
    *   **Perhatian Khusus**: Jika ada area yang diwarnai **Merah Terang (`#EF4444`)**, area tersebut merupakan lahan berstatus **"Okupasi"** (lahan sengketa / diserobot masyarakat). Eksekutif dapat berkoordinasi dengan bagian hukum/pertanahan.
2.  **Analisis Produktivitas (Mode Produktivitas)**:
    *   Melihat tonase hasil panen per Hektar.
    *   Warna **Merah** (<15 Ton/Ha) & **Orange** (15-49 Ton/Ha) mendeteksi blok-blok berkinerja buruk yang membutuhkan intervensi pemeliharaan atau pemupukan tambahan.
3.  **Analisis Peremajaan Tanaman (Mode Umur Tanam)**:
    *   Warna **Merah** (>25 Tahun) menandakan tanaman sudah berumur tua, tidak produktif, dan memerlukan jadwal **Replanting** secepatnya.
    *   Warna **Biru Muda** menggambarkan Tanaman Belum Menghasilkan (TBM / Muda) yang membutuhkan pemantauan intensif masa pertumbuhan.
4.  **Analisis Kerapatan Pohon (Mode Kerapatan SPH)**:
    *   Melihat parameter Stand Per Hektar (SPH).
    *   Warna **Merah** (< 150 pohon/Ha) menandakan blok memiliki tingkat kejarangan pohon yang kritis. Direkomendasikan melakukan penyulaman bibit baru.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot peta interaktif dengan visualisasi DSATUR / warna produktivitas di sini (map_thematic_visuals.png)] -->

#### 4.3.2 Membaca Peringatan Dini (Alerts Panel)
Tanpa perlu mencari blok satu per satu di peta, Pimpinan dapat mengklik tab **Alerts** pada panel kiri dashboard:
*   Melihat rangkuman otomatis seluruh blok kebun yang memiliki kerapatan **SPH Kritis (< 150 pohon/Ha)**.
*   Melihat daftar blok yang memiliki masalah lapangan aktif pada catatan **PICA** (Problem Identification & Corrective Actions), seperti serangan hama ulat api atau kendala cuaca ekstrem.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot panel Alerts/peringatan dini di sini (early_warning_panel.png)] -->
<!-- [TANGKAPAN LAYAR: Tempatkan screenshot Drawer Detail Informasi Blok saat polygon diklik di sini (info_drawer_details.png)] -->

---

## 5. INTEGRASI GOOGLE SHEETS & GOOGLE APPS SCRIPT

### 5.1 Persiapan Template Kolom Lembar Kerja
Buat file Google Sheets baru, lalu buat **3 tab** dengan nama persis berikut:

#### Tab 1: `produksi_harian`
Kolom A sampai I secara berurutan:
`id_fakta` | `tanggal` | `kebun` | `afdeling` | `target_harian_ton` | `produksi_aktual_ton` | `jumlah_pemanen_hk` | `curah_hujan_mm` | `rendemen_persen`

#### Tab 2: `pemeliharaan_harian`
Kolom A sampai L secara berurutan:
`id_fakta` | `tanggal` | `kebun` | `afdeling` | `no_polygon` | `kode_blok` | `jenis_kegiatan` | `material` | `dosis_aplikasi` | `luas_aplikasi` | `tenaga_kerja` | `keterangan`

#### Tab 3: `pemupukan_harian`
Kolom A sampai K secara berurutan:
`id_fakta` | `tanggal` | `kebun` | `afdeling` | `no_polygon` | `kode_blok` | `jenis_pupuk` | `jumlah_pupuk` | `luas_aplikasi` | `tenaga_kerja` | `keterangan`

**Aturan Penulisan Kolom A (`id_fakta`)**: Kolom `id_fakta` wajib diletakkan di **Kolom A (paling kiri)** pada setiap tab. Kolom ini berfungsi sebagai ID unik dari database. Kolom ini tidak boleh diisi secara manual untuk baris baru. Sistem backend akan menuliskan ID database secara otomatis ke kolom ini setelah sinkronisasi berhasil.

---

### 5.2 Kode Google Apps Script (`sigAutoSync`)
Pasang skrip berikut pada editor Apps Script di Google Sheets Anda:

```javascript
/**
 * Google Apps Script - SIG PTPN Real-Time Auto-Sync (v3.1)
 * Developer: Taufik Hidayat NST (089517954410)
 */

var API_BASE_URL = "https://sig-ptpn-1-regional-7.onrender.com/api/sync"; // Ganti dengan URL lokal/online aktif
var API_KEY = "lampung2026"; 

function sigAutoSync(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  
  var validSheets = ["produksi_harian", "pemeliharaan_harian", "pemupukan_harian"];
  if (validSheets.indexOf(sheetName) === -1) return;
  
  var startRow = range.getRow();
  var numRows = range.getNumRows();
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id_fakta");
  
  if (idColIdx === -1) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("id_fakta");
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    idColIdx = 0;
  }
  
  var rowsToSync = [];
  var rowIndices = [];
  
  var dataRange = sheet.getRange(startRow, 1, numRows, headers.length);
  var allValues = dataRange.getValues();
  
  for (var i = 0; i < numRows; i++) {
    var currentRowNum = startRow + i;
    if (currentRowNum === 1) continue; 
    
    var rowValues = allValues[i];
    var idFakta = rowValues[idColIdx];
    
    var rowData = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toString().trim();
      if (headerName === "") continue;
      
      var cellVal = rowValues[j];
      
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      
      if (cellVal === "") {
        cellVal = null;
      }
      rowData[headerName] = cellVal;
    }
    
    var isInsert = (idFakta === "" || idFakta === null || idFakta === undefined);
    var isValid = true;
    
    if (isInsert) {
      if (!rowData["tanggal"]) {
        isValid = false;
      } else if (sheetName === "produksi_harian") {
        var hasAfd = rowData["id_afdeling"] || (rowData["kebun"] && rowData["afdeling"]);
        if (!hasAfd) isValid = false;
      } else if (sheetName === "pemeliharaan_harian") {
        if (!rowData["jenis_kegiatan"]) isValid = false;
        var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
        if (!hasBlok) isValid = false;
      } else if (sheetName === "pemupukan_harian") {
        if (!rowData["jenis_pupuk"] || rowData["jumlah_pupuk"] === null || rowData["jumlah_pupuk"] === undefined) isValid = false;
        var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
        if (!hasBlok) isValid = false;
      }
    }
    
    if (isValid) {
      rowsToSync.push(rowData);
      rowIndices.push({
        rowNum: currentRowNum,
        isInsert: isInsert
      });
    }
  }
  
  if (rowsToSync.length === 0) return;
  syncBatchToSIG(sheet, sheetName, idColIdx, rowsToSync, rowIndices);
}

function syncBatchToSIG(sheet, sheetType, idColIdx, rowsToSync, rowIndices) {
  var payload = {
    "sheet_type": sheetType,
    "rows": rowsToSync
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "X-API-Key": API_KEY
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(API_BASE_URL + "/webhook", options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var result = JSON.parse(responseText);
    
    if (responseCode === 200) {
      var successCount = result.inserted_updated || 0;
      var newIdsCount = 0;
      
      if (result.results && result.results.length === rowsToSync.length) {
        for (var k = 0; k < result.results.length; k++) {
          var res = result.results[k];
          var info = rowIndices[k];
          if (res.status === "success" && info.isInsert) {
            sheet.getRange(info.rowNum, idColIdx + 1).setValue(res.id_fakta || res.id);
            newIdsCount++;
          }
        }
      } else if (result.row_ids && result.row_ids.length === rowsToSync.length) {
        for (var k = 0; k < result.row_ids.length; k++) {
          var info = rowIndices[k];
          if (info.isInsert) {
            sheet.getRange(info.rowNum, idColIdx + 1).setValue(result.row_ids[k]);
            newIdsCount++;
          }
        }
      }
      
      var msg = "Berhasil sinkronisasi " + successCount + " data baris ke database.";
      if (newIdsCount > 0) {
        msg += " " + newIdsCount + " ID fakta baru ditulis ke Google Sheets.";
      }
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Sinkronisasi Berhasil", 4);
    } else {
      var errorDetail = result.detail || responseText;
      SpreadsheetApp.getActiveSpreadsheet().toast("Gagal: " + errorDetail, "Gagal Sinkronisasi", 5);
    }
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Koneksi gagal: " + error.toString(), "Error Koneksi", 5);
  }
}
```

### 5.3 Pemasangan Installable Trigger *onEdit*
1.  Di Google Sheets Anda, buka menu: **Extensions** -> **Apps Script**.
2.  Hapus seluruh kode lama di dalam jendela editor, tempelkan skrip di atas, lalu tekan **Save**.
3.  Di bilah navigasi kiri, pilih ikon jam weker (**Triggers**).
4.  Klik **+ Add Trigger** di pojok kanan bawah dengan opsi:
    *   *Choose which function to run*: `sigAutoSync`
    *   *Choose which deployment should run*: `Head`
    *   *Select event source*: `From spreadsheet`
    *   *Select event type*: `On edit`
5.  Klik **Save** dan setujui verifikasi perizinan akun keamanan Google.

<!-- [TANGKAPAN LAYAR: Tempatkan screenshot jendela pemicu/Triggers di Google Apps Script di sini (apps_script_trigger_setup.png)] -->

---

## 6. PANDUAN ADMINISTRATOR (DATABASE SCHEMA)

### 6.1 Struktur Tabel Database (PostgreSQL + PostGIS)
Berikut adalah relasi entitas spasial dan transaksi di PostgreSQL:

```
                  +--------------------------------+
                  |           dim_unit             |
                  +--------------------------------+
                  | id_unit (PK) | nama_unit       |
                  +--------------------------------+
                                  |
                                  | 1:N
                                  v
                  +--------------------------------+
                  |         dim_afdeling           |
                  +--------------------------------+
                  | id_afdeling (PK) | id_unit (FK)|
                  +--------------------------------+
                      |                      |
                      | 1:N                  | 1:N
                      v                      v
+-----------------------------+      +-------------------------------+
|     fact_produksi_harian    |      |          blok_kebun           |
+-----------------------------+      +-------------------------------+
| id_fakta (PK)               |      | id (PK)                       |
| id_afdeling (FK)            |      | kebun | afdeling              |
| target_harian_ton           |      | kode_blok | no_polygon        |
| produksi_aktual_ton         |      | komoditi | status             |
| jumlah_pemanen_hk           |      | geom (MULTIPOLYGON, 4326)     |
+-----------------------------+      +-------------------------------+
                                             |              |
                                             | 1:N          | 1:N
                                             v              v
                        +----------------------------+  +----------------------------+
                        |  fact_pemeliharaan_harian  |  |   fact_pemupukan_harian    |
                        +----------------------------+  +----------------------------+
                        | id (PK)                    |  | id (PK)                    |
                        | blok_id (FK)               |  | blok_id (FK)               |
                        | tanggal | jenis_kegiatan   |  | tanggal | jenis_pupuk      |
                        | material | dosis_aplikasi  |  | jumlah_pupuk | tenaga_kerja|
                        +----------------------------+  +----------------------------+
```

### 6.2 Kontak Dukungan Pengembang
Bila terjadi kegagalan sistem, masalah jaringan, atau kebutuhan modifikasi database:
*   **Pengembang Utama**: Taufik Hidayat NST
*   **No. HP/WhatsApp**: `089517954410`
*   **Afiliasi**: Kantor Regional PTPN 1 Regional 7 Lampung.

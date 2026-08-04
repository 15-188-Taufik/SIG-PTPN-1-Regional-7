# PTPN SIG Design System (Sistem Desain SIG Kebun PTPN 1 Regional 7 Lampung)

Sistem Desain SIG PTPN adalah panduan komprehensif standar antarmuka pengguna (UI) dan pengalaman pengguna (UX) untuk aplikasi **Sistem Informasi Geografis (SIG) Kebun PTPN 1 Regional 7 Lampung**. 

Sistem desain ini mengadopsi prinsip dasar dari **IBM Carbon Design System (g10 Light Theme)** dengan adaptasi warna korporasi PTPN dan palet warna spasial yang ramah buta warna (*color-blind friendly*).

---

## 1. Brand Identity

Identitas visual SIG PTPN dirancang untuk mencerminkan keandalan, akurasi data geografis, dan keberlanjutan sektor perkebunan kelapa sawit dan karet.

### Logo & Lambang Aplikasi
Logo resmi SIG PTPN menggunakan aset logo korporasi **PTPN (Holding Perkebunan)** dengan format gambar PNG latar belakang transparan. Penggunaan logo resmi ini bertujuan untuk mematuhi pedoman identitas visual (*brand guidelines*) Holding Perkebunan Nusantara dan menunjukkan integrasi resmi sistem dengan infrastruktur IT PTPN.

**Spesifikasi Penerapan Aset Logo:**
- **Path File Aset**: `/public/logo-ptpn.png` (diakses di frontend menggunakan path `/logo-ptpn.png`).
- **Penerapan pada Halaman Login**:
  - Dimensi Logo: Lebar `48px`, Tinggi `48px`.
  - Properti Gambar: `objectFit: 'contain'`.
  - Container Wrapper: Berukuran `56px x 56px`, berlatar belakang transparan (`background: 'transparent'`) dan tanpa border untuk menjaga bentuk asli logo.
- **Penerapan pada Header Navigasi (HeaderNav)**:
  - Dimensi Logo: Lebar `24px`, Tinggi `24px`.
  - Properti Gambar: `objectFit: 'contain'`.
  - Container Wrapper: Mengapung di dalam flex group navigasi dengan latar belakang transparan (`background: 'transparent'`) dan sudut dinonaktifkan.

```tsx
// Penerapan di React/Next.js Component
<img 
  src="/logo-ptpn.png" 
  alt="Logo PTPN" 
  style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
/>
```

---

## 2. Design Principles

Prinsip desain utama kami memandu seluruh keputusan UI/UX di dalam aplikasi:

1. **Data-Density First (Kerapatan Data Utama)**
   Sebagai aplikasi analitik manajemen, ruang layar sangat berharga. Desain harus memaksimalkan jumlah informasi operasional (peta, tabel, grafik) yang dapat ditampilkan secara bersamaan tanpa menimbulkan kebingungan visual.
2. **Visual Hierarchy & Clarity (Hierarki & Kejelasan)**
   Garis tepi datar (*flat borders*), sudut tajam (*sharp corners*), dan pemisahan tegas antar panel membantu pengguna fokus pada data spasial dan tabel transaksi harian.
3. **Inclusivity & Color-Blind Friendly (Inklusivitas Spasial)**
   Data tematik peta (seperti batas kebun atau produktivitas) menggunakan palet warna khusus yang dapat dibedakan dengan jelas oleh penderita buta warna (Protanopia, Deuteranopia, Tritanopia).
4. **Instant Affordance (Keterbacaan Fungsi Seketika)**
   Elemen interaktif harus memiliki status hover, focus, dan active yang sangat kontras dan langsung teridentifikasi.

---

## 3. Color Palette

Palet warna SIG PTPN diklasifikasikan ke dalam warna identitas (Primary), warna fungsional (Neutral/Carbon g10), warna status (Support), dan warna spasial (Kebun & Peta).

### A. Primary & Brand Colors
| Warna | Token | Kode HEX | Representasi / Penggunaan |
| :--- | :--- | :--- | :--- |
| **PTPN Green** | `--cds-primary` | `#006A4E` | Warna brand utama, tombol primer, dan status aktif navigasi. |
| **Green Hover** | `--cds-primary-hover` | `#00503B` | Status hover untuk tombol primer. |
| **Green Active** | `--cds-primary-active` | `#003a2a` | Status klik/aktif pada tombol primer. |

### B. Functional Colors (IBM Carbon g10 Theme)
| Warna | Token | Kode HEX | Representasi / Penggunaan |
| :--- | :--- | :--- | :--- |
| **App Background** | `--cds-background` | `#f4f4f4` | Latar belakang aplikasi/halaman dashboard. |
| **Layer Surface** | `--cds-layer` | `#ffffff` | Panel samping, modal, filter card, dan container. |
| **Text Primary** | `--cds-text-primary`| `#161616` | Teks utama, judul, dan data tabel (Carbon text-01). |
| **Text Secondary**| `--cds-text-secondary`| `#525252` | Sub-label, keterangan form, ikon sekunder (Carbon text-02). |
| **Text Muted** | `--cds-text-muted` | `#8d8d8d` | Placeholders, teks non-aktif, label dinonaktifkan (Carbon text-03). |
| **Border Subtle** | `--cds-border` | `#e0e0e0` | Pembatas horizontal, tabel border, divider minimalis. |
| **Border Strong** | `--cds-border-strong`| `#8d8d8d` | Garis tepi form input dan elemen penegas. |
| **Field Bg** | `--cds-field` | `#ffffff` | Latar belakang form input dan dropdown select. |
| **Field Hover** | `--cds-field-hover` | `#e5e5e5` | Efek hover pada field input/select. |

### C. Alert & Status Colors (Carbon Support)
| Warna | Token | Kode HEX | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Error** | `--cds-support-error` | `#da1e28` | Isu kritis, kegagalan transaksi, SPH kritis (<150), Okupasi lahan merah. |
| **Warning** | `--cds-support-warning` | `#f5c842` | Peringatan, SPH kurang padat (150-349), usia tanaman tua. |
| **Success** | `--cds-support-success` | `#24a148` | Target tercapai, transaksi sukses, SPH optimal. |
| **Info** | `--cds-support-info` | `#0043ce` | Petunjuk, pemetaan default, tautan bantuan. |

### D. Kebun Spatial Color Map (Okabe-Ito Palette)
Palet ramah buta warna untuk memisahkan unit kebun pada peta default:
| Kebun | Token | Kode HEX | Karakter Visual |
| :--- | :--- | :--- | :--- |
| **Bergen** | `--color-bergen` | `#0072B2` | Biru Navy |
| **Kedaton** | `--color-kedaton` | `#009E73` | Hijau Toska / Teal |
| **Tubu** | `--color-tubu` | `#E69F00` | Jingga Kuning |
| **Way Berulu** | `--color-wayberulu`| `#56B4E9` | Biru Langit |
| **Wali** | `--color-wali` | `#D55E00` | Oranye Pekat |
| **KSO** | `--color-kso` | `#CC79A7` | Merah Muda Violet |

---

## 4. Typography

SIG PTPN menggunakan font **IBM Plex Sans** untuk mempertahankan keterbacaan tinggi pada teks berukuran kecil di dalam tabel dan visualisasi peta.

```css
font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Skala Tipografi (Typographic Scale)
| Level | Font Size | Line Height | Weight | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Title XL** | 20px | 28px | 600 (Bold) | Judul halaman besar (Login / Detail Kebun) |
| **Title LG** | 15px | 22px | 600 (Bold) | Judul panel samping, header modal |
| **Body MD** | 14px | 20px | 500 (Medium) | Tombol, teks input field, isi modal |
| **Body SM** | 13px | 18px | 400 (Regular)| Konten tabel data, deskripsi laci informasi |
| **Label Bold**| 12px | 16px | 600 (Semi-bold)| Label form, judul tabel header, teks navigasi aktif |
| **Label MD** | 12px | 16px | 500 (Medium) | Keterangan sumbu grafik, filter label, tab non-aktif |
| **Muted XS** | 11px | 14px | 600 (Bold) | Badges (all-caps), status indikator, note kecil |
| **Caption** | 10px | 12px | 400 (Regular)| Label hak cipta, sub-title logo |

---

## 5. Spacing System (8px Grid)

Sistem tata letak menggunakan kelipatan **8px** untuk margin dan padding, dengan sub-grid **4px** untuk elemen internal mikro (seperti jarak antara ikon dan teks).

| Variabel | Ukuran (px) | Penggunaan Umum |
| :--- | :--- | :--- |
| `--spacing-xxs` | 4px | Jarak ikon dengan teks, jarak label dengan input, garis batas tepi modal. |
| `--spacing-xs` | 8px | Padding baris tabel, margin antar elemen list, gap antar badge, margin button kecil. |
| `--spacing-sm` | 12px | Padding tombol standar, celah antar kolom filter, margin panel header kecil. |
| `--spacing-md` | 16px | Padding utama kartu (Carbon Tile), jarak layout internal, margin form group. |
| `--spacing-lg` | 24px | Padding halaman dashboard, margin antar modal section, padding dialog peringatan. |
| `--spacing-xl` | 32px | Margin luar container login, batas atas-bawah halaman cetak laporan. |

---

## 6. Layout Grid & Dashboard Structure

Aplikasi didesain menggunakan tata letak dua bagian utama:
1. **Header Navigasi (Aplikasi)**: Bar hitam di bagian paling atas dengan tinggi tetap `48px`, `zIndex: 1000`, dan bayangan `0 2px 6px rgba(0,0,0,0.3)`.
2. **Halaman Kerja (Viewport Area)**:
   - **Mode Peta Spasial**: Peta Leaflet mengambil 100% viewport. Panel filter dan list peringatan mengapung (*floating overlay*) di sebelah kanan dengan lebar `380px` s.d `420px`.
   - **Halaman Data Transaksional (Produksi, Pemeliharaan, Pemupukan)**:
     - **Filter Card**: Tinggi fleksibel berada di bagian atas halaman dengan layout grid responsif.
     - **Table Card**: Membentang mengisi sisa tinggi layar secara penuh dengan body tabel yang dapat di-scroll (`overflow-y: auto`) dan header tabel yang lengket (`position: sticky; top: 0`).

```
+--------------------------------------------------------------------------------+
|  [Logo] DASHBOARD KEBUN | Peta Spasial   Produksi   Pemeliharaan  [User active] |  -> Header (48px)
+--------------------------------------------------------------------------------+
|                                                           |                    |
|                                                           |  [Floating Panel]  |
|                                                           |  Width: 380px      |
|                       [ Peta Leaflet.js ]                 |  - Tab Filter      |
|                        100% Width & Height                |  - Tab Alerts      |
|                                                           |  - Tab Upload      |
|                                                           |                    |
| +-------------------------------------------------------+ |                    |
| | [Drawer Detail Blok] - Geser Naik dari Bawah          | |                    |
| +-------------------------------------------------------+ +--------------------+
```

---

## 7. Iconography

Ikonografi SIG PTPN menggunakan format vektor **SVG inline** untuk menjamin ketajaman visual pada semua tingkat zoom monitor.

### Standar Ikon
- **Sizing**: Default `16px x 16px` untuk aksi tabel dan navigasi utama. `12px x 12px` untuk ikon di dalam badge atau button kecil.
- **Stroke/Fill**: Mengikuti warna font di sekitarnya (`fill="currentColor"` atau `stroke="currentColor"`).
- **Semantik Ikon**:
  - Peta Spasial: Map & Pinpoint (`path d="M12 2C9...`)
  - Produksi: Grafik batang/naik (`path d="M2 13h...`)
  - Pemeliharaan: Obeng/kunci pas (`path d="M14.7 2...`)
  - Pemupukan: Tunas daun / pupuk (`path d="M8 15V...`)
  - Keluar/Logout: Pintu dengan panah kanan (`path d="M3 2h5...`)

---

## 8. Component Library

Setiap komponen dirancang agar konsisten dengan tema minimalis, bersudut tajam, dan memiliki ketebalan visual yang tegas khas IBM Carbon.

### A. Buttons (Tombol)

Tombol didesain flat tanpa gradasi atau bayangan berlebih, mengandalkan warna latar yang solid dan transisi hover yang halus.

```css
/* CSS Tombol Utama (Primary) */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--cds-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sharp); /* 0px */
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-primary:hover { background: var(--cds-primary-hover); }
.btn-primary:active { background: var(--cds-primary-active); }
.btn-primary:disabled { background: #e0e0e0; color: #8d8d8d; cursor: not-allowed; }
```

#### Spesifikasi Tombol
1. **Primary Button** (`#006A4E`): Digunakan untuk konfirmasi utama, submit data baru, dan aksi utama.
2. **Secondary Button** (`#393939`): Digunakan untuk membatalkan aksi, mereset filter, atau tombol sekunder.
3. **Table Action Edit** (`#e8f0fe` bg, `#0f62fe` text, `#b3d1ff` border): Tombol kecil untuk merubah baris data.
4. **Table Action Delete** (`#fff0f1` bg, `#da1e28` text, `#ffb3b8` border): Tombol kecil untuk menghapus baris data.

---

### B. Forms (Formulir)

Input field di SIG PTPN mengadopsi gaya Carbon: kotak solid putih dengan batas tepi abu-abu kuat, yang akan memunculkan garis tebal hijau di bagian bawah saat difokuskan.

```css
/* CSS Input Field */
.input-field {
  width: 100%;
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid var(--cds-border-strong);
  border-bottom: 2px solid var(--cds-border-strong);
  border-radius: var(--radius-sharp);
  color: var(--cds-text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: background 0.15s, border-color 0.15s;
}
.input-field:focus {
  border-bottom-color: var(--cds-primary);
}
```

- **Dropdown Select**: Memiliki struktur visual yang identik dengan input field biasa namun dengan ikon panah bawah (`#525252`) di sisi kanan.
- **Checkbox & Radio**: Menggunakan kotak tajam berukuran `14px x 14px` dengan border `2px solid var(--cds-border-strong)`. Saat dipilih, kotak akan terisi penuh warna Hijau PTPN (`#006A4E`) dengan simbol centang putih di dalamnya.

---

### C. Tables (Tabel Data)

Tabel didesain sepadat mungkin agar dapat memuat hingga 50 baris sekaligus dalam satu layar tanpa memerlukan scrolling halaman yang berlebihan.

```css
.carbon-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.carbon-table th {
  background: #262626; /* Dark Header */
  color: #ffffff;
  font-weight: 600;
  padding: 8px 10px;
  position: sticky;
  top: 0;
}
.carbon-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--cds-border);
}
.carbon-table tr:nth-child(even) td {
  background: #f4f4f4; /* Zebra Stripe */
}
.carbon-table tr:hover td {
  background: #e5e5e5; /* Row Hover */
}
```

---

### D. Cards (Kartu Informasi / Tiles)

Container dasar menggunakan format `.carbon-tile` yang sepenuhnya flat dengan border abu-abu tipis.

```css
.carbon-tile {
  background: var(--cds-layer); /* #ffffff */
  border: 1px solid var(--cds-border); /* #e0e0e0 */
  padding: var(--spacing-md); /* 16px */
  margin-bottom: var(--spacing-xs);
}

.carbon-tile-interactive {
  composes: carbon-tile;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.carbon-tile-interactive:hover {
  background: #f4f4f4;
  border-color: var(--cds-border-strong);
}
.carbon-tile-active {
  border-left: 4px solid var(--cds-primary); /* Penanda Aktif Hijau PTPN */
  background: #f4f4f4;
}
```

---

### E. Navigation (Navigasi Header)

Navigasi atas menggunakan bar gelap dengan tab-tab navigasi bertransisi lembut.

```css
.header-nav {
  height: 48px;
  background-color: #161616;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #393939;
}
.nav-tab {
  height: 100%;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #c6c6c6;
  border-bottom: 3px solid transparent;
  transition: all 0.15s ease;
}
.nav-tab:hover {
  color: #ffffff;
  background-color: #262626;
}
.nav-tab-active {
  color: #ffffff;
  background-color: #262626;
  border-bottom: 3px solid #0f62fe; /* Blue Carbon Accent for Nav */
}
```

---

### F. Sidebar (Panel Filter & Menu Samping)

Sidebar diposisikan mengapung di sisi kanan layar jika berada di halaman peta spasial, dan bertindak sebagai area filter.
- **Tinggi**: `calc(100vh - 48px)` (Mengisi penuh tinggi layar di bawah header).
- **Lebar**: `380px` s.d `420px`.
- **Struktur Samping**: Terdiri atas Tab Menu (`Filter`, `Alerts`, `Upload`) dengan indikator garis bawah aktif setebal `3px` berwarna Hijau PTPN (`#006A4E`).
- **Efek Akordion**: Accordion header memiliki bar border kiri setebal `4px` yang menandakan tingkat keparahan konten di dalamnya (Merah `#da1e28` jika ada isu SPH kritis di kebun tersebut, Oranye `#f5c842` untuk peringatan biasa).

---

### G. Modal (Dialog)

Modal digunakan untuk input data baru atau konfirmasi penghapusan. Kotak dialog modal harus memblokir seluruh interaksi layar di bawahnya menggunakan backdrop gelap.

```css
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  zIndex: 2000;
  padding: 16px;
}
.modal-box {
  background: #ffffff;
  width: 100%;
  max-width: 540px;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```
- **Modal Header**: Berlatar belakang hitam `#161616` dengan teks putih, dan memiliki tombol silang (`×`) untuk menutup.
- **Modal Body**: Berisi form isian terorganisir dengan gap layout `14px`.
- **Modal Footer**: Memiliki tombol penutup/batal (`btnSecondary`) di sebelah kiri tombol aksi utama (`btnPrimary`).

---

### H. Toast (Notifikasi Pop-up)

Toast adalah notifikasi non-blokir yang muncul secara otomatis di sudut kanan atas layar saat sistem berhasil atau gagal memproses data (misal: "Data berhasil disimpan").

- **Dimensi**: Lebar tetap `280px`, tinggi dinamis, disematkan di `top: 64px` dan `right: 16px`.
- **Gaya Visual**: Berupa tile kotak bersudut tajam dengan warna latar tipis sesuai statusnya:
  - Sukses: Latar `#dcfce7`, border kiri `4px solid #24a148`, teks `#15803d`
  - Gagal: Latar `#fff0f1`, border kiri `4px solid #da1e28`, teks `#da1e28`
- **Masa Tampil**: Otomatis menghilang setelah `3.5 detik` dengan animasi slide-out ke kanan.

---

### I. Alert (Notifikasi Inline)

Alert digunakan secara langsung di dalam form atau halaman untuk memperingatkan pengguna mengenai kesalahan pengisian atau peringatan sistem lainnya.

```css
.alert-inline-error {
  background: #fff0f1;
  color: #da1e28;
  padding: 10px 16px;
  font-size: 12px;
  border-left: 4px solid #da1e28;
}
```

---

### J. Loading (Indikator Pemuatan)

Indikator loading SIG PTPN diimplementasikan dalam dua metode: spinner SVG putar statis/overlay dan cursor tunggu global.

```css
/* Spinner Animasi */
@keyframes cds-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.cds--loading {
  display: inline-flex;
  position: relative;
  width: 88px;
  height: 88px;
}
.cds--loading--small {
  width: 24px;
  height: 24px;
}
.cds--loading__svg {
  width: 100%;
  height: 100%;
  animation: cds-rotate 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}
.cds--loading__track {
  fill: none;
  stroke: var(--cds-border);
  stroke-width: 6;
  opacity: 0.3;
}
.cds--loading__stroke {
  fill: none;
  stroke: var(--cds-primary); /* Hijau PTPN */
  stroke-width: 6;
  stroke-dasharray: 240;
  stroke-dashoffset: 60;
}
```

- **Global Loading State**: Saat ada proses pemuatan kritis (seperti sinkronisasi ulang database), seluruh body HTML diberi kelas `.loading-state` yang merubah kursor mouse menjadi roda spinner hijau mini dan memblokir klik (`pointer-events: none`).

```css
body.loading-state,
body.loading-state * {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='none' stroke='%23e0e0e0' stroke-width='3'/><circle cx='12' cy='12' r='9' fill='none' stroke='%23006A4E' stroke-width='3' stroke-dasharray='40' stroke-dashoffset='12'/></svg>") 12 12, wait !important;
  pointer-events: none !important;
}
```

---

### K. Empty State (Keadaan Kosong)

Empty State ditampilkan di dalam tabel atau panel samping ketika hasil pencarian atau filter data tidak menghasilkan baris apa pun.

- **Visual**: Elemen ikon centang hijau (`✅`) berukuran besar atau folder kosong abu-abu, diikuti dengan teks penjelasan yang terpusat.
- **Pesan Text**:
  - Peringatan Spasial: `"✅ Tidak ada isu kritis terdeteksi pada blok kebun saat ini."`
  - Pencarian Tabel: `"Data tidak ditemukan. Silakan sesuaikan filter pencarian Anda."`

---

### L. Error State (Keadaan Error)

Error state muncul saat koneksi API server backend terputus atau query data spasial bermasalah.

- **Visual**: Panel abu-abu terang `#f4f4f4` dengan border merah `#da1e28` di sisi kiri.
- **Isi**: Pesan error detail yang dilemparkan oleh backend (misalnya: `"JWT Token expired"` atau `"Database Connection Refused"`) dan sebuah tombol **"Muat Ulang Halaman"** (`btnSecondary`).

---

## 9. Responsive Design

SIG PTPN dioptimalkan untuk monitor desktop beresolusi FHD (`1920x1080`) dan HD (`1366x768`) sebagai perangkat utama yang digunakan di kantor unit kebun dan direksi. Namun, antarmuka tetap dirancang fleksibel hingga batas tablet (`768px`).

### Breakpoints (Titik Henti)
- **Desktop Besar (`>= 1200px`)**: Mode layar penuh peta spasial dengan filter sidebar aktif mengapung di kanan. Data grid tampil dengan kolom penuh.
- **Notebook & Tablet Horisontal (`768px - 1199px`)**: Sidebar filter dapat disembunyikan (*collapsible panel*) dengan tombol drawer untuk memberi ruang bagi peta Leaflet. Font tabel menyusut 1px (menjadi 11px) untuk mencegah kolom bertumpuk.
- **Tablet Vertikal & Mobile (`< 768px`)**: Layout filter atas pada halaman transaksi berubah dari baris horizontal menjadi susunan baris vertikal penuh (`flex-direction: column`). Tombol hapus dan edit baris tabel diperluas agar mudah disentuh (*touch-friendly*).

---

## 10. Accessibility (WCAG 2.1 Compliance)

Aplikasi ini menargetkan kepatuhan standar **WCAG 2.1 level AA** untuk memastikan keadilan penggunaan bagi semua operator kebun, termasuk mereka yang memiliki keterbatasan penglihatan.

1. **Rasio Kontras Warna (Color Contrast Ratio)**:
   - Teks hitam `#161616` di atas latar belakang putih `#ffffff` memiliki rasio kontras `21:1` (jauh di atas batas minimal WCAG AA `4.5:1`).
   - Teks putih di atas tombol primer `#006A4E` memiliki rasio kontras `5.8:1`.
2. **Desain Ramah Buta Warna (Color Blind Friendly)**:
   - Identifikasi blok kebun di peta tidak hanya didasarkan pada warna default, melainkan didukung dengan tooltip melayang (*hover tooltip*) berisi nama unit kebun saat kursor diarahkan ke polygon tersebut.
   - Indikator kritis SPH menggunakan label teks tegas seperti `SPH Kritis (<150)` disamping penggunaan warna merah `#da1e28`.
3. **Keyboard Navigability**:
   - Semua kolom filter select, input teks, dan button dapat dijangkau menggunakan tombol `TAB` dan diaktifkan dengan tombol `Enter` atau `Space`.
   - Elemen yang sedang terfokus memiliki visual penanda (*focus outline*) yang jelas.

---

## 11. Motion & Animation

Animasi digunakan secara bijaksana untuk memberikan umpan balik aksi tanpa mengalihkan perhatian pengguna dari analisis data utama.

### Standar Transisi CSS
- **Hover Efek (Tombol/Interactive Tiles)**:
  `transition: background 0.15s ease, border-color 0.15s ease;`
- **Slide-up (Laci Informasi Detail Blok)**:
  `animation: slideUp 0.25s cubic-bezier(0.2, 0, 0.38, 0.9) forwards;`
- **Fade-in (Transisi Halaman/Modal)**:
  `animation: fadeIn 0.2s ease forwards;`

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

---

## 12. Dark Mode Implementation Standard

Meskipun saat ini aplikasi menggunakan **Carbon g10 Light Theme** untuk penyesuaian pencahayaan kantor di siang hari, transisi ke Dark Mode dirancang menggunakan pemetaan variabel terbalik dengan memanfaatkan token **Carbon g100 Theme (Dark Theme)**.

### Tabel Pemetaan Token Dark Mode (Jika Diimplementasikan)
| Token Variable | Light Theme (Aktif) | Dark Theme (g100) | Deskripsi |
| :--- | :--- | :--- | :--- |
| `--cds-background` | `#f4f4f4` | `#161616` | Latar belakang aplikasi |
| `--cds-layer` | `#ffffff` | `#262626` | Latar belakang panel samping & kartu |
| `--cds-text-primary`| `#161616` | `#f4f4f4` | Warna font teks utama |
| `--cds-text-secondary`| `#525252` | `#c6c6c6` | Warna font label dan teks bantuan |
| `--cds-border` | `#e0e0e0` | `#393939` | Warna garis pembatas |
| `--cds-field` | `#ffffff` | `#161616` | Latar belakang isian form |
| `--cds-field-hover` | `#e5e5e5` | `#353535` | Latar hover isian form |
| **Map Base Style** | Leaflet Positron | CartoDB Dark Matter| Peta dasar layer spasial |

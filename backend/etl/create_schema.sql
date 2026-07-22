-- ============================================================
-- SIG PTPN — Database Schema Setup
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Aktifkan ekstensi PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop tabel jika sudah ada (untuk fresh install)
DROP TABLE IF EXISTS blok_kebun;

-- 3. Buat tabel utama
CREATE TABLE blok_kebun (
    id            SERIAL PRIMARY KEY,
    -- Identitas blok
    kebun         TEXT NOT NULL,
    kode_blok     TEXT,
    no_polygon    TEXT,
    no_aset       TEXT,
    afdeling      TEXT,
    -- Komoditi & budidaya
    komoditi      TEXT,
    status        TEXT,
    thn_tanam     TEXT,
    varietas      TEXT,
    -- Lokasi administratif
    kabupaten     TEXT,
    kecamatan     TEXT,
    desa          TEXT,
    -- Luas (hektar)
    l_gis         FLOAT,
    l_rkap        FLOAT,
    l_hgu         FLOAT,
    -- Produksi (kg/tahun)
    protas_21     FLOAT,
    protas_22     FLOAT,
    protas_23     FLOAT,
    protas_24     FLOAT,
    -- Lainnya
    populasi      INTEGER,
    pica          TEXT,
    alas_hak      TEXT,
    kat_als_hk    TEXT,
    status_kpm    TEXT,
    keterangan    TEXT,
    nomor_peta    TEXT,
    -- Geometri spasial (WGS84)
    geom          GEOMETRY(MultiPolygon, 4326) NOT NULL,
    -- Metadata import
    source_file   TEXT,
    imported_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_kebun_no_polygon UNIQUE (kebun, no_polygon)
);

-- 4. Indeks spasial (WAJIB untuk performa kueri geospasial)
CREATE INDEX idx_blok_kebun_geom ON blok_kebun USING GIST(geom);

-- 5. Indeks atribut untuk filter cepat
CREATE INDEX idx_blok_kebun_kebun     ON blok_kebun(kebun);
CREATE INDEX idx_blok_kebun_komoditi  ON blok_kebun(komoditi);
CREATE INDEX idx_blok_kebun_status    ON blok_kebun(status);
CREATE INDEX idx_blok_kebun_afdeling  ON blok_kebun(afdeling);

-- 6. Verifikasi setup
SELECT PostGIS_Version();
SELECT COUNT(*) FROM blok_kebun;

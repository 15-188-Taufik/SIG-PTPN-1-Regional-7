-- ====================================================================
-- SIG PTPN — Schema Tambahan untuk Sinkronisasi Google Sheets
-- Jalankan script ini di Supabase SQL Editor
-- ====================================================================

-- 1. Tambahkan Unique Constraint pada fact_produksi_harian jika belum ada
-- Ini diperlukan agar operasi UPSERT berdasarkan (id_afdeling, tanggal) bisa berjalan.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_produksi_afdeling_tanggal'
    ) THEN
        ALTER TABLE fact_produksi_harian 
        ADD CONSTRAINT uq_produksi_afdeling_tanggal UNIQUE (id_afdeling, tanggal);
    END IF;
END $$;

-- 2. Buat tabel Pemeliharaan Harian (tingkat blok)
CREATE TABLE IF NOT EXISTS fact_pemeliharaan_harian (
    id             SERIAL PRIMARY KEY,
    blok_id        INTEGER REFERENCES blok_kebun(id) ON DELETE CASCADE,
    tanggal        DATE NOT NULL,
    jenis_kegiatan TEXT NOT NULL,          -- Contoh: Weeding, Pruning, Pest Control
    material       TEXT,                   -- Contoh: Herbisida, Dosis, dll.
    dosis_aplikasi FLOAT,                  -- Dosis per hektar atau total
    luas_aplikasi  FLOAT,                  -- Luas area kerja (Ha)
    tenaga_kerja   INTEGER,                -- Jumlah HK (Hari Kerja)
    keterangan     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_pemeliharaan_blok_tanggal_kegiatan UNIQUE (blok_id, tanggal, jenis_kegiatan)
);

-- 3. Buat tabel Pemupukan Harian (tingkat blok)
CREATE TABLE IF NOT EXISTS fact_pemupukan_harian (
    id             SERIAL PRIMARY KEY,
    blok_id        INTEGER REFERENCES blok_kebun(id) ON DELETE CASCADE,
    tanggal        DATE NOT NULL,
    jenis_pupuk    TEXT NOT NULL,          -- Contoh: Urea, NPK, Borate
    jumlah_pupuk   FLOAT NOT NULL,         -- Jumlah pupuk diaplikasikan (Kg)
    luas_aplikasi  FLOAT,                  -- Luas area dipupuk (Ha)
    tenaga_kerja   INTEGER,                -- Jumlah HK
    keterangan     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_pemupukan_blok_tanggal_pupuk UNIQUE (blok_id, tanggal, jenis_pupuk)
);

-- 4. Buat indeks temporal untuk performa filter grafik di dashboard
CREATE INDEX IF NOT EXISTS idx_fact_pemeliharaan_tanggal ON fact_pemeliharaan_harian(tanggal);
CREATE INDEX IF NOT EXISTS idx_fact_pemupukan_tanggal ON fact_pemupukan_harian(tanggal);

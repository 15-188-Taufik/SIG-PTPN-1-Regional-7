"""
ETL Script: Import GeoJSON kebun PTPN Lampung ke PostgreSQL/Supabase.

Cara penggunaan:
1. Copy .env.example ke .env dan isi DATABASE_URL
2. Pastikan schema sudah dibuat (jalankan create_schema.sql di Supabase)
3. Jalankan dari folder backend/:
   python -m etl.import_geojson

Atau langsung:
   cd backend
   python etl/import_geojson.py
"""

import json
import os
import sys
from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.getenv("DATABASE_URL")
GEOJSON_DIR = Path(__file__).parent.parent.parent / "datas" / "LAMPUNG"

# Mapping dari property GeoJSON ke kolom database
PROP_MAP = {
    "Kebun": "kebun",
    "Kode_Blok": "kode_blok",
    "No_Polygon": "no_polygon",
    "No_Aset": "no_aset",
    "Afdeling": "afdeling",
    "Komoditi": "komoditi",
    "Status": "status",
    "Thn_Tanam": "thn_tanam",
    "Varietas": "varietas",
    "Kabupaten": "kabupaten",
    "Kecamatan": "kecamatan",
    "Desa": "desa",
    "L_GIS": "l_gis",
    "L_RKAP": "l_rkap",
    "L_HGU_HGB": "l_hgu",
    "Protas_21": "protas_21",
    "Protas_22": "protas_22",
    "Protas_23": "protas_23",
    "Protas_24": "protas_24",
    "Populasi": "populasi",
    "PICA": "pica",
    "Alas_Hak": "alas_hak",
    "Kat_Als_Hk": "kat_als_hk",
    "Status_Kpm": "status_kpm",
}

DB_COLUMNS = list(PROP_MAP.values()) + ["geom", "source_file"]


def safe_float(val):
    try:
        f = float(val)
        return f if not (f != f) else None  # NaN check
    except (TypeError, ValueError):
        return None


def safe_int(val):
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return None


def process_feature(feature: dict, source_file: str) -> tuple | None:
    """Konversi satu GeoJSON feature ke tuple untuk INSERT."""
    props = feature.get("properties", {})
    geom = feature.get("geometry")

    if not geom:
        return None

    geom_json_str = json.dumps(geom)

    row = []
    for geojson_key, db_col in PROP_MAP.items():
        val = props.get(geojson_key)
        # Konversi tipe
        if db_col in ("l_gis", "l_rkap", "l_hgu", "protas_21", "protas_22", "protas_23", "protas_24"):
            val = safe_float(val)
        elif db_col == "populasi":
            val = safe_int(val)
        elif val == "" or val == "null":
            val = None
            
        if db_col == "kebun":
            sf_lower = source_file.lower()
            if "bergen" in sf_lower:
                val = "Unit Bergen"
            elif "kedaton" in sf_lower:
                val = "Unit Kedaton"
            elif "tubu" in sf_lower:
                val = "Unit Tulungbuyut"
            elif "wabe" in sf_lower:
                val = "Unit Way Berulu"
            elif "wali" in sf_lower:
                val = "Unit Way Lima"
            else:
                val = "Unit Bergen"

        elif db_col == "afdeling":
            orig_afdeling = str(val or "").strip()
            sf_lower = source_file.lower()
            
            def parse_afd_idx(s_val: str) -> int:
                s = s_val.lower()
                if "vi" in s: return 6
                if "iv" in s: return 4
                if "v" in s: return 5
                if "iii" in s: return 3
                if "ii" in s: return 2
                if "i" in s: return 1
                if "a" in s: return 1
                if "b" in s: return 2
                if "c" in s: return 3
                if "d" in s: return 4
                for char in s:
                    if char.isdigit():
                        v = int(char)
                        if 1 <= v <= 9: return v
                return 1

            idx = parse_afd_idx(orig_afdeling)

            if "bergen" in sf_lower:
                if idx == 1: val = "Afdeling I"
                elif idx == 2: val = "Afdeling II"
                else: val = "Afdeling III"
            elif "kedaton" in sf_lower:
                if idx == 1: val = "Afdeling A"
                elif idx == 2: val = "Afdeling B"
                elif idx == 3: val = "Afdeling C"
                else: val = "Afdeling D"
            elif "tubu" in sf_lower:
                if idx == 1: val = "Afdeling A"
                elif idx == 2: val = "Afdeling B"
                else: val = "Afdeling C"
            elif "wabe" in sf_lower:
                if idx == 1: val = "Afdeling I"
                elif idx == 2: val = "Afdeling II"
                elif idx == 3: val = "Afdeling III"
                else: val = "Afdeling IV"
            elif "wali" in sf_lower:
                if idx == 1: val = "Afdeling I"
                elif idx == 2: val = "Afdeling II"
                elif idx == 3: val = "Afdeling III"
                elif idx == 4: val = "Afdeling IV"
                else: val = "Afdeling V"
            else:
                val = orig_afdeling

        row.append(val)

    # Tambah geometri sebagai string GeoJSON untuk ST_GeomFromGeoJSON
    row.append(geom_json_str)
    row.append(source_file)

    return tuple(row)


def import_file(conn, filepath: Path):
    print(f"\n  Memproses: {filepath.name}")

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    print(f"  Ditemukan {len(features)} features")

    rows = []
    for feat in features:
        row = process_feature(feat, filepath.name)
        if row:
            rows.append(row)

    if not rows:
        print("  Tidak ada data valid untuk diimport.")
        return

    # Pisahkan kolom non-geom dan geom
    non_geom_cols = DB_COLUMNS[:-2]  # semua kecuali geom dan source_file
    placeholders_non_geom = ", ".join(["%s"] * len(non_geom_cols))
    # geom menggunakan fungsi PostGIS
    insert_sql = f"""
        INSERT INTO blok_kebun ({', '.join(DB_COLUMNS)})
        VALUES ({placeholders_non_geom}, ST_Multi(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))), %s)
        ON CONFLICT (kebun, no_polygon) DO UPDATE SET
            kebun = EXCLUDED.kebun,
            l_gis = EXCLUDED.l_gis,
            status = EXCLUDED.status,
            imported_at = NOW()
    """

    cur = conn.cursor()
    inserted = 0
    errors = 0

    for row in rows:
        try:
            cur.execute(insert_sql, row)
            inserted += 1
        except Exception as e:
            conn.rollback()
            cur = conn.cursor()
            errors += 1
            if errors <= 3:  # Tampilkan max 3 error pertama
                no_polygon = row[2] if len(row) > 2 else "?"
                print(f"  [WARN] Skip {no_polygon}: {str(e)[:80]}")

    conn.commit()
    cur.close()
    print(f"  Selesai: {inserted} berhasil, {errors} gagal")


def main():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL tidak ditemukan di environment.")
        print("Pastikan file .env sudah dibuat dari .env.example")
        sys.exit(1)

    print("=" * 60)
    print("  SIG PTPN — ETL Import GeoJSON ke PostgreSQL/Supabase")
    print("=" * 60)

    if not GEOJSON_DIR.exists():
        print(f"[ERROR] Folder GeoJSON tidak ditemukan: {GEOJSON_DIR}")
        sys.exit(1)

    geojson_files = sorted(GEOJSON_DIR.glob("*.geojson"))
    if not geojson_files:
        print(f"[ERROR] Tidak ada file .geojson di: {GEOJSON_DIR}")
        sys.exit(1)

    print(f"\nFile yang akan diimport ({len(geojson_files)} file):")
    for f in geojson_files:
        print(f"  - {f.name}")

    print("\nMenghubungkan ke database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("Koneksi berhasil!")
    except Exception as e:
        print(f"[ERROR] Gagal koneksi: {e}")
        sys.exit(1)

    for filepath in geojson_files:
        import_file(conn, filepath)

    # Verifikasi akhir
    cur = conn.cursor()
    cur.execute("SELECT kebun, COUNT(*) FROM blok_kebun GROUP BY kebun ORDER BY kebun")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print("  HASIL IMPORT FINAL:")
    print("=" * 60)
    total = 0
    for kebun, count in rows:
        print(f"  {kebun:<20} {count:>5} blok")
        total += count
    print(f"  {'TOTAL':<20} {total:>5} blok")
    print("=" * 60)
    print("\nImport selesai! Data siap digunakan.")


if __name__ == "__main__":
    main()

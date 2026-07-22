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
            raw_val = props.get("SAP_Afd") or props.get("sap_afd") or props.get("SAP_AFD") or val or props.get("Afdeling") or props.get("afdeling")
            orig_afdeling = str(raw_val or "").strip()
            sf_lower = source_file.lower()
            
            ROMAN_NUMS = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII"}
            ROMAN_VALUES = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8}

            def parse_clean_afdeling(raw_val: str, unit_name: str) -> str:
                s = str(raw_val).strip()
                if not s or s.lower() in ["none", "null", "kso", "implasmen", "pabrik", "trikora", "keda", "bapu", "tubu", "bergen", "tulungbuyut", "kedaton"]:
                    return "Afdeling I"

                # Strip prefix "afdeling", "afd.", "afd"
                lower_orig = s.lower()
                clean_val = s
                if lower_orig.startswith("afdeling "):
                    clean_val = s[9:].strip()
                elif lower_orig.startswith("afd. "):
                    clean_val = s[5:].strip()
                elif lower_orig.startswith("afd "):
                    clean_val = s[4:].strip()
                elif lower_orig.startswith("afd"):
                    clean_val = s[3:].strip()

                lower_clean = clean_val.lower()

                # 1. Match Roman numerals
                if lower_clean in ROMAN_VALUES:
                    num = ROMAN_VALUES[lower_clean]
                    return f"Afdeling {ROMAN_NUMS[num]}"

                # 2. Match numeric digits
                if lower_clean.isdigit():
                    num = int(lower_clean)
                    if 1 <= num <= 10:
                        return f"Afdeling {ROMAN_NUMS.get(num, str(num))}"

                # 3. Match single letters (A, B, C, D, E, F)
                if len(lower_clean) == 1 and "a" <= lower_clean <= "f":
                    return f"Afdeling {clean_val.upper()}"

                # 4. Standard custom name (e.g. Blambangan Umpu)
                return f"Afdeling {clean_val}"

            val = parse_clean_afdeling(orig_afdeling, sf_lower)

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
        
        # Bersihkan data lama & reset auto-increment ID back to 1
        print("Membersihkan data lama dan me-reset ID di tabel blok_kebun...")
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE blok_kebun RESTART IDENTITY CASCADE;")
        conn.commit()
        cur.close()
        print("Data lama berhasil dibersihkan dan ID di-reset ke 1.")
    except Exception as e:
        print(f"[ERROR] Gagal koneksi atau pembersihan database: {e}")
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

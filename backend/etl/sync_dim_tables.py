import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL == "mock":
    print("Error: DATABASE_URL is not set to a real database connection string.")
    exit(1)

print("Connecting to database to synchronize dim_unit and dim_afdeling tables...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # 1. Dapatkan semua kebun unik dari blok_kebun
    cur.execute("SELECT DISTINCT kebun FROM blok_kebun WHERE kebun IS NOT NULL AND kebun != '';")
    kebuns_in_blok = [row[0] for row in cur.fetchall()]
    print(f"Ditemukan {len(kebuns_in_blok)} kebun unik di blok_kebun: {kebuns_in_blok}")

    # 2. Sinkronisasi dengan dim_unit
    for kebun_name in kebuns_in_blok:
        # Cek apakah sudah ada di dim_unit
        cur.execute("SELECT id_unit FROM dim_unit WHERE LOWER(TRIM(nama_unit)) = LOWER(TRIM(%s));", (kebun_name,))
        row = cur.fetchone()
        if not row:
            # Cari ID unit terbesar untuk auto-increment manual jika diperlukan (id_unit bukan serial di model lama)
            cur.execute("SELECT COALESCE(MAX(id_unit), 0) + 1 FROM dim_unit;")
            next_id = cur.fetchone()[0]
            print(f"Menambahkan unit baru ke dim_unit: {kebun_name} (ID: {next_id})")
            cur.execute(
                "INSERT INTO dim_unit (id_unit, nama_unit, komoditas, latitude, longitude) VALUES (%s, %s, %s, %s, %s);",
                (next_id, kebun_name, "Karet / Tebu / Sawit", -5.2, 105.2)
            )
            conn.commit()

    # 3. Dapatkan semua afdeling unik dari blok_kebun
    cur.execute("SELECT DISTINCT kebun, afdeling FROM blok_kebun WHERE afdeling IS NOT NULL AND afdeling != '';")
    afds_in_blok = cur.fetchall()
    print(f"Ditemukan {len(afds_in_blok)} kombinasi (kebun, afdeling) unik di blok_kebun.")

    # 4. Sinkronisasi dengan dim_afdeling
    for kebun_name, afd_name in afds_in_blok:
        # Dapatkan id_unit
        cur.execute("SELECT id_unit FROM dim_unit WHERE LOWER(TRIM(nama_unit)) = LOWER(TRIM(%s));", (kebun_name,))
        unit_row = cur.fetchone()
        if not unit_row:
            print(f"Peringatan: Unit {kebun_name} tidak ditemukan di dim_unit, lewati afdeling {afd_name}.")
            continue
        unit_id = unit_row[0]

        # Cek apakah afdeling sudah ada untuk unit ini
        cur.execute(
            "SELECT id_afdeling FROM dim_afdeling WHERE id_unit = %s AND LOWER(TRIM(nama_afdeling)) = LOWER(TRIM(%s));",
            (unit_id, afd_name)
        )
        afd_row = cur.fetchone()
        if not afd_row:
            # Cari ID afdeling terbesar untuk auto-increment manual
            cur.execute("SELECT COALESCE(MAX(id_afdeling), 0) + 1 FROM dim_afdeling;")
            next_afd_id = cur.fetchone()[0]
            print(f"Menambahkan afdeling baru ke dim_afdeling: {afd_name} untuk Unit ID {unit_id} (ID Afdeling: {next_afd_id})")
            cur.execute(
                "INSERT INTO dim_afdeling (id_afdeling, id_unit, nama_afdeling) VALUES (%s, %s, %s);",
                (next_afd_id, unit_id, afd_name)
            )
            conn.commit()

    print("Sinkronisasi dim_unit dan dim_afdeling selesai dengan sukses!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Terjadi kesalahan saat sinkronisasi: {e}")
    exit(1)

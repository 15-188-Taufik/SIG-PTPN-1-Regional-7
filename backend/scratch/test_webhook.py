import sys
import os
import json
from datetime import date

# Set CWD to backend directory and add to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.database import SessionLocal
from app.models.kebun import BlokKebun, DimUnit, DimAfdeling, FactProduksiHarian, FactPemeliharaanHarian, FactPemupukanHarian
from app.routers.sync import sync_webhook
from app.schemas.sync import SyncRequestPayload


def run_tests():
    print("====== Memulai Pengujian Webhook Google Sheets ======")
    db = SessionLocal()
    if db is None:
        print("Error: Gagal membuat session database. Periksa file .env Anda.")
        return

    try:
        # 0. Jalankan migrasi schema agar constraint dan tabel baru terbentuk
        print("\n[0] Mengaplikasikan schema baru dari create_sync_schema.sql...")
        schema_path = os.path.join(backend_dir, "etl", "create_sync_schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
        
        # Eksekusi script DDL SQL menggunakan cursor koneksi mentah DB
        with db.bind.connect() as conn:
            raw_conn = conn.connection
            with raw_conn.cursor() as cur:
                cur.execute(sql_script)
            raw_conn.commit()
        print("Schema baru berhasil diaplikasikan.")

        # 1. Cari data master untuk testing
        print("\n[1] Mencari data master di database...")
        unit = db.query(DimUnit).first()
        afdeling = db.query(DimAfdeling).first()
        blok = db.query(BlokKebun).first()

        if not unit or not afdeling:
            print("Peringatan: Tabel dim_unit atau dim_afdeling kosong. Membuat data mock untuk testing...")
            # Buat mock unit
            unit = DimUnit(id_unit=999, nama_unit="Unit Test Bergen", komoditas="Kelapa Sawit")
            db.add(unit)
            db.flush()
            # Buat mock afdeling
            afdeling = DimAfdeling(id_afdeling=999, id_unit=999, nama_afdeling="Afdeling Test I")
            db.add(afdeling)
            db.flush()
            print(f"Mock Data Dibuat: Unit ID {unit.id_unit}, Afdeling ID {afdeling.id_afdeling}")

        print(f"Menggunakan referensi:")
        print(f" - Unit: {unit.nama_unit} (ID: {unit.id_unit})")
        print(f" - Afdeling: {afdeling.nama_afdeling} (ID: {afdeling.id_afdeling})")

        if blok:
            print(f" - Blok: Kebun={blok.kebun}, Afdeling={blok.afdeling}, No Polygon={blok.no_polygon}, Kode Blok={blok.kode_blok} (ID: {blok.id})")
        else:
            print("Peringatan: Tabel blok_kebun kosong. Membuat data mock untuk testing...")
            blok = BlokKebun(
                kebun=unit.nama_unit,
                afdeling=afdeling.nama_afdeling,
                no_polygon="999",
                kode_blok="TST999",
                geom="SRID=4326;MULTIPOLYGON(((105 -5, 105.1 -5, 105.1 -5.1, 105 -5.1, 105 -5)))" # dummy geom
            )
            db.add(blok)
            db.flush()
            print(f"Mock Blok Dibuat: ID {blok.id}")

        # Simpan perubahan mock ke DB sebelum run test
        db.commit()

        # 2. Test Sinkronisasi Produksi Harian (UPSERT 1 - Direct ID)
        print("\n[2] Menguji Sinkronisasi Produksi Harian...")
        produksi_payload = SyncRequestPayload(
            sheet_type="produksi_harian",
            rows=[
                {
                    "tanggal": "2026-07-15",
                    "id_afdeling": afdeling.id_afdeling,
                    "target_harian_ton": 40.5,
                    "produksi_aktual_ton": 38.2,
                    "jumlah_pemanen_hk": 35,
                    "curah_hujan_mm": 12.5,
                    "rendemen_persen": 20.15
                }
            ]
        )
        # Panggil fungsi router secara langsung
        result = sync_webhook(payload=produksi_payload, db=db)
        print("Respon API Produksi Harian:", json.dumps(result, indent=2))
        assert result["inserted_updated"] == 1, "Harus sukses 1 baris"

        # Test UPSERT (Update data yang sama - Text Lookup Fallback)
        print("\n[3] Menguji UPSERT Produksi Harian (Fuzzy Lookup Update)...")
        produksi_payload_update = SyncRequestPayload(
            sheet_type="produksi_harian",
            rows=[
                {
                    "tanggal": "2026-07-15",
                    "kebun": unit.nama_unit,
                    "afdeling": afdeling.nama_afdeling,
                    "target_harian_ton": 40.5,
                    "produksi_aktual_ton": 42.0,  # diubah dari 38.2
                    "jumlah_pemanen_hk": 35,
                    "curah_hujan_mm": 12.5,
                    "rendemen_persen": 20.15
                }
            ]
        )
        result_update = sync_webhook(payload=produksi_payload_update, db=db)
        print("Respon API Produksi Harian (Update):", json.dumps(result_update, indent=2))
        
        # Verifikasi di DB
        db_prod = db.query(FactProduksiHarian).filter_by(
            id_afdeling=afdeling.id_afdeling, 
            tanggal=date(2026, 7, 15)
        ).first()
        print(f"Data di DB - Produksi Aktual Ton: {db_prod.produksi_aktual_ton} (Ekspektasi: 42.0)")
        assert db_prod.produksi_aktual_ton == 42.0, "Realisasi produksi harus terupdate menjadi 42.0"

        # 4. Test Sinkronisasi Pemeliharaan Harian
        print("\n[4] Menguji Sinkronisasi Pemeliharaan Harian...")
        pemeliharaan_payload = SyncRequestPayload(
            sheet_type="pemeliharaan_harian",
            rows=[
                {
                    "tanggal": "2026-07-15",
                    "blok_id": blok.id,
                    "jenis_kegiatan": "Manual Weeding",
                    "material": "Roundup",
                    "dosis_aplikasi": 2.5,
                    "luas_aplikasi": 1.5,
                    "tenaga_kerja": "pribadi",  # Test safe-casting of string to int
                    "keterangan": "Pembersihan piringan"
                }
            ]
        )
        result_maint = sync_webhook(payload=pemeliharaan_payload, db=db)
        print("Respon API Pemeliharaan Harian:", json.dumps(result_maint, indent=2))
        assert result_maint["inserted_updated"] == 1, "Harus sukses 1 baris"

        # 5. Test Sinkronisasi Pemupukan Harian
        print("\n[5] Menguji Sinkronisasi Pemupukan Harian...")
        pemupukan_payload = SyncRequestPayload(
            sheet_type="pemupukan_harian",
            rows=[
                {
                    "tanggal": "2026-07-15",
                    "blok_id": blok.id,
                    "jenis_pupuk": "Urea",
                    "jumlah_pupuk": 250.0,
                    "luas_aplikasi": 2.0,
                    "tenaga_kerja": 4,
                    "keterangan": "Pemupukan rutin"
                }
            ]
        )
        result_fert = sync_webhook(payload=pemupukan_payload, db=db)
        print("Respon API Pemupukan Harian:", json.dumps(result_fert, indent=2))
        assert result_fert["inserted_updated"] == 1, "Harus sukses 1 baris"

        # Hapus data mock jika tadi dibuat agar DB tetap bersih
        print("\n[6] Membersihkan data uji coba...")
        db.query(FactProduksiHarian).filter(FactProduksiHarian.id_afdeling == afdeling.id_afdeling).delete()
        db.query(FactPemeliharaanHarian).filter(FactPemeliharaanHarian.blok_id == blok.id).delete()
        db.query(FactPemupukanHarian).filter(FactPemupukanHarian.blok_id == blok.id).delete()
        
        if unit.id_unit == 999:
            db.query(BlokKebun).filter(BlokKebun.id == blok.id).delete()
            db.query(DimAfdeling).filter(DimAfdeling.id_afdeling == 999).delete()
            db.query(DimUnit).filter(DimUnit.id_unit == 999).delete()
            
        db.commit()
        print("\n====== SEMUA PENGUJIAN SUKSES ======")

    except Exception as e:
        db.rollback()
        print(f"\nError saat pengujian: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    run_tests()

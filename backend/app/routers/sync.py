from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from typing import Dict, Any, List
import logging

from app.database import get_db
from app.config import settings
from app.models.kebun import (
    BlokKebun,
    DimUnit,
    DimAfdeling,
    FactProduksiHarian,
    FactPemeliharaanHarian,
    FactPemupukanHarian,
)
from app.schemas.sync import (
    SyncRequestPayload,
    ProduksiHarianRow,
    PemeliharaanHarianRow,
    PemupukanHarianRow,
    DeleteRequestPayload,
)

logger = logging.getLogger("sync")

router = APIRouter(prefix="/sync", tags=["Sheets Synchronization"])

# Setup API Key authentication header
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)


async def verify_api_key(api_key_header_value: str = Security(api_key_header)):
    """Verifikasi bahwa X-API-Key yang dikirim sesuai dengan pengaturan di backend."""
    if api_key_header_value != settings.SYNC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key tidak valid. Sinkronisasi ditolak.",
        )
    return api_key_header_value


def normalize_name(val: str) -> str:
    """Melakukan normalisasi teks untuk pencocokan nama kebun/afdeling secara case-insensitive."""
    if not val:
        return ""
    s = str(val).lower().strip()
    # Hapus prefix "unit"
    if s.startswith("unit "):
        s = s[5:].strip()
    # Hapus prefix "afdeling" atau "afd"
    if s.startswith("afdeling "):
        s = s[9:].strip()
    elif s.startswith("afd "):
        s = s[4:].strip()
    elif s.startswith("afd."):
        s = s[4:].strip()
    elif s.startswith("afd"):
        s = s[3:].strip()
    # Hapus tanda hubung, titik, dan spasi
    s = s.replace("-", "").replace(".", "").replace(" ", "")
    return s


def get_afdeling_id(db: Session, kebun_input: str, afdeling_input: str) -> int | None:
    """Mendapatkan id_afdeling dari tabel dim_afdeling berdasarkan nama kebun dan afdeling."""
    norm_kebun = normalize_name(kebun_input)
    norm_afd = normalize_name(afdeling_input)

    # Peta konversi angka biasa ke romawi
    roman_map = {"1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v"}
    inv_roman = {v: k for k, v in roman_map.items()}

    # Ambil data unit dan afdeling dari db
    results = db.query(DimAfdeling, DimUnit).join(DimUnit, DimAfdeling.id_unit == DimUnit.id_unit).all()

    for afd, unit in results:
        db_kebun = normalize_name(unit.nama_unit)
        db_afd = normalize_name(afd.nama_afdeling)

        if db_kebun == norm_kebun:
            # Match langsung
            if db_afd == norm_afd:
                return afd.id_afdeling
            # Konversi angka ke romawi
            if norm_afd in roman_map and db_afd == roman_map[norm_afd]:
                return afd.id_afdeling
            # Konversi romawi ke angka
            if norm_afd in inv_roman and db_afd == inv_roman[norm_afd]:
                return afd.id_afdeling

    return None


def get_blok_id(db: Session, kebun_input: str, afdeling_input: str, no_polygon_input: Any, kode_blok_input: Any) -> int | None:
    """Mendapatkan ID blok dari tabel blok_kebun berdasarkan kriteria spasial/atribut."""
    norm_kebun = normalize_name(kebun_input)
    norm_afd = normalize_name(afdeling_input)
    roman_map = {"1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v"}
    inv_roman = {v: k for k, v in roman_map.items()}

    query = db.query(BlokKebun)

    # Filter berdasarkan no_polygon (prioritas utama) atau kode_blok
    has_filter = False
    if no_polygon_input is not None and str(no_polygon_input).strip() != "":
        np = str(no_polygon_input).strip()
        # Hilangkan float formatting dari Sheets (misal: "10.0" -> "10")
        if np.endswith(".0"):
            np = np[:-2]
        query = query.filter(BlokKebun.no_polygon == np)
        has_filter = True
    elif kode_blok_input is not None and str(kode_blok_input).strip() != "":
        query = query.filter(BlokKebun.kode_blok.ilike(str(kode_blok_input).strip()))
        has_filter = True

    if not has_filter:
        return None

    candidates = query.all()
    if not candidates:
        return None

    # Cari kandidat yang memiliki kesesuaian unit dan afdeling
    for cand in candidates:
        cand_kebun = normalize_name(cand.kebun)
        cand_afd = normalize_name(cand.afdeling)

        if cand_kebun == norm_kebun:
            if cand_afd == norm_afd:
                return cand.id
            if norm_afd in roman_map and cand_afd == roman_map[norm_afd]:
                return cand.id
            if norm_afd in inv_roman and cand_afd == inv_roman[norm_afd]:
                return cand.id

    # Fallback 1: Jika unit cocok tapi afdeling agak meleset, kembalikan yang unitnya sama
    for cand in candidates:
        if normalize_name(cand.kebun) == norm_kebun:
            return cand.id

    # Fallback 2: Ambil kandidat pertama jika unit tidak terdefinisi dengan jelas tapi polygon unik
    return candidates[0].id


@router.post("/webhook", summary="Webhook receiver untuk Google Sheets")
def sync_webhook(
    payload: SyncRequestPayload,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Menerima data harian dari Google Sheets dan menyimpannya ke database dengan metode UPSERT."""
    sheet_type = payload.sheet_type
    rows = payload.rows

    class TrackedList(list):
        def __init__(self, callback):
            super().__init__()
            self.callback = callback
        def append(self, item):
            super().append(item)
            self.callback(item)

    success_count = 0
    results = []
    success_ids = TrackedList(lambda val: results.append({"status": "success", "id_fakta": val}))
    errors = TrackedList(lambda val: results.append({"status": "error", "error": val}))

    # Pastikan koneksi DB tersedia
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak terhubung.",
        )

    for idx, raw_row in enumerate(rows):
        row_num = idx + 2  # Asumsi baris data dimulai dari baris ke-2 (setelah header)
        try:
            # 1. PROSES PRODUKSI HARIAN
            if sheet_type == "produksi_harian":
                # Normalisasi typo penulisan kolom 'rendeman' (dengan a) menjadi 'rendemen' (dengan e)
                if "rendeman_persen" in raw_row and "rendemen_persen" not in raw_row:
                    raw_row["rendemen_persen"] = raw_row["rendeman_persen"]

                # Validasi dengan schema Pydantic
                row_data = ProduksiHarianRow(**raw_row)
                row_id = getattr(row_data, "id_fakta", None)
                
                # Gunakan id_afdeling langsung jika dikirim dari sheet, jika tidak cari berdasarkan kebun & afdeling
                id_afdeling = getattr(row_data, "id_afdeling", None)
                if not id_afdeling:
                    kebun_val = getattr(row_data, "kebun", None)
                    afdeling_val = getattr(row_data, "afdeling", None)
                    if kebun_val and afdeling_val:
                        id_afdeling = get_afdeling_id(db, kebun_val, afdeling_val)
                
                if not id_afdeling:
                    errors.append(f"Baris {row_num}: Kolom id_afdeling kosong atau tidak valid.")
                    continue
                
                # Cek apakah id_afdeling terdaftar di database untuk mencegah ForeignKeyViolation
                afd_exists = db.query(DimAfdeling).filter(DimAfdeling.id_afdeling == id_afdeling).first()
                if not afd_exists:
                    errors.append(f"Baris {row_num}: ID Afdeling '{id_afdeling}' tidak ditemukan di database.")
                    continue

                # Konversi dan defaultkan nilai jika None untuk mencegah error NOT NULL constraint di DB
                target_ton = row_data.target_harian_ton if row_data.target_harian_ton is not None else 0.0
                prod_ton = row_data.produksi_aktual_ton if row_data.produksi_aktual_ton is not None else 0.0
                pemanen_hk = int(round(row_data.jumlah_pemanen_hk)) if row_data.jumlah_pemanen_hk is not None else 0
                hujan_mm = row_data.curah_hujan_mm if row_data.curah_hujan_mm is not None else 0.0
                rendemen = row_data.rendemen_persen if row_data.rendemen_persen is not None else 0.0

                record_exists = False
                if row_id:
                    existing = db.query(FactProduksiHarian).filter(FactProduksiHarian.id_fakta == row_id).first()
                    if existing:
                        existing.tanggal = row_data.tanggal
                        existing.id_afdeling = id_afdeling
                        existing.target_harian_ton = target_ton
                        existing.produksi_aktual_ton = prod_ton
                        existing.jumlah_pemanen_hk = pemanen_hk
                        existing.curah_hujan_mm = hujan_mm
                        existing.rendemen_persen = rendemen
                        db.flush()
                        success_ids.append(row_id)
                        success_count += 1
                        record_exists = True

                if not record_exists:
                    # Lakukan UPSERT ke fact_produksi_harian
                    stmt = insert(FactProduksiHarian).values(
                        tanggal=row_data.tanggal,
                        id_afdeling=id_afdeling,
                        target_harian_ton=target_ton,
                        produksi_aktual_ton=prod_ton,
                        jumlah_pemanen_hk=pemanen_hk,
                        curah_hujan_mm=hujan_mm,
                        rendemen_persen=rendemen
                    )
                    stmt = stmt.on_conflict_do_update(
                        constraint="uq_produksi_afdeling_tanggal",
                        set_={
                            "target_harian_ton": stmt.excluded.target_harian_ton,
                            "produksi_aktual_ton": stmt.excluded.produksi_aktual_ton,
                            "jumlah_pemanen_hk": stmt.excluded.jumlah_pemanen_hk,
                            "curah_hujan_mm": stmt.excluded.curah_hujan_mm,
                            "rendemen_persen": stmt.excluded.rendemen_persen
                        }
                    )
                    stmt = stmt.returning(FactProduksiHarian.id_fakta)
                    res = db.execute(stmt)
                    new_id = res.scalar()
                    success_ids.append(new_id)
                    success_count += 1

            # 2. PROSES PEMELIHARAAN HARIAN
            elif sheet_type == "pemeliharaan_harian":
                row_data = PemeliharaanHarianRow(**raw_row)
                row_id = getattr(row_data, "id_fakta", None)
                
                # Gunakan blok_id langsung jika ada di sheet, jika tidak lakukan lookup
                blok_id = getattr(row_data, "blok_id", None)
                if not blok_id:
                    blok_id = get_blok_id(db, row_data.kebun, row_data.afdeling, row_data.no_polygon, row_data.kode_blok)
                if not blok_id:
                    errors.append(f"Baris {row_num}: Blok dengan Polygon '{row_data.no_polygon}' / Kode Blok '{row_data.kode_blok}' di Kebun '{row_data.kebun}' tidak ditemukan di tabel blok_kebun.")
                    continue
                
                # Cek apakah blok_id terdaftar di database untuk mencegah ForeignKeyViolation
                blok_exists = db.query(BlokKebun).filter(BlokKebun.id == blok_id).first()
                if not blok_exists:
                    errors.append(f"Baris {row_num}: Blok ID '{blok_id}' tidak ditemukan di tabel blok_kebun.")
                    continue

                # Konversi tenaga_kerja secara aman (handle string non-angka seperti 'pribadi')
                tenaga_kerja_val = None
                raw_tk = getattr(row_data, "tenaga_kerja", None)
                if raw_tk is not None and str(raw_tk).strip() != "":
                    try:
                        tenaga_kerja_val = int(round(float(str(raw_tk).strip())))
                    except ValueError:
                        tenaga_kerja_val = None

                record_exists = False
                if row_id:
                    existing = db.query(FactPemeliharaanHarian).filter(FactPemeliharaanHarian.id == row_id).first()
                    if existing:
                        existing.blok_id = blok_id
                        existing.tanggal = row_data.tanggal
                        existing.jenis_kegiatan = row_data.jenis_kegiatan
                        existing.material = row_data.material
                        existing.dosis_aplikasi = row_data.dosis_aplikasi
                        existing.luas_aplikasi = row_data.luas_aplikasi
                        existing.tenaga_kerja = tenaga_kerja_val
                        existing.keterangan = row_data.keterangan
                        db.flush()
                        success_ids.append(row_id)
                        success_count += 1
                        record_exists = True

                if not record_exists:
                    # Lakukan UPSERT ke fact_pemeliharaan_harian
                    stmt = insert(FactPemeliharaanHarian).values(
                        blok_id=blok_id,
                        tanggal=row_data.tanggal,
                        jenis_kegiatan=row_data.jenis_kegiatan,
                        material=row_data.material,
                        dosis_aplikasi=row_data.dosis_aplikasi,
                        luas_aplikasi=row_data.luas_aplikasi,
                        tenaga_kerja=tenaga_kerja_val,
                        keterangan=row_data.keterangan
                    )
                    stmt = stmt.on_conflict_do_update(
                        constraint="uq_pemeliharaan_blok_tanggal_kegiatan",
                        set_={
                            "material": stmt.excluded.material,
                            "dosis_aplikasi": stmt.excluded.dosis_aplikasi,
                            "luas_aplikasi": stmt.excluded.luas_aplikasi,
                            "tenaga_kerja": stmt.excluded.tenaga_kerja,
                            "keterangan": stmt.excluded.keterangan,
                            "updated_at": stmt.excluded.updated_at
                        }
                    )
                    stmt = stmt.returning(FactPemeliharaanHarian.id)
                    res = db.execute(stmt)
                    new_id = res.scalar()
                    success_ids.append(new_id)
                    success_count += 1

            # 3. PROSES PEMUPUKAN HARIAN
            elif sheet_type == "pemupukan_harian":
                row_data = PemupukanHarianRow(**raw_row)
                row_id = getattr(row_data, "id_fakta", None)
                
                # Gunakan blok_id langsung jika ada di sheet, jika tidak lakukan lookup
                blok_id = getattr(row_data, "blok_id", None)
                if not blok_id:
                    blok_id = get_blok_id(db, row_data.kebun, row_data.afdeling, row_data.no_polygon, row_data.kode_blok)
                if not blok_id:
                    errors.append(f"Baris {row_num}: Blok dengan Polygon '{row_data.no_polygon}' / Kode Blok '{row_data.kode_blok}' di Kebun '{row_data.kebun}' tidak ditemukan di tabel blok_kebun.")
                    continue
                
                # Cek apakah blok_id terdaftar di database untuk mencegah ForeignKeyViolation
                blok_exists = db.query(BlokKebun).filter(BlokKebun.id == blok_id).first()
                if not blok_exists:
                    errors.append(f"Baris {row_num}: Blok ID '{blok_id}' tidak ditemukan di tabel blok_kebun.")
                    continue

                # Konversi tenaga_kerja secara aman
                tenaga_kerja_val = None
                raw_tk = getattr(row_data, "tenaga_kerja", None)
                if raw_tk is not None and str(raw_tk).strip() != "":
                    try:
                        tenaga_kerja_val = int(round(float(str(raw_tk).strip())))
                    except ValueError:
                        tenaga_kerja_val = None

                record_exists = False
                if row_id:
                    existing = db.query(FactPemupukanHarian).filter(FactPemupukanHarian.id == row_id).first()
                    if existing:
                        existing.blok_id = blok_id
                        existing.tanggal = row_data.tanggal
                        existing.jenis_pupuk = row_data.jenis_pupuk
                        existing.jumlah_pupuk = row_data.jumlah_pupuk
                        existing.luas_aplikasi = row_data.luas_aplikasi
                        existing.tenaga_kerja = tenaga_kerja_val
                        existing.keterangan = row_data.keterangan
                        db.flush()
                        success_ids.append(row_id)
                        success_count += 1
                        record_exists = True

                if not record_exists:
                    # Lakukan UPSERT ke fact_pemupukan_harian
                    stmt = insert(FactPemupukanHarian).values(
                        blok_id=blok_id,
                        tanggal=row_data.tanggal,
                        jenis_pupuk=row_data.jenis_pupuk,
                        jumlah_pupuk=row_data.jumlah_pupuk,
                        luas_aplikasi=row_data.luas_aplikasi,
                        tenaga_kerja=tenaga_kerja_val,
                        keterangan=row_data.keterangan
                    )
                    stmt = stmt.on_conflict_do_update(
                        constraint="uq_pemupukan_blok_tanggal_pupuk",
                        set_={
                            "jumlah_pupuk": stmt.excluded.jumlah_pupuk,
                            "luas_aplikasi": stmt.excluded.luas_aplikasi,
                            "tenaga_kerja": stmt.excluded.tenaga_kerja,
                            "keterangan": stmt.excluded.keterangan,
                            "updated_at": stmt.excluded.updated_at
                        }
                    )
                    stmt = stmt.returning(FactPemupukanHarian.id)
                    res = db.execute(stmt)
                    new_id = res.scalar()
                    success_ids.append(new_id)
                    success_count += 1

            else:
                errors.append(f"Baris {row_num}: Tipe sheet '{sheet_type}' tidak dikenali.")

        except Exception as e:
            parsed_str = "None"
            if 'row_data' in locals():
                try:
                    parsed_str = str(row_data.dict())
                except Exception:
                    pass
            # Ambil codepoint dari kunci-kunci input untuk melacak karakter tersembunyi
            key_codepoints = {k: [ord(c) for c in k] for k in raw_row.keys()}
            errors.append(f"Baris {row_num}: Kesalahan pemrosesan. Detail: {str(e)}. Data baris: {raw_row}. Parsed: {parsed_str}. Key codepoints: {key_codepoints}")

    # Commit seluruh transaksi jika tidak ada error fatal
    if success_count > 0:
        db.commit()

    return {
        "status": "success" if not errors else "partial_success",
        "processed": len(rows),
        "inserted_updated": success_count,
        "row_ids": list(success_ids),
        "errors": list(errors),
        "results": results
    }


@router.post("/delete", summary="Menghapus data baris tertentu berdasarkan ID")
def delete_records(
    payload: DeleteRequestPayload,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key)
):
    """Menghapus data harian dari database berdasarkan list ID yang dikirim."""
    sheet_type = payload.sheet_type
    ids = payload.ids

    if not ids:
        return {"status": "success", "deleted_count": 0, "message": "Tidak ada ID yang diberikan."}

    deleted_count = 0
    try:
        if sheet_type == "produksi_harian":
            deleted_count = db.query(FactProduksiHarian).filter(FactProduksiHarian.id_fakta.in_(ids)).delete(synchronize_session=False)
        elif sheet_type == "pemeliharaan_harian":
            deleted_count = db.query(FactPemeliharaanHarian).filter(FactPemeliharaanHarian.id.in_(ids)).delete(synchronize_session=False)
        elif sheet_type == "pemupukan_harian":
            deleted_count = db.query(FactPemupukanHarian).filter(FactPemupukanHarian.id.in_(ids)).delete(synchronize_session=False)
        else:
            raise HTTPException(status_code=400, detail=f"Tipe sheet '{sheet_type}' tidak dikenali.")

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Gagal menghapus data. Detail: {str(e)}"
        )

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "message": f"Berhasil menghapus {deleted_count} data dari tabel {sheet_type}."
    }

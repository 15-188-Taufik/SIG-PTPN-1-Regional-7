from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any
from datetime import date


class BaseSyncRow(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def coerce_strings(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Kolom-kolom teks yang perlu dipastikan bertipe string (meskipun dikirim angka oleh Google Sheets)
            string_fields = ["kebun", "afdeling", "no_polygon", "kode_blok", "jenis_kegiatan", "material", "keterangan", "jenis_pupuk"]
            for field in string_fields:
                if field in data and data[field] is not None:
                    val = data[field]
                    if isinstance(val, (int, float)):
                        if isinstance(val, float) and val.is_integer():
                            data[field] = str(int(val))
                        else:
                            data[field] = str(val)
        return data

    class Config:
        populate_by_name = True


class ProduksiHarianRow(BaseSyncRow):
    id_fakta: Optional[int] = Field(None, alias="id_fakta")
    tanggal: date
    id_afdeling: Optional[int] = None
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    target_harian_ton: Optional[float] = Field(None, alias="target_harian_ton")
    produksi_aktual_ton: Optional[float] = Field(None, alias="produksi_aktual_ton")
    jumlah_pemanen_hk: Optional[float] = Field(None, alias="jumlah_pemanen_hk")
    curah_hujan_mm: Optional[float] = Field(None, alias="curah_hujan_mm")
    rendemen_persen: Optional[float] = Field(None, alias="rendemen_persen")


class PemeliharaanHarianRow(BaseSyncRow):
    id_fakta: Optional[int] = Field(None, alias="id_fakta")
    tanggal: date
    blok_id: Optional[int] = Field(None, alias="blok_id")
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    no_polygon: Optional[str] = Field(None, alias="no_polygon")
    kode_blok: Optional[str] = Field(None, alias="kode_blok")
    jenis_kegiatan: str = Field(..., alias="jenis_kegiatan")
    material: Optional[str] = Field(None, alias="material")
    dosis_aplikasi: Optional[float] = Field(0.0, alias="dosis_aplikasi")
    luas_aplikasi: Optional[float] = Field(0.0, alias="luas_aplikasi")
    tenaga_kerja: Optional[Any] = Field(None, alias="tenaga_kerja")
    keterangan: Optional[str] = Field(None, alias="keterangan")


class PemupukanHarianRow(BaseSyncRow):
    id_fakta: Optional[int] = Field(None, alias="id_fakta")
    tanggal: date
    blok_id: Optional[int] = Field(None, alias="blok_id")
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    no_polygon: Optional[str] = Field(None, alias="no_polygon")
    kode_blok: Optional[str] = Field(None, alias="kode_blok")
    jenis_pupuk: str = Field(..., alias="jenis_pupuk")
    jumlah_pupuk: float = Field(..., alias="jumlah_pupuk")
    luas_aplikasi: Optional[float] = Field(0.0, alias="luas_aplikasi")
    tenaga_kerja: Optional[Any] = Field(None, alias="tenaga_kerja")
    keterangan: Optional[str] = Field(None, alias="keterangan")


class SyncRequestPayload(BaseModel):
    sheet_type: str = Field(..., description="Jenis data: produksi_harian, pemeliharaan_harian, atau pemupukan_harian")
    rows: List[dict] = Field(..., description="List data baris mentah dari Google Sheets")


class DeleteRequestPayload(BaseModel):
    sheet_type: str = Field(..., description="Jenis data: produksi_harian, pemeliharaan_harian, atau pemupukan_harian")
    ids: List[int] = Field(..., description="List ID data yang akan dihapus")

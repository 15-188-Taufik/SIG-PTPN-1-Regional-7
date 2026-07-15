from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import date


class ProduksiHarianRow(BaseModel):
    tanggal: date
    id_afdeling: Optional[int] = None
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    target_harian_ton: Optional[float] = Field(None, alias="target_harian_ton")
    produksi_aktual_ton: Optional[float] = Field(None, alias="produksi_aktual_ton")
    jumlah_pemanen_hk: Optional[float] = Field(None, alias="jumlah_pemanen_hk")
    curah_hujan_mm: Optional[float] = Field(None, alias="curah_hujan_mm")
    rendemen_persen: Optional[float] = Field(None, alias="rendemen_persen")

    class Config:
        populate_by_name = True


class PemeliharaanHarianRow(BaseModel):
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

    class Config:
        populate_by_name = True


class PemupukanHarianRow(BaseModel):
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

    class Config:
        populate_by_name = True


class SyncRequestPayload(BaseModel):
    sheet_type: str = Field(..., description="Jenis data: produksi_harian, pemeliharaan_harian, atau pemupukan_harian")
    rows: List[dict] = Field(..., description="List data baris mentah dari Google Sheets")

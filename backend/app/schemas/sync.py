from pydantic import BaseModel, Field
from typing import List, Optional
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
    kebun: str
    afdeling: str
    no_polygon: Optional[str] = Field(None, alias="No Polygon")
    kode_blok: Optional[str] = Field(None, alias="Kode Blok")
    jenis_kegiatan: str = Field(..., alias="Jenis Kegiatan")
    material: Optional[str] = Field(None, alias="Material")
    dosis_aplikasi: Optional[float] = Field(0.0, alias="Dosis")
    luas_aplikasi: Optional[float] = Field(0.0, alias="Luas Aplikasi (Ha)")
    tenaga_kerja: Optional[int] = Field(0, alias="Tenaga Kerja (HK)")
    keterangan: Optional[str] = Field(None, alias="Keterangan")

    class Config:
        populate_by_name = True


class PemupukanHarianRow(BaseModel):
    tanggal: date
    kebun: str
    afdeling: str
    no_polygon: Optional[str] = Field(None, alias="No Polygon")
    kode_blok: Optional[str] = Field(None, alias="Kode Blok")
    jenis_pupuk: str = Field(..., alias="Jenis Pupuk")
    jumlah_pupuk: float = Field(..., alias="Jumlah Pupuk (Kg)")
    luas_aplikasi: Optional[float] = Field(0.0, alias="Luas Aplikasi (Ha)")
    tenaga_kerja: Optional[int] = Field(0, alias="Tenaga Kerja (HK)")
    keterangan: Optional[str] = Field(None, alias="Keterangan")

    class Config:
        populate_by_name = True


class SyncRequestPayload(BaseModel):
    sheet_type: str = Field(..., description="Jenis data: produksi_harian, pemeliharaan_harian, atau pemupukan_harian")
    rows: List[dict] = Field(..., description="List data baris mentah dari Google Sheets")

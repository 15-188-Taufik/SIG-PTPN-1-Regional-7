from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class PemeliharaanHarianBase(BaseModel):
    blok_id: int = Field(..., description="ID Blok Kebun")
    tanggal: date = Field(..., description="Tanggal kegiatan (YYYY-MM-DD)")
    jenis_kegiatan: str = Field(..., description="Jenis kegiatan pemeliharaan")
    material: Optional[str] = None
    dosis_aplikasi: Optional[float] = None
    luas_aplikasi: Optional[float] = None
    tenaga_kerja: Optional[int] = None
    keterangan: Optional[str] = None


class PemeliharaanHarianCreate(PemeliharaanHarianBase):
    pass


class PemeliharaanHarianUpdate(BaseModel):
    blok_id: Optional[int] = None
    tanggal: Optional[date] = None
    jenis_kegiatan: Optional[str] = None
    material: Optional[str] = None
    dosis_aplikasi: Optional[float] = None
    luas_aplikasi: Optional[float] = None
    tenaga_kerja: Optional[int] = None
    keterangan: Optional[str] = None


class PemeliharaanHarianResponse(PemeliharaanHarianBase):
    id: int
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    kode_blok: Optional[str] = None

    class Config:
        from_attributes = True


class PemupukanHarianBase(BaseModel):
    blok_id: int = Field(..., description="ID Blok Kebun")
    tanggal: date = Field(..., description="Tanggal pemupukan (YYYY-MM-DD)")
    jenis_pupuk: str = Field(..., description="Jenis pupuk")
    jumlah_pupuk: float = Field(..., description="Jumlah pupuk (Kg/Ton)")
    luas_aplikasi: Optional[float] = None
    tenaga_kerja: Optional[int] = None
    keterangan: Optional[str] = None


class PemupukanHarianCreate(PemupukanHarianBase):
    pass


class PemupukanHarianUpdate(BaseModel):
    blok_id: Optional[int] = None
    tanggal: Optional[date] = None
    jenis_pupuk: Optional[str] = None
    jumlah_pupuk: Optional[float] = None
    luas_aplikasi: Optional[float] = None
    tenaga_kerja: Optional[int] = None
    keterangan: Optional[str] = None


class PemupukanHarianResponse(PemupukanHarianBase):
    id: int
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    kode_blok: Optional[str] = None

    class Config:
        from_attributes = True


class PemeliharaanListResponse(BaseModel):
    total: int
    total_luas: float
    total_dosis: float
    total_hk: int
    items: List[PemeliharaanHarianResponse]


class PemupukanListResponse(BaseModel):
    total: int
    total_luas: float
    total_jumlah_pupuk: float
    total_hk: int
    items: List[PemupukanHarianResponse]


# ----------------------------------------------------
# PRODUKSI HARIAN SCHEMAS
# ----------------------------------------------------

class ProduksiHarianBase(BaseModel):
    tanggal: date = Field(..., description="Tanggal produksi (YYYY-MM-DD)")
    id_afdeling: Optional[int] = Field(None, description="ID Afdeling")
    kebun: Optional[str] = Field(None, description="Nama kebun/unit")
    afdeling: Optional[str] = Field(None, description="Nama afdeling")
    target_harian_ton: Optional[float] = Field(0.0, description="Target harian dalam Ton")
    produksi_aktual_ton: Optional[float] = Field(0.0, description="Produksi aktual dalam Ton")
    jumlah_pemanen_hk: Optional[int] = Field(0, description="Jumlah pemanen dalam HK")
    curah_hujan_mm: Optional[float] = Field(0.0, description="Curah hujan dalam mm")
    rendemen_persen: Optional[float] = Field(0.0, description="Rendemen dalam %")


class ProduksiHarianCreate(ProduksiHarianBase):
    pass


class ProduksiHarianUpdate(BaseModel):
    tanggal: Optional[date] = None
    id_afdeling: Optional[int] = None
    kebun: Optional[str] = None
    afdeling: Optional[str] = None
    target_harian_ton: Optional[float] = None
    produksi_aktual_ton: Optional[float] = None
    jumlah_pemanen_hk: Optional[int] = None
    curah_hujan_mm: Optional[float] = None
    rendemen_persen: Optional[float] = None


class ProduksiHarianResponse(ProduksiHarianBase):
    id_fakta: int

    class Config:
        from_attributes = True


class ProduksiListResponse(BaseModel):
    total: int
    total_target: float
    total_aktual: float
    capaian_persen: float
    total_pemanen: int
    items: List[ProduksiHarianResponse]

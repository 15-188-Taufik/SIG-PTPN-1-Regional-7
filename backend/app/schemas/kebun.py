from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class BlokProperties(BaseModel):
    id: int
    kebun: Optional[str] = None
    kode_blok: Optional[str] = None
    no_polygon: Optional[str] = None
    afdeling: Optional[str] = None
    komoditi: Optional[str] = None
    status: Optional[str] = None
    thn_tanam: Optional[str] = None
    varietas: Optional[str] = None
    kabupaten: Optional[str] = None
    kecamatan: Optional[str] = None
    desa: Optional[str] = None
    l_gis: Optional[float] = None
    l_rkap: Optional[float] = None
    l_hgu: Optional[float] = None
    protas_21: Optional[float] = None
    protas_22: Optional[float] = None
    protas_23: Optional[float] = None
    protas_24: Optional[float] = None
    populasi: Optional[int] = None
    pica: Optional[str] = None
    alas_hak: Optional[str] = None
    status_kpm: Optional[str] = None


class KebunStats(BaseModel):
    kebun: Optional[str] = None
    jumlah_blok: int
    total_luas: float


class KomoditiStats(BaseModel):
    komoditi: Optional[str] = None
    jumlah_blok: int
    total_luas: float


class StatsResponse(BaseModel):
    total_blok: int
    total_luas_gis: float
    total_luas_rkap: float
    per_kebun: List[Dict[str, Any]]
    per_komoditi: List[Dict[str, Any]]

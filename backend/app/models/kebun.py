from sqlalchemy import Column, Integer, Float, Text, TIMESTAMP
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.database import Base


class BlokKebun(Base):
    __tablename__ = "blok_kebun"

    id = Column(Integer, primary_key=True, index=True)
    # Identitas blok
    kebun = Column(Text, nullable=False, index=True)
    kode_blok = Column(Text)
    no_polygon = Column(Text, unique=True)
    no_aset = Column(Text)
    afdeling = Column(Text, index=True)
    # Komoditi & budidaya
    komoditi = Column(Text, index=True)
    status = Column(Text, index=True)  # TM, TBM, dll
    thn_tanam = Column(Text)
    varietas = Column(Text)
    # Lokasi administratif
    kabupaten = Column(Text)
    kecamatan = Column(Text)
    desa = Column(Text)
    # Luas (hektar)
    l_gis = Column(Float)
    l_rkap = Column(Float)
    l_hgu = Column(Float)
    # Produksi (kg/tahun)
    protas_21 = Column(Float)
    protas_22 = Column(Float)
    protas_23 = Column(Float)
    protas_24 = Column(Float)
    # Lainnya
    populasi = Column(Integer)
    pica = Column(Text)
    alas_hak = Column(Text)
    kat_als_hk = Column(Text)
    status_kpm = Column(Text)
    # Geometri spasial
    geom = Column(Geometry("MULTIPOLYGON", srid=4326, spatial_index=True), nullable=False)
    # Metadata
    source_file = Column(Text)
    imported_at = Column(TIMESTAMP, server_default=func.now())

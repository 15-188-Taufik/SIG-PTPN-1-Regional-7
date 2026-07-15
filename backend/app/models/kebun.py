from sqlalchemy import Column, Integer, Float, Text, TIMESTAMP, Date, ForeignKey
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


class DimUnit(Base):
    __tablename__ = "dim_unit"

    id_unit = Column(Integer, primary_key=True, index=True)
    nama_unit = Column(Text, nullable=False)
    komoditas = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)


class DimAfdeling(Base):
    __tablename__ = "dim_afdeling"

    id_afdeling = Column(Integer, primary_key=True, index=True)
    id_unit = Column(Integer, ForeignKey("dim_unit.id_unit"), nullable=False)
    nama_afdeling = Column(Text, nullable=False)


class FactProduksiHarian(Base):
    __tablename__ = "fact_produksi_harian"

    id_fakta = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanggal = Column(Date, nullable=False, index=True)
    id_afdeling = Column(Integer, ForeignKey("dim_afdeling.id_afdeling"), nullable=False, index=True)
    target_harian_ton = Column(Float)
    produksi_aktual_ton = Column(Float)
    jumlah_pemanen_hk = Column(Integer)
    curah_hujan_mm = Column(Float)
    rendemen_persen = Column(Float)


class FactPemeliharaanHarian(Base):
    __tablename__ = "fact_pemeliharaan_harian"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    blok_id = Column(Integer, ForeignKey("blok_kebun.id", ondelete="CASCADE"), nullable=False)
    tanggal = Column(Date, nullable=False, index=True)
    jenis_kegiatan = Column(Text, nullable=False)
    material = Column(Text)
    dosis_aplikasi = Column(Float)
    luas_aplikasi = Column(Float)
    tenaga_kerja = Column(Integer)
    keterangan = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class FactPemupukanHarian(Base):
    __tablename__ = "fact_pemupukan_harian"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    blok_id = Column(Integer, ForeignKey("blok_kebun.id", ondelete="CASCADE"), nullable=False)
    tanggal = Column(Date, nullable=False, index=True)
    jenis_pupuk = Column(Text, nullable=False)
    jumlah_pupuk = Column(Float, nullable=False)
    luas_aplikasi = Column(Float)
    tenaga_kerja = Column(Integer)
    keterangan = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

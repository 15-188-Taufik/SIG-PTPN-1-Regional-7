from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import date

from app.database import get_db, is_mock
from app.models.kebun import BlokKebun, FactPemeliharaanHarian, FactPemupukanHarian, FactProduksiHarian, DimAfdeling, DimUnit
from app.core.deps import get_current_user
from app.schemas.kegiatan import (
    PemeliharaanHarianCreate,
    PemeliharaanHarianUpdate,
    PemeliharaanHarianResponse,
    PemeliharaanListResponse,
    PemupukanHarianCreate,
    PemupukanHarianUpdate,
    PemupukanHarianResponse,
    PemupukanListResponse,
    ProduksiHarianCreate,
    ProduksiHarianUpdate,
    ProduksiHarianResponse,
    ProduksiListResponse,
)

router = APIRouter(prefix="/kegiatan", tags=["Kegiatan Harian"])


# ----------------------------------------------------
# PEMELIHARAAN HARIAN ENDPOINTS
# ----------------------------------------------------

@router.get("/pemeliharaan", response_model=PemeliharaanListResponse, summary="Ambil daftar pemeliharaan harian dengan filter")
def get_pemeliharaan(
    kebun: Optional[str] = Query(None, description="Filter nama kebun/unit"),
    afdeling: Optional[str] = Query(None, description="Filter afdeling"),
    start_date: Optional[date] = Query(None, description="Tanggal mulai (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Pencarian kata kunci"),
    sort_order: Optional[str] = Query("desc", description="Urutan tanggal: desc (terbaru ke terlama) atau asc (terlama ke terbaru)"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        return PemeliharaanListResponse(total=0, total_luas=0.0, total_dosis=0.0, total_hk=0, items=[])

    query = db.query(
        FactPemeliharaanHarian,
        BlokKebun.kebun,
        BlokKebun.afdeling,
        BlokKebun.kode_blok
    ).join(BlokKebun, FactPemeliharaanHarian.blok_id == BlokKebun.id)

    if kebun:
        query = query.filter(BlokKebun.kebun.ilike(f"%{kebun}%"))
    if afdeling:
        query = query.filter(BlokKebun.afdeling.ilike(f"%{afdeling}%"))
    if start_date:
        query = query.filter(FactPemeliharaanHarian.tanggal >= start_date)
    if end_date:
        query = query.filter(FactPemeliharaanHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                FactPemeliharaanHarian.jenis_kegiatan.ilike(search_fmt),
                FactPemeliharaanHarian.material.ilike(search_fmt),
                FactPemeliharaanHarian.keterangan.ilike(search_fmt),
                BlokKebun.kode_blok.ilike(search_fmt),
            )
        )

    # Calculate summary metrics before pagination
    total_count = query.count()
    
    # Metrics aggregations
    metrics_query = db.query(
        func.coalesce(func.sum(FactPemeliharaanHarian.luas_aplikasi), 0.0).label("sum_luas"),
        func.coalesce(func.sum(FactPemeliharaanHarian.dosis_aplikasi), 0.0).label("sum_dosis"),
        func.coalesce(func.sum(FactPemeliharaanHarian.tenaga_kerja), 0).label("sum_hk")
    ).select_from(FactPemeliharaanHarian).join(BlokKebun, FactPemeliharaanHarian.blok_id == BlokKebun.id)

    if kebun: metrics_query = metrics_query.filter(BlokKebun.kebun.ilike(f"%{kebun}%"))
    if afdeling: metrics_query = metrics_query.filter(BlokKebun.afdeling.ilike(f"%{afdeling}%"))
    if start_date: metrics_query = metrics_query.filter(FactPemeliharaanHarian.tanggal >= start_date)
    if end_date: metrics_query = metrics_query.filter(FactPemeliharaanHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        metrics_query = metrics_query.filter(
            or_(
                FactPemeliharaanHarian.jenis_kegiatan.ilike(search_fmt),
                FactPemeliharaanHarian.material.ilike(search_fmt),
                FactPemeliharaanHarian.keterangan.ilike(search_fmt),
                BlokKebun.kode_blok.ilike(search_fmt),
            )
        )
    
    metrics = metrics_query.first()
    total_luas = float(metrics[0]) if metrics else 0.0
    total_dosis = float(metrics[1]) if metrics else 0.0
    total_hk = int(metrics[2]) if metrics else 0

    order_clause = FactPemeliharaanHarian.tanggal.asc() if (sort_order and sort_order.lower() == 'asc') else FactPemeliharaanHarian.tanggal.desc()
    results = query.order_by(order_clause, FactPemeliharaanHarian.id.desc()).offset(offset).limit(limit).all()

    items = []
    for row, k_nama, a_nama, k_blok in results:
        item = PemeliharaanHarianResponse(
            id=row.id,
            blok_id=row.blok_id,
            tanggal=row.tanggal,
            jenis_kegiatan=row.jenis_kegiatan,
            material=row.material,
            dosis_aplikasi=row.dosis_aplikasi,
            luas_aplikasi=row.luas_aplikasi,
            tenaga_kerja=row.tenaga_kerja,
            keterangan=row.keterangan,
            kebun=k_nama,
            afdeling=a_nama,
            kode_blok=k_blok
        )
        items.append(item)

    return PemeliharaanListResponse(
        total=total_count,
        total_luas=round(total_luas, 2),
        total_dosis=round(total_dosis, 2),
        total_hk=total_hk,
        items=items
    )


@router.post("/pemeliharaan", response_model=PemeliharaanHarianResponse, status_code=status.HTTP_201_CREATED)
def create_pemeliharaan(
    payload: PemeliharaanHarianCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    blok = db.query(BlokKebun).filter(BlokKebun.id == payload.blok_id).first()
    if not blok:
        raise HTTPException(status_code=404, detail=f"Blok ID {payload.blok_id} tidak ditemukan")

    item = FactPemeliharaanHarian(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    return PemeliharaanHarianResponse(
        id=item.id,
        blok_id=item.blok_id,
        tanggal=item.tanggal,
        jenis_kegiatan=item.jenis_kegiatan,
        material=item.material,
        dosis_aplikasi=item.dosis_aplikasi,
        luas_aplikasi=item.luas_aplikasi,
        tenaga_kerja=item.tenaga_kerja,
        keterangan=item.keterangan,
        kebun=blok.kebun,
        afdeling=blok.afdeling,
        kode_blok=blok.kode_blok
    )


@router.put("/pemeliharaan/{id}", response_model=PemeliharaanHarianResponse)
def update_pemeliharaan(
    id: int,
    payload: PemeliharaanHarianUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactPemeliharaanHarian).filter(FactPemeliharaanHarian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan pemeliharaan ID {id} tidak ditemukan")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    blok = db.query(BlokKebun).filter(BlokKebun.id == item.blok_id).first()
    return PemeliharaanHarianResponse(
        id=item.id,
        blok_id=item.blok_id,
        tanggal=item.tanggal,
        jenis_kegiatan=item.jenis_kegiatan,
        material=item.material,
        dosis_aplikasi=item.dosis_aplikasi,
        luas_aplikasi=item.luas_aplikasi,
        tenaga_kerja=item.tenaga_kerja,
        keterangan=item.keterangan,
        kebun=blok.kebun if blok else None,
        afdeling=blok.afdeling if blok else None,
        kode_blok=blok.kode_blok if blok else None
    )


@router.delete("/pemeliharaan/{id}")
def delete_pemeliharaan(
    id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactPemeliharaanHarian).filter(FactPemeliharaanHarian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan pemeliharaan ID {id} tidak ditemukan")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Catatan pemeliharaan ID {id} berhasil dihapus"}


# ----------------------------------------------------
# PEMUPUKAN HARIAN ENDPOINTS
# ----------------------------------------------------

@router.get("/pemupukan", response_model=PemupukanListResponse, summary="Ambil daftar pemupukan harian dengan filter")
def get_pemupukan(
    kebun: Optional[str] = Query(None, description="Filter nama kebun/unit"),
    afdeling: Optional[str] = Query(None, description="Filter afdeling"),
    start_date: Optional[date] = Query(None, description="Tanggal mulai (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Pencarian kata kunci"),
    sort_order: Optional[str] = Query("desc", description="Urutan tanggal: desc (terbaru ke terlama) atau asc (terlama ke terbaru)"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        return PemupukanListResponse(total=0, total_luas=0.0, total_jumlah_pupuk=0.0, total_hk=0, items=[])

    query = db.query(
        FactPemupukanHarian,
        BlokKebun.kebun,
        BlokKebun.afdeling,
        BlokKebun.kode_blok
    ).join(BlokKebun, FactPemupukanHarian.blok_id == BlokKebun.id)

    if kebun:
        query = query.filter(BlokKebun.kebun.ilike(f"%{kebun}%"))
    if afdeling:
        query = query.filter(BlokKebun.afdeling.ilike(f"%{afdeling}%"))
    if start_date:
        query = query.filter(FactPemupukanHarian.tanggal >= start_date)
    if end_date:
        query = query.filter(FactPemupukanHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                FactPemupukanHarian.jenis_pupuk.ilike(search_fmt),
                FactPemupukanHarian.keterangan.ilike(search_fmt),
                BlokKebun.kode_blok.ilike(search_fmt),
            )
        )

    total_count = query.count()

    metrics_query = db.query(
        func.coalesce(func.sum(FactPemupukanHarian.luas_aplikasi), 0.0).label("sum_luas"),
        func.coalesce(func.sum(FactPemupukanHarian.jumlah_pupuk), 0.0).label("sum_pupuk"),
        func.coalesce(func.sum(FactPemupukanHarian.tenaga_kerja), 0).label("sum_hk")
    ).select_from(FactPemupukanHarian).join(BlokKebun, FactPemupukanHarian.blok_id == BlokKebun.id)

    if kebun: metrics_query = metrics_query.filter(BlokKebun.kebun.ilike(f"%{kebun}%"))
    if afdeling: metrics_query = metrics_query.filter(BlokKebun.afdeling.ilike(f"%{afdeling}%"))
    if start_date: metrics_query = metrics_query.filter(FactPemupukanHarian.tanggal >= start_date)
    if end_date: metrics_query = metrics_query.filter(FactPemupukanHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        metrics_query = metrics_query.filter(
            or_(
                FactPemupukanHarian.jenis_pupuk.ilike(search_fmt),
                FactPemupukanHarian.keterangan.ilike(search_fmt),
                BlokKebun.kode_blok.ilike(search_fmt),
            )
        )

    metrics = metrics_query.first()
    total_luas = float(metrics[0]) if metrics else 0.0
    total_pupuk = float(metrics[1]) if metrics else 0.0
    total_hk = int(metrics[2]) if metrics else 0

    order_clause = FactPemupukanHarian.tanggal.asc() if (sort_order and sort_order.lower() == 'asc') else FactPemupukanHarian.tanggal.desc()
    results = query.order_by(order_clause, FactPemupukanHarian.id.desc()).offset(offset).limit(limit).all()

    items = []
    for row, k_nama, a_nama, k_blok in results:
        item = PemupukanHarianResponse(
            id=row.id,
            blok_id=row.blok_id,
            tanggal=row.tanggal,
            jenis_pupuk=row.jenis_pupuk,
            jumlah_pupuk=row.jumlah_pupuk,
            luas_aplikasi=row.luas_aplikasi,
            tenaga_kerja=row.tenaga_kerja,
            keterangan=row.keterangan,
            kebun=k_nama,
            afdeling=a_nama,
            kode_blok=k_blok
        )
        items.append(item)

    return PemupukanListResponse(
        total=total_count,
        total_luas=round(total_luas, 2),
        total_jumlah_pupuk=round(total_pupuk, 2),
        total_hk=total_hk,
        items=items
    )


@router.post("/pemupukan", response_model=PemupukanHarianResponse, status_code=status.HTTP_201_CREATED)
def create_pemupukan(
    payload: PemupukanHarianCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    blok = db.query(BlokKebun).filter(BlokKebun.id == payload.blok_id).first()
    if not blok:
        raise HTTPException(status_code=404, detail=f"Blok ID {payload.blok_id} tidak ditemukan")

    item = FactPemupukanHarian(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    return PemupukanHarianResponse(
        id=item.id,
        blok_id=item.blok_id,
        tanggal=item.tanggal,
        jenis_pupuk=item.jenis_pupuk,
        jumlah_pupuk=item.jumlah_pupuk,
        luas_aplikasi=item.luas_aplikasi,
        tenaga_kerja=item.tenaga_kerja,
        keterangan=item.keterangan,
        kebun=blok.kebun,
        afdeling=blok.afdeling,
        kode_blok=blok.kode_blok
    )


@router.put("/pemupukan/{id}", response_model=PemupukanHarianResponse)
def update_pemupukan(
    id: int,
    payload: PemupukanHarianUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactPemupukanHarian).filter(FactPemupukanHarian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan pemupukan ID {id} tidak ditemukan")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    blok = db.query(BlokKebun).filter(BlokKebun.id == item.blok_id).first()
    return PemupukanHarianResponse(
        id=item.id,
        blok_id=item.blok_id,
        tanggal=item.tanggal,
        jenis_pupuk=item.jenis_pupuk,
        jumlah_pupuk=item.jumlah_pupuk,
        luas_aplikasi=item.luas_aplikasi,
        tenaga_kerja=item.tenaga_kerja,
        keterangan=item.keterangan,
        kebun=blok.kebun if blok else None,
        afdeling=blok.afdeling if blok else None,
        kode_blok=blok.kode_blok if blok else None
    )


@router.delete("/pemupukan/{id}")
def delete_pemupukan(
    id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactPemupukanHarian).filter(FactPemupukanHarian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan pemupukan ID {id} tidak ditemukan")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Catatan pemupukan ID {id} berhasil dihapus"}


# ----------------------------------------------------
# PRODUKSI HARIAN ENDPOINTS
# ----------------------------------------------------

@router.get("/produksi", response_model=ProduksiListResponse, summary="Ambil daftar produksi harian dengan filter")
def get_produksi(
    kebun: Optional[str] = Query(None, description="Filter nama kebun/unit"),
    afdeling: Optional[str] = Query(None, description="Filter afdeling"),
    start_date: Optional[date] = Query(None, description="Tanggal mulai (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Tanggal akhir (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Pencarian kata kunci"),
    sort_order: Optional[str] = Query("desc", description="Urutan tanggal: desc (terbaru ke terlama) atau asc (terlama ke terbaru)"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        return ProduksiListResponse(total=0, total_target=0.0, total_aktual=0.0, capaian_persen=0.0, total_pemanen=0, items=[])

    query = db.query(
        FactProduksiHarian,
        DimUnit.nama_unit.label("kebun"),
        DimAfdeling.nama_afdeling.label("afdeling")
    ).join(DimAfdeling, FactProduksiHarian.id_afdeling == DimAfdeling.id_afdeling)\
     .join(DimUnit, DimAfdeling.id_unit == DimUnit.id_unit)

    if kebun:
        query = query.filter(DimUnit.nama_unit.ilike(f"%{kebun}%"))
    if afdeling:
        query = query.filter(DimAfdeling.nama_afdeling.ilike(f"%{afdeling}%"))
    if start_date:
        query = query.filter(FactProduksiHarian.tanggal >= start_date)
    if end_date:
        query = query.filter(FactProduksiHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                DimUnit.nama_unit.ilike(search_fmt),
                DimAfdeling.nama_afdeling.ilike(search_fmt),
            )
        )

    total_count = query.count()

    metrics_query = db.query(
        func.coalesce(func.sum(FactProduksiHarian.target_harian_ton), 0.0).label("sum_target"),
        func.coalesce(func.sum(FactProduksiHarian.produksi_aktual_ton), 0.0).label("sum_aktual"),
        func.coalesce(func.sum(FactProduksiHarian.jumlah_pemanen_hk), 0).label("sum_pemanen")
    ).select_from(FactProduksiHarian)\
     .join(DimAfdeling, FactProduksiHarian.id_afdeling == DimAfdeling.id_afdeling)\
     .join(DimUnit, DimAfdeling.id_unit == DimUnit.id_unit)

    if kebun: metrics_query = metrics_query.filter(DimUnit.nama_unit.ilike(f"%{kebun}%"))
    if afdeling: metrics_query = metrics_query.filter(DimAfdeling.nama_afdeling.ilike(f"%{afdeling}%"))
    if start_date: metrics_query = metrics_query.filter(FactProduksiHarian.tanggal >= start_date)
    if end_date: metrics_query = metrics_query.filter(FactProduksiHarian.tanggal <= end_date)
    if search:
        search_fmt = f"%{search}%"
        metrics_query = metrics_query.filter(
            or_(
                DimUnit.nama_unit.ilike(search_fmt),
                DimAfdeling.nama_afdeling.ilike(search_fmt),
            )
        )

    metrics = metrics_query.first()
    total_target = float(metrics[0]) if metrics else 0.0
    total_aktual = float(metrics[1]) if metrics else 0.0
    total_pemanen = int(metrics[2]) if metrics else 0
    capaian_persen = (total_aktual / total_target * 100.0) if total_target > 0 else 0.0

    order_clause = FactProduksiHarian.tanggal.asc() if (sort_order and sort_order.lower() == 'asc') else FactProduksiHarian.tanggal.desc()
    results = query.order_by(order_clause, FactProduksiHarian.id_fakta.desc()).offset(offset).limit(limit).all()

    items = []
    for row, k_nama, a_nama in results:
        item = ProduksiHarianResponse(
            id_fakta=row.id_fakta,
            tanggal=row.tanggal,
            id_afdeling=row.id_afdeling,
            kebun=k_nama,
            afdeling=a_nama,
            target_harian_ton=row.target_harian_ton or 0.0,
            produksi_aktual_ton=row.produksi_aktual_ton or 0.0,
            jumlah_pemanen_hk=row.jumlah_pemanen_hk or 0,
            curah_hujan_mm=row.curah_hujan_mm or 0.0,
            rendemen_persen=row.rendemen_persen or 0.0
        )
        items.append(item)

    return ProduksiListResponse(
        total=total_count,
        total_target=round(total_target, 2),
        total_aktual=round(total_aktual, 2),
        capaian_persen=round(capaian_persen, 1),
        total_pemanen=total_pemanen,
        items=items
    )


@router.post("/produksi", response_model=ProduksiHarianResponse, status_code=status.HTTP_201_CREATED)
def create_produksi(
    payload: ProduksiHarianCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    afd_id = payload.id_afdeling
    if not afd_id and payload.afdeling:
        afd_row = db.query(DimAfdeling).join(DimUnit, DimAfdeling.id_unit == DimUnit.id_unit)\
                    .filter(DimAfdeling.nama_afdeling.ilike(f"%{payload.afdeling}%")).first()
        if afd_row:
            afd_id = afd_row.id_afdeling
        else:
            afd_row_any = db.query(DimAfdeling).first()
            if afd_row_any: afd_id = afd_row_any.id_afdeling

    if not afd_id:
        afd_id = 1

    item = FactProduksiHarian(
        tanggal=payload.tanggal,
        id_afdeling=afd_id,
        target_harian_ton=payload.target_harian_ton,
        produksi_aktual_ton=payload.produksi_aktual_ton,
        jumlah_pemanen_hk=payload.jumlah_pemanen_hk,
        curah_hujan_mm=payload.curah_hujan_mm,
        rendemen_persen=payload.rendemen_persen
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    afd = db.query(DimAfdeling).filter(DimAfdeling.id_afdeling == item.id_afdeling).first()
    unit = db.query(DimUnit).filter(DimUnit.id_unit == afd.id_unit).first() if afd else None

    return ProduksiHarianResponse(
        id_fakta=item.id_fakta,
        tanggal=item.tanggal,
        id_afdeling=item.id_afdeling,
        kebun=unit.nama_unit if unit else payload.kebun,
        afdeling=afd.nama_afdeling if afd else payload.afdeling,
        target_harian_ton=item.target_harian_ton,
        produksi_aktual_ton=item.produksi_aktual_ton,
        jumlah_pemanen_hk=item.jumlah_pemanen_hk,
        curah_hujan_mm=item.curah_hujan_mm,
        rendemen_persen=item.rendemen_persen
    )


@router.put("/produksi/{id_fakta}", response_model=ProduksiHarianResponse)
def update_produksi(
    id_fakta: int,
    payload: ProduksiHarianUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactProduksiHarian).filter(FactProduksiHarian.id_fakta == id_fakta).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan produksi ID {id_fakta} tidak ditemukan")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(item, key):
            setattr(item, key, value)

    db.commit()
    db.refresh(item)

    afd = db.query(DimAfdeling).filter(DimAfdeling.id_afdeling == item.id_afdeling).first()
    unit = db.query(DimUnit).filter(DimUnit.id_unit == afd.id_unit).first() if afd else None

    return ProduksiHarianResponse(
        id_fakta=item.id_fakta,
        tanggal=item.tanggal,
        id_afdeling=item.id_afdeling,
        kebun=unit.nama_unit if unit else payload.kebun,
        afdeling=afd.nama_afdeling if afd else payload.afdeling,
        target_harian_ton=item.target_harian_ton,
        produksi_aktual_ton=item.produksi_aktual_ton,
        jumlah_pemanen_hk=item.jumlah_pemanen_hk,
        curah_hujan_mm=item.curah_hujan_mm,
        rendemen_persen=item.rendemen_persen
    )


@router.delete("/produksi/{id_fakta}")
def delete_produksi(
    id_fakta: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        raise HTTPException(status_code=400, detail="Database mode mock aktif")

    item = db.query(FactProduksiHarian).filter(FactProduksiHarian.id_fakta == id_fakta).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Catatan produksi ID {id_fakta} tidak ditemukan")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Catatan produksi ID {id_fakta} berhasil dihapus"}

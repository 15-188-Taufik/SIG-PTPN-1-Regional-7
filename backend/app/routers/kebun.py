from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
import json
from pathlib import Path

from app.database import get_db, is_mock
from app.models.kebun import BlokKebun
from app.core.deps import get_current_user

router = APIRouter(prefix="/kebun", tags=["Kebun"])


class GeoJSONFallback:
    _features: List[Dict[str, Any]] = []
    _loaded: bool = False

    @classmethod
    def load_all(cls):
        if cls._loaded:
            return
        geojson_dir = Path(__file__).resolve().parent.parent.parent.parent / "datas" / "LAMPUNG"
        features = []
        feature_id = 1
        for file in sorted(geojson_dir.glob("*.geojson")):
            try:
                with open(file, encoding="utf-8") as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    norm_props = {
                        "id": feature_id,
                        "kebun": props.get("Kebun") or props.get("kebun") or file.stem,
                        "kode_blok": props.get("Kode_Blok"),
                        "no_polygon": props.get("No_Polygon"),
                        "afdeling": props.get("Afdeling"),
                        "komoditi": props.get("Komoditi"),
                        "status": props.get("Status"),
                        "thn_tanam": props.get("Thn_Tanam"),
                        "varietas": props.get("Varietas"),
                        "kabupaten": props.get("Kabupaten"),
                        "kecamatan": props.get("Kecamatan"),
                        "desa": props.get("Desa"),
                        "l_gis": float(props.get("L_GIS")) if props.get("L_GIS") is not None else None,
                        "l_rkap": float(props.get("L_RKAP")) if props.get("L_RKAP") is not None else None,
                        "l_hgu": float(props.get("L_HGU_HGB") or props.get("L_HGU")) if (props.get("L_HGU_HGB") or props.get("L_HGU")) is not None else None,
                        "protas_21": float(props.get("Protas_21")) if props.get("Protas_21") is not None else None,
                        "protas_22": float(props.get("Protas_22")) if props.get("Protas_22") is not None else None,
                        "protas_23": float(props.get("Protas_23")) if props.get("Protas_23") is not None else None,
                        "protas_24": float(props.get("Protas_24")) if props.get("Protas_24") is not None else None,
                        "populasi": int(float(props.get("Populasi"))) if props.get("Populasi") is not None else None,
                        "pica": props.get("PICA"),
                        "alas_hak": props.get("Alas_Hak"),
                        "status_kpm": props.get("Status_Kpm"),
                    }
                    features.append({
                        "type": "Feature",
                        "id": feature_id,
                        "geometry": feat.get("geometry"),
                        "properties": norm_props
                    })
                    feature_id += 1
            except Exception as e:
                print(f"Error loading fallback file {file.name}: {e}")
        cls._features = features
        cls._loaded = True
        print(f"Fallback local files loaded successfully: {len(cls._features)} features found.")

    @classmethod
    def get_features(cls, kebun: Optional[str] = None, komoditi: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        cls.load_all()
        result = cls._features
        if kebun:
            result = [f for f in result if f["properties"]["kebun"] and f["properties"]["kebun"].lower() == kebun.lower()]
        if komoditi:
            result = [f for f in result if f["properties"]["komoditi"] and f["properties"]["komoditi"].lower() == komoditi.lower()]
        if status:
            result = [f for f in result if f["properties"]["status"] and f["properties"]["status"].lower() == status.lower()]
        return result

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        cls.load_all()
        total_blok = len(cls._features)
        total_luas_gis = sum(f["properties"]["l_gis"] or 0.0 for f in cls._features)
        total_luas_rkap = sum(f["properties"]["l_rkap"] or 0.0 for f in cls._features)

        # per kebun
        kebun_map = {}
        for f in cls._features:
            k = f["properties"]["kebun"] or "Tidak Diketahui"
            gis = f["properties"]["l_gis"] or 0.0
            if k not in kebun_map:
                kebun_map[k] = {"jumlah_blok": 0, "total_luas": 0.0}
            kebun_map[k]["jumlah_blok"] += 1
            kebun_map[k]["total_luas"] += gis
        per_kebun = [{"kebun": k, "jumlah_blok": v["jumlah_blok"], "total_luas": round(v["total_luas"], 2)} for k, v in sorted(kebun_map.items())]

        # per komoditi
        komoditi_map = {}
        for f in cls._features:
            k = f["properties"]["komoditi"] or "Tidak Diketahui"
            gis = f["properties"]["l_gis"] or 0.0
            if k not in komoditi_map:
                komoditi_map[k] = {"jumlah_blok": 0, "total_luas": 0.0}
            komoditi_map[k]["jumlah_blok"] += 1
            komoditi_map[k]["total_luas"] += gis
        per_komoditi = [{"komoditi": k, "jumlah_blok": v["jumlah_blok"], "total_luas": round(v["total_luas"], 2)} for k, v in sorted(komoditi_map.items())]

        # per status
        status_map = {}
        for f in cls._features:
            k = f["properties"]["status"] or "Tidak Diketahui"
            if k not in status_map:
                status_map[k] = 0
            status_map[k] += 1
        per_status = [{"status": k, "jumlah_blok": v} for k, v in sorted(status_map.items())]

        return {
            "total_blok": total_blok,
            "total_luas_gis": round(total_luas_gis, 2),
            "total_luas_rkap": round(total_luas_rkap, 2),
            "per_kebun": per_kebun,
            "per_komoditi": per_komoditi,
            "per_status": per_status,
        }

    @classmethod
    def get_kebun_names(cls) -> List[str]:
        cls.load_all()
        names = set(f["properties"]["kebun"] for f in cls._features if f["properties"]["kebun"])
        return sorted(list(names))

    @classmethod
    def get_detail(cls, blok_id: int) -> Optional[Dict[str, Any]]:
        cls.load_all()
        for f in cls._features:
            if f["properties"]["id"] == blok_id:
                return f
        return None


def _blok_to_feature(blok: BlokKebun, geom_json: str) -> dict:
    """Konversi model SQLAlchemy ke GeoJSON Feature."""
    return {
        "type": "Feature",
        "id": blok.id,
        "geometry": json.loads(geom_json),
        "properties": {
            "id": blok.id,
            "kebun": blok.kebun,
            "kode_blok": blok.kode_blok,
            "no_polygon": blok.no_polygon,
            "afdeling": blok.afdeling,
            "komoditi": blok.komoditi,
            "status": blok.status,
            "thn_tanam": blok.thn_tanam,
            "varietas": blok.varietas,
            "kabupaten": blok.kabupaten,
            "kecamatan": blok.kecamatan,
            "desa": blok.desa,
            "l_gis": round(blok.l_gis, 4) if blok.l_gis else None,
            "l_rkap": round(blok.l_rkap, 4) if blok.l_rkap else None,
            "l_hgu": round(blok.l_hgu, 4) if blok.l_hgu else None,
            "protas_21": blok.protas_21,
            "protas_22": blok.protas_22,
            "protas_23": blok.protas_23,
            "protas_24": blok.protas_24,
            "populasi": blok.populasi,
            "pica": blok.pica,
            "alas_hak": blok.alas_hak,
            "status_kpm": blok.status_kpm,
        },
    }


@router.get("", summary="Ambil semua blok kebun sebagai GeoJSON FeatureCollection")
def get_all_kebun(
    kebun: Optional[str] = Query(None, description="Filter berdasarkan nama kebun (Bergen, Kedaton, dll)"),
    komoditi: Optional[str] = Query(None, description="Filter berdasarkan komoditi (Karet, Sawit)"),
    status: Optional[str] = Query(None, description="Filter berdasarkan status (TM, TBM)"),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        features = GeoJSONFallback.get_features(kebun, komoditi, status)
        return {"type": "FeatureCollection", "features": features, "total": len(features)}

    q = db.query(BlokKebun, func.ST_AsGeoJSON(BlokKebun.geom).label("geom_json"))

    if kebun:
        q = q.filter(BlokKebun.kebun == kebun)
    if komoditi:
        q = q.filter(BlokKebun.komoditi == komoditi)
    if status:
        q = q.filter(BlokKebun.status == status)

    rows = q.all()
    features = [_blok_to_feature(row.BlokKebun, row.geom_json) for row in rows]
    return {"type": "FeatureCollection", "features": features, "total": len(features)}


@router.get("/stats", summary="Statistik agregat kebun (luas, jumlah blok)")
def get_stats(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        return GeoJSONFallback.get_stats()

    total = db.query(
        func.count(BlokKebun.id).label("total_blok"),
        func.coalesce(func.sum(BlokKebun.l_gis), 0).label("total_luas_gis"),
        func.coalesce(func.sum(BlokKebun.l_rkap), 0).label("total_luas_rkap"),
    ).first()

    per_kebun = (
        db.query(
            BlokKebun.kebun,
            func.count(BlokKebun.id).label("jumlah_blok"),
            func.coalesce(func.sum(BlokKebun.l_gis), 0).label("total_luas"),
        )
        .group_by(BlokKebun.kebun)
        .order_by(BlokKebun.kebun)
        .all()
    )

    per_komoditi = (
        db.query(
            BlokKebun.komoditi,
            func.count(BlokKebun.id).label("jumlah_blok"),
            func.coalesce(func.sum(BlokKebun.l_gis), 0).label("total_luas"),
        )
        .group_by(BlokKebun.komoditi)
        .order_by(BlokKebun.komoditi)
        .all()
    )

    per_status = (
        db.query(
            BlokKebun.status,
            func.count(BlokKebun.id).label("jumlah_blok"),
        )
        .group_by(BlokKebun.status)
        .order_by(BlokKebun.status)
        .all()
    )

    return {
        "total_blok": total.total_blok or 0,
        "total_luas_gis": round(float(total.total_luas_gis), 2),
        "total_luas_rkap": round(float(total.total_luas_rkap), 2),
        "per_kebun": [
            {
                "kebun": r.kebun,
                "jumlah_blok": r.jumlah_blok,
                "total_luas": round(float(r.total_luas), 2),
            }
            for r in per_kebun
        ],
        "per_komoditi": [
            {
                "komoditi": r.komoditi or "Tidak Diketahui",
                "jumlah_blok": r.jumlah_blok,
                "total_luas": round(float(r.total_luas), 2),
            }
            for r in per_komoditi
        ],
        "per_status": [
            {"status": r.status or "Tidak Diketahui", "jumlah_blok": r.jumlah_blok}
            for r in per_status
        ],
    }


@router.get("/list", summary="Daftar nama kebun unik")
def list_kebun_names(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        return {"kebun": GeoJSONFallback.get_kebun_names()}

    rows = db.query(BlokKebun.kebun).distinct().order_by(BlokKebun.kebun).all()
    return {"kebun": [r.kebun for r in rows]}


@router.get("/{blok_id}", summary="Detail satu blok kebun")
def get_blok_detail(
    blok_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if is_mock or db is None:
        detail = GeoJSONFallback.get_detail(blok_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"Blok dengan id {blok_id} tidak ditemukan")
        return detail

    row = (
        db.query(BlokKebun, func.ST_AsGeoJSON(BlokKebun.geom).label("geom_json"))
        .filter(BlokKebun.id == blok_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Blok dengan id {blok_id} tidak ditemukan")
    return _blok_to_feature(row.BlokKebun, row.geom_json)

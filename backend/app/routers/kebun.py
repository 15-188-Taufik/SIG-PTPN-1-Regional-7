from fastapi import APIRouter, Depends, Query, HTTPException, File, UploadFile
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
        
        original_features = []
        upload_features = []
        
        # Load original files (excluding Upload.geojson)
        for file in sorted(geojson_dir.glob("*.geojson")):
            if file.name == "Upload.geojson":
                continue
            try:
                with open(file, encoding="utf-8") as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    
                    # Parse L_GIS area
                    l_gis_raw = props.get("L_GIS")
                    l_gis_val = None
                    if l_gis_raw is not None:
                        try:
                            l_gis_val = float(l_gis_raw)
                        except ValueError:
                            pass

                    # Map files to units
                    sf_lower = file.name.lower()
                    if "bergen" in sf_lower:
                        kebun_name = "Unit Bergen"
                    elif "kedaton" in sf_lower:
                        kebun_name = "Unit Kedaton"
                    elif "tubu" in sf_lower:
                        kebun_name = "Unit Way Berulu"
                    elif "wabe" in sf_lower:
                        kebun_name = "Unit Bekri"
                    elif "wali" in sf_lower:
                        kebun_name = "Unit Rejosari"
                    else:
                        kebun_name = "Unit Bergen"

                    no_polygon = props.get("No_Polygon") or props.get("no_polygon")

                    kode_blok_val = props.get("Kode_Blok") or props.get("kode_blok")
                    thn_tanam_val = props.get("Thn_Tanam") or props.get("thn_tanam")
                    raw_afdeling = props.get("Afdeling") or props.get("afdeling") or ""

                    # Patch data spasial kosong atas masukan user
                    if no_polygon == "7000079":
                        kode_blok_val = "KR997A"
                        thn_tanam_val = "1997"
                        raw_afdeling = "Afdeling I"

                    # Normalize afdeling to match dim_afdeling
                    orig_afdeling = str(raw_afdeling).strip()
                    
                    def parse_afd_idx(s_val: str) -> int:
                        s = s_val.lower()
                        if "vi" in s: return 6
                        if "iv" in s: return 4
                        if "v" in s: return 5
                        if "iii" in s: return 3
                        if "ii" in s: return 2
                        if "i" in s: return 1
                        if "a" in s: return 1
                        if "b" in s: return 2
                        if "c" in s: return 3
                        if "d" in s: return 4
                        for char in s:
                            if char.isdigit():
                                v = int(char)
                                if 1 <= v <= 9: return v
                        return 1

                    idx = parse_afd_idx(orig_afdeling)

                    if "bergen" in sf_lower:
                        if idx == 1: afdeling_val = "Afdeling I"
                        elif idx == 2: afdeling_val = "Afdeling II"
                        else: afdeling_val = "Afdeling III"
                    elif "kedaton" in sf_lower:
                        if idx == 1: afdeling_val = "Afdeling A"
                        elif idx == 2: afdeling_val = "Afdeling B"
                        elif idx == 3: afdeling_val = "Afdeling C"
                        else: afdeling_val = "Afdeling D"
                    elif "tubu" in sf_lower:
                        if idx == 1: afdeling_val = "Afdeling A"
                        elif idx == 2: afdeling_val = "Afdeling B"
                        else: afdeling_val = "Afdeling C"
                    elif "wabe" in sf_lower:
                        if idx == 1: afdeling_val = "Afdeling I"
                        elif idx == 2: afdeling_val = "Afdeling II"
                        elif idx == 3: afdeling_val = "Afdeling III"
                        else: afdeling_val = "Afdeling IV"
                    elif "wali" in sf_lower:
                        if idx == 1: afdeling_val = "Afdeling I"
                        elif idx == 2: afdeling_val = "Afdeling II"
                        elif idx == 3: afdeling_val = "Afdeling III"
                        elif idx == 4: afdeling_val = "Afdeling IV"
                        else: afdeling_val = "Afdeling V"
                    else:
                        afdeling_val = orig_afdeling

                    norm_props = {
                        "kebun": kebun_name,
                        "kode_blok": kode_blok_val,
                        "no_polygon": no_polygon,
                        "afdeling": afdeling_val,
                        "komoditi": props.get("Komoditi") or props.get("komoditi"),
                        "status": props.get("Status") or props.get("status"),
                        "thn_tanam": thn_tanam_val,
                        "varietas": props.get("Varietas") or props.get("varietas"),
                        "kabupaten": props.get("Kabupaten") or props.get("kabupaten"),
                        "kecamatan": props.get("Kecamatan") or props.get("kecamatan"),
                        "desa": props.get("Desa") or props.get("desa"),
                        "l_gis": l_gis_val,
                        "l_rkap": float(props.get("L_RKAP") or props.get("l_rkap")) if (props.get("L_RKAP") or props.get("l_rkap")) is not None else None,
                        "l_hgu": float(props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) if (props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) is not None else None,
                        "protas_21": float(props.get("Protas_21") or props.get("protas_21")) if (props.get("Protas_21") or props.get("protas_21")) is not None else None,
                        "protas_22": float(props.get("Protas_22") or props.get("protas_22")) if (props.get("Protas_22") or props.get("protas_22")) is not None else None,
                        "protas_23": float(props.get("Protas_23") or props.get("protas_23")) if (props.get("Protas_23") or props.get("protas_23")) is not None else None,
                        "protas_24": float(props.get("Protas_24") or props.get("protas_24")) if (props.get("Protas_24") or props.get("protas_24")) is not None else None,
                        "populasi": int(float(props.get("Populasi") or props.get("populasi"))) if (props.get("Populasi") or props.get("populasi")) is not None else None,
                        "pica": props.get("PICA") or props.get("pica"),
                        "alas_hak": props.get("Alas_Hak") or props.get("alas_hak"),
                        "status_kpm": props.get("Status_Kpm") or props.get("status_kpm"),
                    }
                    
                    original_features.append({
                        "type": "Feature",
                        "geometry": feat.get("geometry"),
                        "properties": norm_props
                    })
            except Exception as e:
                print(f"Error loading original file {file.name}: {e}")

        # Load upload file if exists
        upload_file = geojson_dir / "Upload.geojson"
        if upload_file.exists():
            try:
                with open(upload_file, encoding="utf-8") as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    l_gis_raw = props.get("L_GIS") or props.get("l_gis")
                    l_gis_val = None
                    if l_gis_raw is not None:
                        try:
                            l_gis_val = float(l_gis_raw)
                        except ValueError:
                            pass
                    
                    norm_props = {
                        "kebun": props.get("kebun"),
                        "kode_blok": props.get("kode_blok"),
                        "no_polygon": props.get("no_polygon"),
                        "afdeling": props.get("afdeling"),
                        "komoditi": props.get("komoditi"),
                        "status": props.get("status"),
                        "thn_tanam": props.get("thn_tanam"),
                        "varietas": props.get("varietas"),
                        "kabupaten": props.get("kabupaten"),
                        "kecamatan": props.get("kecamatan"),
                        "desa": props.get("desa"),
                        "l_gis": l_gis_val,
                        "l_rkap": props.get("l_rkap"),
                        "l_hgu": props.get("l_hgu"),
                        "protas_21": props.get("protas_21"),
                        "protas_22": props.get("protas_22"),
                        "protas_23": props.get("protas_23"),
                        "protas_24": props.get("protas_24"),
                        "populasi": props.get("populasi"),
                        "pica": props.get("pica"),
                        "alas_hak": props.get("alas_hak"),
                        "status_kpm": props.get("status_kpm"),
                    }
                    upload_features.append({
                        "type": "Feature",
                        "geometry": feat.get("geometry"),
                        "properties": norm_props
                    })
            except Exception as e:
                print(f"Error loading upload file: {e}")

        # Deduplicate: remove features in original_features if their no_polygon is updated in upload_features
        upload_polygons = set(f["properties"]["no_polygon"] for f in upload_features if f["properties"]["no_polygon"])
        if upload_polygons:
            original_features = [f for f in original_features if f["properties"]["no_polygon"] not in upload_polygons]

        # Combine
        combined_features = original_features + upload_features
        
        # Assign sequential IDs
        for idx, feat in enumerate(combined_features, 1):
            feat["id"] = idx
            feat["properties"]["id"] = idx

        cls._features = combined_features
        cls._loaded = True
        print(f"Fallback local files loaded successfully: {len(cls._features)} features found after upload-overlay.")

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


@router.post("/upload-geojson", summary="Unggah berkas GeoJSON untuk menambah/memperbarui data kebun")
async def upload_geojson(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    try:
        content = await file.read()
        geojson_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File tidak valid atau gagal dibaca sebagai JSON: {e}")

    features = geojson_data.get("features", [])
    if not features:
        raise HTTPException(status_code=400, detail="Tidak ada fitur spasial (features) ditemukan di berkas GeoJSON")

    imported_count = 0
    updated_count = 0

    if is_mock or db is None:
        geojson_dir = Path(__file__).resolve().parent.parent.parent.parent / "datas" / "LAMPUNG"
        upload_path = geojson_dir / "Upload.geojson"
        
        existing_features = []
        if upload_path.exists():
            try:
                with open(upload_path, encoding="utf-8") as f:
                    old_data = json.load(f)
                    existing_features = old_data.get("features", [])
            except Exception as e:
                print(f"Error reading existing Upload.geojson: {e}")

        upload_poly_map = {}
        for f in existing_features:
            p = f.get("properties", {})
            no_poly = p.get("No_Polygon") or p.get("no_polygon")
            if no_poly:
                upload_poly_map[no_poly] = f

        for feat in features:
            props = feat.get("properties", {})
            no_poly = props.get("No_Polygon") or props.get("no_polygon")
            if not no_poly:
                continue
            
            raw_kebun = props.get("Kebun") or props.get("kebun")
            kebun_name = raw_kebun.strip() if raw_kebun else "Way Berulu"
            k_upper = kebun_name.upper()
            if k_upper in ["WABE", "WAY BELULU", "WAY BERULU"]:
                kebun_name = "Way Berulu"
            elif k_upper in ["WALI", "WAY LIMA"]:
                kebun_name = "Wali"
            elif k_upper in ["TUBU", "TULUNGBUYUT"]:
                kebun_name = "TUBU"
            elif k_upper == "KEDATON":
                kebun_name = "Kedaton"
            elif k_upper == "BERGEN":
                kebun_name = "Bergen"
            elif k_upper == "KSO":
                kebun_name = "KSO"
            else:
                kebun_name = kebun_name.title()

            l_gis_raw = props.get("L_GIS") or props.get("l_gis")
            l_gis_val = None
            if l_gis_raw is not None:
                try:
                    l_gis_val = float(l_gis_raw)
                except ValueError:
                    pass

            norm_props = {
                "kebun": kebun_name,
                "kode_blok": props.get("Kode_Blok") or props.get("kode_blok"),
                "no_polygon": no_poly,
                "afdeling": props.get("Afdeling") or props.get("afdeling"),
                "komoditi": props.get("Komoditi") or props.get("komoditi"),
                "status": props.get("Status") or props.get("status"),
                "thn_tanam": props.get("Thn_Tanam") or props.get("thn_tanam"),
                "varietas": props.get("Varietas") or props.get("varietas"),
                "kabupaten": props.get("Kabupaten") or props.get("kabupaten"),
                "kecamatan": props.get("Kecamatan") or props.get("kecamatan"),
                "desa": props.get("Desa") or props.get("desa"),
                "l_gis": l_gis_val,
                "l_rkap": float(props.get("L_RKAP") or props.get("l_rkap")) if (props.get("L_RKAP") or props.get("l_rkap")) is not None else None,
                "l_hgu": float(props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) if (props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) is not None else None,
                "protas_21": float(props.get("Protas_21") or props.get("protas_21")) if (props.get("Protas_21") or props.get("protas_21")) is not None else None,
                "protas_22": float(props.get("Protas_22") or props.get("protas_22")) if (props.get("Protas_22") or props.get("protas_22")) is not None else None,
                "protas_23": float(props.get("Protas_23") or props.get("protas_23")) if (props.get("Protas_23") or props.get("protas_23")) is not None else None,
                "protas_24": float(props.get("Protas_24") or props.get("protas_24")) if (props.get("Protas_24") or props.get("protas_24")) is not None else None,
                "populasi": int(float(props.get("Populasi") or props.get("populasi"))) if (props.get("Populasi") or props.get("populasi")) is not None else None,
                "pica": props.get("PICA") or props.get("pica"),
                "alas_hak": props.get("Alas_Hak") or props.get("alas_hak"),
                "status_kpm": props.get("Status_Kpm") or props.get("status_kpm"),
            }

            new_feat = {
                "type": "Feature",
                "geometry": feat.get("geometry"),
                "properties": norm_props
            }

            if no_poly in upload_poly_map:
                upload_poly_map[no_poly] = new_feat
                updated_count += 1
            else:
                upload_poly_map[no_poly] = new_feat
                imported_count += 1

        new_geojson_content = {
            "type": "FeatureCollection",
            "features": list(upload_poly_map.values())
        }

        try:
            with open(upload_path, "w", encoding="utf-8") as f:
                json.dump(new_geojson_content, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menulis file upload ke sistem lokal: {e}")

        # Clear fallback cache and force reload
        GeoJSONFallback._loaded = False
        GeoJSONFallback.load_all()

    else:
        try:
            for feat in features:
                props = feat.get("properties", {})
                no_poly = props.get("No_Polygon") or props.get("no_polygon")
                if not no_poly:
                    continue
                
                raw_kebun = props.get("Kebun") or props.get("kebun")
                kebun_name = raw_kebun.strip() if raw_kebun else "Way Berulu"
                k_upper = kebun_name.upper()
                if k_upper in ["WABE", "WAY BELULU", "WAY BERULU"]:
                    kebun_name = "Way Berulu"
                elif k_upper in ["WALI", "WAY LIMA"]:
                    kebun_name = "Wali"
                elif k_upper in ["TUBU", "TULUNGBUYUT"]:
                    kebun_name = "TUBU"
                elif k_upper == "KEDATON":
                    kebun_name = "Kedaton"
                elif k_upper == "BERGEN":
                    kebun_name = "Bergen"
                elif k_upper == "KSO":
                    kebun_name = "KSO"
                else:
                    kebun_name = kebun_name.title()

                l_gis_raw = props.get("L_GIS") or props.get("l_gis")
                l_gis_val = None
                if l_gis_raw is not None:
                    try:
                        l_gis_val = float(l_gis_raw)
                    except ValueError:
                        pass

                existing = db.query(BlokKebun).filter(BlokKebun.no_polygon == no_poly).first()
                
                fields = {
                    "kebun": kebun_name,
                    "kode_blok": props.get("Kode_Blok") or props.get("kode_blok"),
                    "afdeling": props.get("Afdeling") or props.get("afdeling"),
                    "komoditi": props.get("Komoditi") or props.get("komoditi"),
                    "status": props.get("Status") or props.get("status"),
                    "thn_tanam": props.get("Thn_Tanam") or props.get("thn_tanam"),
                    "varietas": props.get("Varietas") or props.get("varietas"),
                    "kabupaten": props.get("Kabupaten") or props.get("kabupaten"),
                    "kecamatan": props.get("Kecamatan") or props.get("kecamatan"),
                    "desa": props.get("Desa") or props.get("desa"),
                    "l_gis": l_gis_val,
                    "l_rkap": float(props.get("L_RKAP") or props.get("l_rkap")) if (props.get("L_RKAP") or props.get("l_rkap")) is not None else None,
                    "l_hgu": float(props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) if (props.get("L_HGU_HGB") or props.get("L_HGU") or props.get("l_hgu")) is not None else None,
                    "protas_21": float(props.get("Protas_21") or props.get("protas_21")) if (props.get("Protas_21") or props.get("protas_21")) is not None else None,
                    "protas_22": float(props.get("Protas_22") or props.get("protas_22")) if (props.get("Protas_22") or props.get("protas_22")) is not None else None,
                    "protas_23": float(props.get("Protas_23") or props.get("protas_23")) if (props.get("Protas_23") or props.get("protas_23")) is not None else None,
                    "protas_24": float(props.get("Protas_24") or props.get("protas_24")) if (props.get("Protas_24") or props.get("protas_24")) is not None else None,
                    "populasi": int(float(props.get("Populasi") or props.get("populasi"))) if (props.get("Populasi") or props.get("populasi")) is not None else None,
                    "pica": props.get("PICA") or props.get("pica"),
                    "alas_hak": props.get("Alas_Hak") or props.get("alas_hak"),
                    "status_kpm": props.get("Status_Kpm") or props.get("status_kpm"),
                }

                if existing:
                    for k, v in fields.items():
                        setattr(existing, k, v)
                    if feat.get("geometry"):
                        existing.geom = func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(feat.get("geometry"))), 4326)
                    updated_count += 1
                else:
                    new_blok = BlokKebun(
                        no_polygon=no_poly,
                        source_file=file.filename,
                        **fields
                    )
                    if feat.get("geometry"):
                        new_blok.geom = func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(feat.get("geometry"))), 4326)
                    else:
                        raise HTTPException(status_code=400, detail=f"Feature dengan No_Polygon {no_poly} tidak memiliki geometri spasial")
                    db.add(new_blok)
                    imported_count += 1
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error saat mengimpor data kebun: {e}")

    return {
        "status": "success",
        "message": f"Impor data selesai. {imported_count} blok baru ditambahkan, {updated_count} blok diperbarui.",
        "imported": imported_count,
        "updated": updated_count
    }

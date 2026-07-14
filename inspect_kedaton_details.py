import json
from pathlib import Path

geojson_path = Path("datas/LAMPUNG/Kedaton.geojson")
with open(geojson_path, encoding="utf-8") as f:
    data = json.load(f)

features = data.get("features", [])
print(f"Total features: {len(features)}")

# Print a summary of each feature
for idx, feat in enumerate(features):
    props = feat.get("properties", {})
    geom = feat.get("geometry", {})
    gtype = geom.get("type") if geom else "None"
    
    # Calculate coordinate ring sizes
    coords = geom.get("coordinates", []) if geom else []
    ring_sizes = []
    if gtype == "Polygon":
        ring_sizes = [len(r) for r in coords]
    elif gtype == "MultiPolygon":
        for poly in coords:
            ring_sizes.append([len(r) for r in poly])
            
    print(f"Index: {idx:2d} | Block: {props.get('Kode_Blok')} | No_Poly: {props.get('No_Polygon')} | L_GIS: {props.get('L_GIS')} | Type: {gtype} | Rings: {ring_sizes}")

import json
with open('datas/LAMPUNG/Kedaton.geojson', encoding='utf-8') as f:
    d = json.load(f)
feats = [f for f in d['features'] if f.get('properties', {}).get('Nomor_Peta') == 'GK05-2025-TM-AFD03-2011']
for i, f in enumerate(feats):
    p = f.get('properties', {})
    print(f"Feature {i}:")
    for k, v in p.items():
        if v is not None:
            print(f"  {k}: {v}")

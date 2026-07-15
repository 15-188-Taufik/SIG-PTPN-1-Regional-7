import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.schemas.sync import ProduksiHarianRow

raw = {
    'id_fakta': 3440, 
    'tanggal': '2026-07-01', 
    'id_afdeling': 12, 
    'target_harian_ton': 32.43, 
    'produksi_aktual_ton': 34.23, 
    'jumlah_pemanen_hk': 23.43, 
    'curah_hujan_mm': 32.24, 
    'rendemen_persen': 23.43
}

try:
    obj = ProduksiHarianRow(**raw)
    print("SUCCESS: Parsing worked!")
    print("Pydantic dict output:", obj.dict())
except Exception as e:
    print("FAILED: Parsing error:", str(e))

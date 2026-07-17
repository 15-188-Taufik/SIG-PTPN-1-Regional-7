import csv
from sqlalchemy import create_engine, text

def export_coordinates_to_csv():
    # Database connection URL from project .env
    db_url = "postgresql://postgres.qrxrrristtlnbyodgxdu:KorporatPTPN2026Regional7@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
    output_file = r"d:\kuliah praktik\PTPN\SIG PTPN\datas\master_koordinat.csv"
    
    engine = create_engine(db_url)
    
    query = """
        SELECT 
            no_polygon,
            kebun,
            afdeling,
            kode_blok,
            ST_Y(ST_Centroid(geom)) as latitude,
            ST_X(ST_Centroid(geom)) as longitude
        FROM 
            blok_kebun
        ORDER BY 
            kebun, afdeling, kode_blok;
    """
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            
            # Write to CSV
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                # Header
                writer.writerow(["no_polygon", "kebun", "afdeling", "kode_blok", "koordinat"])
                
                count = 0
                for row in rows:
                    no_polygon, kebun, afdeling, kode_blok, lat, lng = row
                    if lat is not None and lng is not None:
                        # Looker Studio expects coordinates in the format "latitude,longitude"
                        koordinat_str = f"{lat},{lng}"
                        writer.writerow([no_polygon, kebun, afdeling, kode_blok, koordinat_str])
                        count += 1
                
            print(f"Success! Exported {count} block coordinates to {output_file}")
            
    except Exception as e:
        print(f"Error executing database query: {str(e)}")

if __name__ == "__main__":
    export_coordinates_to_csv()

import os
import json

def merge_geojson_files():
    input_dir = r"d:\kuliah praktik\PTPN\SIG PTPN\datas\LAMPUNG"
    output_file = r"d:\kuliah praktik\PTPN\SIG PTPN\datas\all_kebun.geojson"
    
    merged_features = []
    
    # List all geojson files in the directory
    files = [f for f in os.listdir(input_dir) if f.endswith('.geojson')]
    print(f"Found files to merge: {files}")
    
    for file_name in files:
        file_path = os.path.join(input_dir, file_name)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'features' in data:
                    merged_features.extend(data['features'])
                    print(f"Successfully read {len(data['features'])} features from {file_name}")
                else:
                    print(f"Warning: No 'features' found in {file_name}")
        except Exception as e:
            print(f"Error reading {file_name}: {str(e)}")
            
    # Create the merged geojson structure
    merged_geojson = {
        "type": "FeatureCollection",
        "name": "All_Kebun_PTPN",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": merged_features
    }
    
    # Save the merged file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_geojson, f, ensure_ascii=False)
        print(f"\nSuccess! Merged file saved to: {output_file}")
        print(f"Total features merged: {len(merged_features)}")
    except Exception as e:
        print(f"Error saving merged file: {str(e)}")

if __name__ == "__main__":
    merge_geojson_files()

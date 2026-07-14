import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL == "mock":
    print("Error: DATABASE_URL is not set to a real database connection string.")
    exit(1)

print(f"Connecting to Supabase to execute schema creation...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Read create_schema.sql
    schema_path = Path(__file__).parent / "create_schema.sql"
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()
        
    print("Executing create_schema.sql...")
    cur.execute(sql)
    conn.commit()
    print("Schema setup completed successfully!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error during schema setup: {e}")
    exit(1)

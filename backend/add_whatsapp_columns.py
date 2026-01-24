"""
Run this script to add WhatsApp columns to the users table.
Usage: python add_whatsapp_columns.py
"""
import psycopg2

# Railway PostgreSQL connection
DATABASE_URL = "postgresql://postgres:avLTgqahuthoThmohwQStSyEgoDEwSZQ@turntable.proxy.rlwy.net:39554/railway"

columns_to_add = [
    ("whatsapp_access_token", "TEXT"),
    ("whatsapp_waba_id", "VARCHAR(100)"),
    ("whatsapp_phone_number_id", "VARCHAR(100)"),
    ("whatsapp_phone_number", "VARCHAR(20)"),
    ("whatsapp_business_name", "VARCHAR(255)"),
    ("whatsapp_display_name", "VARCHAR(255)"),
    ("whatsapp_quality_rating", "VARCHAR(20)"),
    ("whatsapp_connected_at", "TIMESTAMP"),
]

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    for col_name, col_type in columns_to_add:
        try:
            sql = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
            print(f"Adding column: {col_name}")
            cur.execute(sql)
            conn.commit()
            print(f"  ✓ {col_name} added successfully")
        except Exception as e:
            print(f"  ✗ Error adding {col_name}: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print("\nDone! Now redeploy your backend on Railway.")

if __name__ == "__main__":
    main()

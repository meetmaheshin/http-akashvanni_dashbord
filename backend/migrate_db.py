"""
Database migration script to add new columns and tables for GST/Invoice features
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'whatsapp_dashboard.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check and add new columns to users table
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = [col[1] for col in cursor.fetchall()]

    new_user_columns = [
        ("gst_number", "VARCHAR(20)"),
        ("billing_address", "TEXT"),
        ("city", "VARCHAR(100)"),
        ("state", "VARCHAR(100)"),
        ("pincode", "VARCHAR(10)"),
        ("gst_prompt_shown", "BOOLEAN DEFAULT 0"),
    ]

    for col_name, col_type in new_user_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"Added column {col_name} to users table")
            except sqlite3.OperationalError as e:
                print(f"Column {col_name} might already exist: {e}")

    # Check and add invoice_id to transactions table
    cursor.execute("PRAGMA table_info(transactions)")
    trans_columns = [col[1] for col in cursor.fetchall()]

    if "invoice_id" not in trans_columns:
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)")
            print("Added column invoice_id to transactions table")
        except sqlite3.OperationalError as e:
            print(f"Column invoice_id might already exist: {e}")

    # Create invoices table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_company VARCHAR(255),
            customer_gst VARCHAR(20),
            customer_address TEXT,
            subtotal INTEGER NOT NULL,
            cgst_amount INTEGER DEFAULT 0,
            sgst_amount INTEGER DEFAULT 0,
            igst_amount INTEGER DEFAULT 0,
            total_amount INTEGER NOT NULL,
            credited_amount INTEGER NOT NULL,
            razorpay_payment_id VARCHAR(255),
            payment_date DATETIME,
            status VARCHAR(20) DEFAULT 'paid',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("Created/verified invoices table")

    # Create company_config table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name VARCHAR(255) NOT NULL,
            legal_name VARCHAR(255) NOT NULL,
            gst_number VARCHAR(20) NOT NULL,
            address TEXT NOT NULL,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(10),
            email VARCHAR(255),
            phone VARCHAR(20),
            bank_name VARCHAR(255),
            bank_account VARCHAR(50),
            bank_ifsc VARCHAR(20),
            invoice_prefix VARCHAR(10) DEFAULT 'TZ',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
        )
    """)
    print("Created/verified company_config table")

    # Insert default company config if not exists
    cursor.execute("SELECT COUNT(*) FROM company_config")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO company_config (company_name, legal_name, gst_number, address, city, state, pincode, email, invoice_prefix)
            VALUES ('TWOZERO', 'MAHESH', '07ATPPM6940D1ZG',
                    'First Floor, A-784, G. D. Colony, Mayur Vihar, Phase - 3, East Delhi, Delhi, 110096',
                    'Delhi', 'Delhi', '110096', 'support@twozero.in', 'TZ')
        """)
        print("Inserted default company config for TWOZERO")

    conn.commit()
    conn.close()
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    migrate()

"""
Script to import WhatsApp messages from CSV file into the database
Usage: python import_messages.py <csv_file_path> <user_id>
"""
import csv
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Message, MessageStatus, MessageType, Base
from app.database import engine, SessionLocal

def parse_phone(whatsapp_str):
    """Extract phone number from whatsapp:+91xxxxxxxxxx format"""
    if whatsapp_str and whatsapp_str.startswith("whatsapp:"):
        return whatsapp_str.replace("whatsapp:", "")
    return whatsapp_str

def map_status(status_str):
    """Map CSV status to our MessageStatus"""
    status_map = {
        "delivered": "delivered",
        "sent": "sent",
        "read": "read",
        "received": "delivered",  # 'received' in Twilio means delivered
        "failed": "failed",
        "undelivered": "failed",
        "queued": "pending",
        "sending": "pending"
    }
    return status_map.get(status_str.lower(), "sent")

def parse_date(date_str):
    """Parse date from CSV format: 2026-01-16T04:45:54-08:00"""
    try:
        # Handle ISO format with timezone
        if 'T' in date_str:
            # Remove timezone for simple parsing
            date_part = date_str.split('-08:00')[0].split('+')[0]
            if '-' in date_part[10:]:  # Has negative timezone offset
                date_part = date_str[:19]  # Take just YYYY-MM-DDTHH:MM:SS
            return datetime.fromisoformat(date_part.replace('T', ' '))
    except Exception as e:
        print(f"Date parse error: {e} for {date_str}")
    return datetime.now()

def import_messages(csv_file_path, user_id):
    """Import messages from CSV file for a specific user"""

    db = SessionLocal()

    try:
        imported = 0
        skipped = 0

        with open(csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                try:
                    # Extract data from CSV
                    from_phone = parse_phone(row.get('From', ''))
                    to_phone = parse_phone(row.get('To', ''))
                    body = row.get('Body', '')
                    status = row.get('Status', 'sent')
                    sent_date = row.get('SentDate', '')
                    direction = row.get('Direction', 'outbound-api')
                    message_sid = row.get('Sid', '')
                    price = row.get('Price', '0')

                    # Determine recipient phone (for outbound, it's the "To" field)
                    if direction == 'outbound-api':
                        recipient_phone = to_phone
                    else:
                        recipient_phone = from_phone  # For inbound messages

                    # Skip if no recipient phone
                    if not recipient_phone:
                        skipped += 1
                        continue

                    # Check if message already exists (by whatsapp_message_id)
                    existing = db.query(Message).filter(
                        Message.whatsapp_message_id == message_sid
                    ).first()

                    if existing:
                        skipped += 1
                        continue

                    # Calculate cost (convert USD to INR paise, roughly)
                    # $0.0118 ≈ ₹1 ≈ 100 paise
                    try:
                        usd_price = abs(float(price)) if price else 0
                        cost_paise = int(usd_price * 83 * 100)  # USD to INR to paise
                        if cost_paise == 0:
                            cost_paise = 200  # Default ₹2 for template messages
                    except:
                        cost_paise = 200

                    # Create message record
                    message = Message(
                        user_id=user_id,
                        recipient_phone=recipient_phone,
                        recipient_name=None,  # Can be updated later
                        message_type="template",  # Assuming template messages
                        template_name="Upstox KYC Reminder",  # Based on content
                        message_content=body,
                        status=map_status(status),
                        whatsapp_message_id=message_sid,
                        cost=cost_paise,
                        created_at=parse_date(sent_date),
                        sent_at=parse_date(sent_date) if status in ['sent', 'delivered', 'read'] else None,
                        delivered_at=parse_date(sent_date) if status == 'delivered' else None,
                        read_at=parse_date(sent_date) if status == 'read' else None,
                    )

                    db.add(message)
                    imported += 1

                    # Commit every 100 records
                    if imported % 100 == 0:
                        db.commit()
                        print(f"Imported {imported} messages...")

                except Exception as e:
                    print(f"Error importing row: {e}")
                    skipped += 1
                    continue

        # Final commit
        db.commit()
        print(f"\n✅ Import complete!")
        print(f"   Imported: {imported} messages")
        print(f"   Skipped: {skipped} messages")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python import_messages.py <csv_file_path> <user_id>")
        print("Example: python import_messages.py ../sms-log.csv 3")
        sys.exit(1)

    csv_file = sys.argv[1]
    user_id = int(sys.argv[2])

    print(f"Importing messages from: {csv_file}")
    print(f"For user ID: {user_id}")
    print("-" * 50)

    import_messages(csv_file, user_id)

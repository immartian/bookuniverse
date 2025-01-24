import sqlite3
import isbnlib
import zstandard as zstd
import json
import logging
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

DB_FILE = "isbn_data.db"

def init_db():
    """Initialize the SQLite database and tables."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS isbn_holdings (
            isbn_13 INTEGER PRIMARY KEY,
            title TEXT,
            oclc_numbers TEXT,  -- Stored as JSON array
            total_holdings INTEGER
        )
    """)
    conn.commit()
    conn.close()
    logging.info("Database initialized.")

def normalize_isbn(isbn):
    """Normalize ISBN to 13-digit integer."""
    try:
        clean_isbn = isbnlib.canonical(isbn)
        if isbnlib.is_isbn10(clean_isbn):
            clean_isbn = isbnlib.to_isbn13(clean_isbn)
        if isbnlib.is_isbn13(clean_isbn):
            return int(clean_isbn)  # Convert to integer for efficient storage
    except Exception:
        return None
    return None

def process_zst_file(file_path, number):
    """Process the .zst file to extract and store unique ISBN records."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    processed_isbns = set()

    try:
        with open(file_path, 'rb') as zst_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream, tqdm(desc="Processing records", unit="line") as pbar:
                buffer = b""
                
                while True:
                    chunk = stream.read(65536)
                    if not chunk:
                        break

                    buffer += chunk
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        if not line.strip():
                            continue

                        try:
                            record = json.loads(line)
                            metadata = record.get("metadata", {})
                            record_data = metadata.get("record", {})

                            # Extract necessary fields
                            oclc_number = metadata.get("oclc_number") or record_data.get("oclcNumber")
                            total_holding_count = record_data.get("totalHoldingCount", 0)
                            isbns = record_data.get("isbns", [])
                            title = record_data.get("title", "Unknown Title")

                            if total_holding_count > 0 and isbns:
                                for isbn in isbns:
                                    normalized_isbn = normalize_isbn(isbn)
                                    if normalized_isbn and normalized_isbn not in processed_isbns:
                                        processed_isbns.add(normalized_isbn)

                                        # Store in SQLite DB
                                        cursor.execute("""
                                            INSERT OR REPLACE INTO isbn_holdings (isbn_13, title, oclc_numbers, total_holdings)
                                            VALUES (?, ?, ?, ?)
                                        """, (
                                            normalized_isbn,
                                            title,
                                            json.dumps([oclc_number]),  # Store OCLC as JSON array
                                            total_holding_count
                                        ))

                        except json.JSONDecodeError:
                            logging.warning("Skipping invalid JSON line.")
                        except Exception as e:
                            logging.error(f"Error processing line: {str(e)}")

                        pbar.update(1)

        conn.commit()
    except Exception as e:
        logging.error(f"Error reading file: {str(e)}")
    finally:
        conn.close()
        logging.info("Processing complete.")

def export_to_jsonl(output_file="isbn_holdings_final.jsonl"):
    """Export processed ISBN holdings to a JSONL file."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT isbn_13, title, oclc_numbers, total_holdings FROM isbn_holdings")

    with open(output_file, "w") as outfile:
        for row in cursor.fetchall():
            json.dump({
                "i": row[0],  # ISBN 13-digit integer
                "t": row[1],  # Title
                "o": json.loads(row[2]),  # OCLC Numbers
                "h": row[3]   # Holdings
            }, outfile)
            outfile.write("\n")

    conn.close()
    logging.info(f"Exported matched ISBNs to {output_file}")

def main():
    input_filename = 'annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst'

    # Step 1: Initialize DB
    init_db()

    # Step 2: Process .zst file and store data
    logging.info("Starting data processing...")
    process_zst_file(input_filename)

    # Step 3: Export results to JSONL for further use
    export_to_jsonl()

if __name__ == "__main__":
    main()

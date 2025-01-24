import zstandard as zstd
import json
import logging
import sqlite3
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Database configuration
DB_FILE = "rare_books.db"
RARE_THRESHOLD = 11
CHUNK_SIZE = 65536  # 64KB chunks for reading compressed file

# Function to normalize OCLC numbers by stripping leading zeros
def normalize_oclc(oclc):
    if isinstance(oclc, str):
        return oclc.lstrip("0")
    return str(oclc)

def setup_database():
    """
    Create database and necessary tables if they don't already exist.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS oclc_holdings (
            oclc_number TEXT PRIMARY KEY,
            total_holding_count INTEGER, 
            isbn_13 INTEGER, 
            title TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    logging.info("Database setup complete.")

def insert_oclc_record(cursor, oclc_number, total_holding_count):
    """
    Insert a new OCLC record into the database or update if exists.
    """
    cursor.execute("""
        INSERT OR REPLACE INTO oclc_holdings (oclc_number, total_holding_count)
        VALUES (?, ?)
    """, (oclc_number, total_holding_count))

def extract_oclc_holdings(file_path, round_size=1000000, rounds = None):
    """
    Extract rare OCLC numbers and insert directly into the SQLite database.
    """
    record_count = 0
    round_counter = 0

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        with open(file_path, 'rb') as zst_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream, tqdm(desc="Processing records", unit="line") as pbar:
                buffer = b""

                while True:
                    chunk = stream.read(CHUNK_SIZE)
                    if not chunk:
                        break  # End of file reached

                    buffer += chunk

                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        if not line.strip():
                            continue

                        try:
                            record = json.loads(line)
                            metadata = record.get("metadata", {})
                            record_data = metadata.get("record", {})

                            oclc_number = normalize_oclc(metadata.get("oclc_number") or record_data.get("oclcNumber"))
                            total_holding_count = record_data.get("totalHoldingCount", 0)

                            if RARE_THRESHOLD > total_holding_count > 0 and oclc_number:
                                insert_oclc_record(cursor, oclc_number, total_holding_count)
                                logging.info(f"Found OCLC {oclc_number} with {total_holding_count} holdings.")

                            record_count += 1
                            pbar.update(1)

                            if record_count % round_size == 0:
                                round_counter += 1
                                conn.commit()
                                logging.info(f"Processed {record_count} records so far...")
                                if rounds and round_counter >= rounds:
                                    logging.info(f"Reached maximum rounds of {rounds}. Exiting.")
                                    return 

                        except json.JSONDecodeError:
                            logging.warning("Skipping invalid JSON line.")
                        except Exception as e:
                            logging.error(f"Error processing line: {str(e)}")

        conn.commit()

    except FileNotFoundError:
        logging.error(f"File not found: {file_path}")
    except Exception as e:
        logging.error(f"Error reading file: {str(e)}")
    finally:
        conn.close()

    logging.info(f"Processing complete. Total records processed: {record_count}")

def main():
    input_filename = 'annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst'
    round_size = 1000000  # Process in chunks of 1 million lines

    logging.info("Setting up database...")
    setup_database()

    logging.info("Starting extraction of OCLC holdings...")
    extract_oclc_holdings(input_filename, round_size=round_size, rounds=1)

    logging.info("All records processed successfully.")

if __name__ == "__main__":
    main()

import sqlite3
import json
import zstandard as zstd
import isbnlib
import logging
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

DB_FILE = "isbn_holdings.db"
OCLC_HOLDINGS_FILE = "samples_oclc_holdings.jsonl"
ZST_FILE = "annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst"

# --- Step 1: Load OCLC holdings into the database ---
def init_db():
    """Initialize the SQLite database."""
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
    logging.info("Database initialized.")

def load_oclc_holdings():
    """Load OCLC holdings from JSONL into the SQLite database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    with open(OCLC_HOLDINGS_FILE, "r") as infile:
        for line in infile:
            try:
                record = json.loads(line.strip())
                cursor.execute("""
                    INSERT OR IGNORE INTO oclc_holdings (oclc_number, total_holding_count)
                    VALUES (?, ?)
                """, (record["oclc_number"], record["total_holding_count"]))
            except json.JSONDecodeError:
                logging.warning(f"Skipping invalid JSON: {line.strip()}")
    
    conn.commit()
    conn.close()
    logging.info("OCLC holdings loaded into the database.")


# --- Step 2: Process the .zst file and match ISBNs ---
def normalize_oclc(oclc):
    if isinstance(oclc, str):
        return oclc.lstrip("0")
    return str(oclc)

def normalize_isbn(isbn):
    """Normalize ISBN to 13-digit integer."""
    try:
        clean_isbn = isbnlib.canonical(isbn)
        if isbnlib.is_isbn10(clean_isbn):
            clean_isbn = isbnlib.to_isbn13(clean_isbn)
        if isbnlib.is_isbn13(clean_isbn):
            return int(clean_isbn)  # Convert to integer for storage
    except Exception:
        return None
    return None

def process_zst_file(number_of_lines=None):
    """Scan the .zst file and match ISBNs to OCLC records."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    line_counter = 0    

    try:
        with open(ZST_FILE, 'rb') as zst_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream, tqdm(desc="Scanning ISBNs", unit="line") as pbar:
                buffer = b""
                
                while True:
                    chunk = stream.read(65536)
                    if not chunk:
                        break

                    buffer += chunk
                    while b'\n' in buffer:
                        # start from line 647691039 as it's stopped last last time

                        line, buffer = buffer.split(b'\n', 1)
                        if not line.strip():
                            continue

                        try:
                            record = json.loads(line)
                            metadata = record.get("metadata", {})
                            record_data = metadata.get("record", {})

                            oclc_number = metadata.get("oclc_number") or record_data.get("oclcNumber")
                            isbns = record_data.get("isbns", [])
                            title = record_data.get("title", "Unknown Title")

                            if oclc_number and isbns:
                                for isbn in isbns:
                                    normalized_isbn = normalize_isbn(isbn)
                                    if normalized_isbn:
                                        normalized_oclc = normalize_oclc(oclc_number)
                                        # Check if the OCLC record exists in DB and isbn is not None
                                        cursor.execute("""
                                            SELECT COUNT(*) FROM oclc_holdings WHERE oclc_number = ? AND isbn_13 IS NULL
                                        """, (normalized_oclc,))
                                        exists = cursor.fetchone()[0]

                                        if exists:
                                            cursor.execute("""
                                                UPDATE oclc_holdings
                                                SET isbn_13 = ?, title = ?
                                                WHERE oclc_number = ?
                                            """, (normalized_isbn, title, normalized_oclc))
                                            logging.info(f"Matched ISBN {normalized_isbn} to OCLC record {oclc_number}")

                            line_counter += 1
                            if number_of_lines and line_counter >= number_of_lines:
                                conn.commit()
                                return 

                        except json.JSONDecodeError:
                            logging.warning("Skipping invalid JSON line.")
                        pbar.update(1)
                    conn.commit()
    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
    finally:
        conn.close()
        logging.info("ZST file processing complete.")

# --- Step 3: Export processed data to JSONL ---
def export_to_jsonl(output_file="isbn_holdings_final.jsonl", number_of_books=100):
    """Export processed ISBN holdings to a JSONL file."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # export only number of books
    cursor.execute("SELECT isbn_13, title, total_holding_count FROM oclc_holdings WHERE isbn_13 IS NOT NULL LIMIT ?", (number_of_books,))
#    cursor.execute("SELECT isbn_13, title, total_holding_count FROM oclc_holdings WHERE isbn_13 IS NOT NULL")

    with open(output_file, "w") as outfile:
        for row in cursor.fetchall():
            json.dump({
                "i": row[0],  # ISBN 13-digit integer
                "t": row[1],  # Title
                "h": row[2]   # Holdings
            }, outfile)
            outfile.write("\n")

    conn.close()
    logging.info(f"Exported matched ISBNs to {output_file}")

# --- Main execution workflow ---
def main():
    # Step 1: Initialize the database and load OCLC holdings
    init_db()
    load_oclc_holdings()

    # Step 2: Process the .zst file and update records with ISBNs
    process_zst_file(100000)

    # Step 3: Export the final results
    export_to_jsonl() 

if __name__ == "__main__":
    main()

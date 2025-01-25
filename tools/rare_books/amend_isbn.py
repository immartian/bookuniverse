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

DB_FILE = "rare_books.db"
ZST_FILE = "annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst"


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

BATCH_SIZE = 5000  # Adjust based on memory and performance requirements

def process_zst_file(number_of_lines=None):
    """Scan the .zst file and match ISBNs to OCLC records."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    line_counter = 0  
    update_batch = []  

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
                                        # Check if OCLC exists and needs update
                                        cursor.execute("""
                                            SELECT COUNT(*) FROM oclc_holdings 
                                            WHERE oclc_number = ? AND isbn_13 IS NULL
                                        """, (normalized_oclc,))
                                        exists = cursor.fetchone()[0]

                                        if exists:
                                            update_batch.append((normalized_isbn, title, normalized_oclc))

                            line_counter += 1
                            pbar.update(1)

                            # Commit in batches
                            if len(update_batch) >= BATCH_SIZE:
                                cursor.executemany("""
                                    UPDATE oclc_holdings 
                                    SET isbn_13 = ?, title = ? 
                                    WHERE oclc_number = ?
                                """, update_batch)
                                conn.commit()
                                update_batch.clear()
                                logging.info(f"Committed {BATCH_SIZE} records")

                            if number_of_lines and line_counter >= number_of_lines:
                                break

                        except json.JSONDecodeError:
                            logging.warning("Skipping invalid JSON line.")

                # Final commit for remaining batch
                if update_batch:
                    cursor.executemany("""
                        UPDATE oclc_holdings 
                        SET isbn_13 = ?, title = ? 
                        WHERE oclc_number = ?
                    """, update_batch)
                    conn.commit()
                    logging.info(f"Final batch committed with {len(update_batch)} records")

    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
    finally:
        conn.close()
        logging.info("ZST file processing complete.")


if __name__ == "__main__":
    # Process the .zst file and update records with ISBNs
    process_zst_file()

import zstandard as zstd
import json
import logging
import os
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Configuration
RARITY_THRESHOLD = 10  # Books with fewer than 10 holdings
OUTPUT_FILE = "rare_books.jsonl"
INPUT_FILE = "annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst"
MAX_RARE_BOOKS = 100  # Adjust to process more books

# Get the total file size for progress tracking
FILE_SIZE = os.stat(INPUT_FILE).st_size

def extract_holdings(data):
    """
    Recursively search for 'totalHoldingCount' in nested JSON structures.
    Returns the lowest count found, or None if not present.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if key == "totalHoldingCount" and isinstance(value, int):
                logging.info(f"Found totalHoldingCount: {value}")
                return value
            result = extract_holdings(value)
            if result is not None:
                return result
    elif isinstance(data, list):
        for item in data:
            result = extract_holdings(item)
            if result is not None:
                return result
    return None

def save_rare_book(out_file, title, isbns, holdings, oclc_number):
    """Save rare book data indexed by ISBN."""
    for isbn in isbns:
        rare_book_entry = {
            "isbn": isbn,
            "oclc_number": oclc_number,
            "title": title,
            "holdings": holdings
        }
        out_file.write(json.dumps(rare_book_entry) + "\n")

def process_zst_file(input_file, output_file, max_rare_books):
    """ Process the compressed .zst file and stop after finding `max_rare_books` rare books. """
    record_count = 0
    rare_count = 0
    processed_size = 0

    try:
        with open(input_file, 'rb') as zst_file, open(output_file, 'w') as out_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream:
                buffer = b""
                
                # Progress bar for file size tracking
                pbar = tqdm(total=FILE_SIZE, unit="B", unit_scale=True, desc="Processing file")

                while rare_count < max_rare_books:
                    chunk = stream.read(65536)
                    if not chunk:
                        logging.info("Reached end of file.")
                        break

                    processed_size += len(chunk)
                    pbar.update(len(chunk))

                    buffer += chunk
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        if not line.strip():
                            continue

                        try:
                            record = json.loads(line)
                            metadata = record.get("metadata", {})
                            record_data = metadata.get("record", {})

                            total_holdings = extract_holdings(record_data)

                            title = record_data.get("title") or \
                                    record_data.get("titleInfo", {}).get("text") or \
                                    metadata.get("record", {}).get("title") or \
                                    "Unknown Title"

                            isbns = record_data.get("isbns") or \
                                    record_data.get("isbn13") or \
                                    record_data.get("isbn10") or \
                                    metadata.get("record", {}).get("isbns") or \
                                    ["No ISBN"]

                            oclc_number = record_data.get("oclcNumber") or \
                                          metadata.get("oclc_number") or \
                                          "Unknown"

                            # Log if metadata is missing
                            if title == "Unknown Title" or isbns == ["No ISBN"]:
                                logging.warning(f"Missing metadata: {record}")
                                continue

                            # Check rare book condition
                            if total_holdings is not None and total_holdings < RARITY_THRESHOLD:
                                rare_count += 1
                                save_rare_book(out_file, title, isbns, total_holdings, oclc_number)
                                logging.info(f"Captured rare book #{rare_count}: Title='{title}', ISBNs={isbns}, Holdings={total_holdings}")

                                if rare_count >= max_rare_books:
                                    logging.info(f"Found {max_rare_books} rare books, stopping processing.")
                                    pbar.close()
                                    return rare_count

                            record_count += 1
                            if record_count % 100000 == 0:
                                logging.info(f"Processed {record_count} lines, {processed_size / FILE_SIZE * 100:.2f}% of file.")

                        except json.JSONDecodeError:
                            logging.warning("Skipping invalid JSON line.")
                        except Exception as e:
                            logging.error(f"Error processing record: {str(e)}")

                pbar.close()

    except FileNotFoundError:
        logging.error(f"File not found: {input_file}")
    except Exception as e:
        logging.error(f"Error reading file: {str(e)}")

    logging.info(f"Processing complete. Total records processed: {record_count}, Rare books found: {rare_count}")
    return rare_count

if __name__ == "__main__":
    logging.info("Starting processing to find rare books...")
    rare_books_count = process_zst_file(INPUT_FILE, OUTPUT_FILE, MAX_RARE_BOOKS)
    logging.info(f"Total rare books saved: {rare_books_count}")
    logging.info(f"Rare books saved to '{OUTPUT_FILE}'")

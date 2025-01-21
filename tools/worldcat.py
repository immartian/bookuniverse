import zstandard as zstd
import json
import logging
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

def extract_holdings(data, parent_key=""):
    """
    Recursively search for 'totalHoldingCount' in nested JSON structures.
    Returns the lowest count found, or None if not present.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if key == "totalHoldingCount" and isinstance(value, int):
                return value
            result = extract_holdings(value, parent_key + "." + key)
            if result is not None:
                return result
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            result = extract_holdings(item, parent_key + f"[{idx}]")
            if result is not None:
                return result
    return None

def process_zst_file(input_file, output_file):
    """ Process the compressed .zst file to extract rare books with nested holdings. """
    record_count = 0
    rare_count = 0

    try:
        with open(input_file, 'rb') as zst_file, open(output_file, 'w') as out_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream:
                buffer = b""
                
                # Use tqdm for progress tracking
                pbar = tqdm(total=None, unit=" lines", desc="Processing")

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

                            # Extract holdings using recursive function
                            total_holdings = extract_holdings(record_data)
                            title = record_data.get("title", "Unknown Title")
                            isbns = record_data.get("isbns", [])

                            # Filter rare books with valid ISBNs
                            if total_holdings is not None and total_holdings < RARITY_THRESHOLD and isbns:
                                rare_count += 1
                                rare_book_entry = {
                                    "title": title,
                                    "isbns": isbns,
                                    "holdings": total_holdings
                                }
                                out_file.write(json.dumps(rare_book_entry) + "\n")
                                logging.info(f"Rare book found: '{title}', ISBNs: {isbns}, Holdings: {total_holdings}")

                            record_count += 1
                            pbar.update(1)

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
    logging.info("Starting full processing of rare books with nested holdings handling...")
    rare_books_count = process_zst_file(INPUT_FILE, OUTPUT_FILE)
    logging.info(f"Total rare books saved: {rare_books_count}")
    logging.info(f"Rare books saved to '{OUTPUT_FILE}'")

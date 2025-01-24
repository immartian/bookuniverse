import sqlite3
import json
import logging
import math
from pathlib import Path

DB_FILE = "isbn_holdings.db"
OUTPUT_DIR = "tiles"
BATCH_SIZE = 10000  # Process batch of records at a time
BASE_ISBN = 978000000000  # 12-digit base ISBN
TOTAL_WIDTH = 50000
TOTAL_HEIGHT = 40000
TILE_WIDTH = 1000
TILE_HEIGHT = 800

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def calculate_tile_position(isbn_13):
    """
    Calculate the tile position (x, y) using the first 12 digits of ISBN-13.
    """
    isbn12 = isbn_13 // 10  # Remove the last digit to get the 12-digit base
    isbn_offset = isbn12 - BASE_ISBN  # Calculate offset from base ISBN

    if isbn_offset < 0:
        raise ValueError(f"Invalid ISBN-13 offset calculation: {isbn_13}")

    # Compute tile positions
    tile_x = (isbn_offset % TOTAL_WIDTH) // TILE_WIDTH
    tile_y = (isbn_offset // (TOTAL_WIDTH * TILE_HEIGHT))

    return tile_x, tile_y

def fetch_isbns_in_batches():
    """
    Fetch ISBN records progressively in ascending order and process them in batches.
    """
    conn = sqlite3.connect(DB_FILE, timeout=10)  # Set timeout to avoid locking issues
    cursor = conn.cursor()
    offset = 0

    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    try:
        while True:
            logging.info(f"Fetching batch from offset {offset}...")

            cursor.execute("""
                SELECT isbn_13, title, total_holding_count
                FROM oclc_holdings
                WHERE isbn_13 IS NOT NULL
                ORDER BY isbn_13 ASC
                LIMIT ? OFFSET ?
            """, (BATCH_SIZE, offset))

            rows = cursor.fetchall()
            if not rows:
                break  # No more records to process

            # Process and write each record to the respective tile file
            tile_data = {}
            for isbn, title, holdings in rows:
                try:
                    tile_x, tile_y = calculate_tile_position(isbn)

                    tile_key = f"tile_{tile_x}_{tile_y}"
                    if tile_key not in tile_data:
                        tile_data[tile_key] = []

                    tile_data[tile_key].append({
                        "i": str(isbn),  # Convert to string for JSON
                        "t": title,  # Title
                        "h": holdings  # Holdings count
                    })

                except ValueError as e:
                    logging.error(f"Error processing ISBN {isbn}: {e}")

            # Write collected tile data incrementally
            for tile_key, records in tile_data.items():
                tile_file = Path(OUTPUT_DIR) / f"{tile_key}.json"
                if tile_file.exists():
                    with tile_file.open("r+") as f:
                        existing_data = json.load(f)
                        existing_data.extend(records)
                        f.seek(0)
                        json.dump(existing_data, f, indent=2)
                else:
                    with tile_file.open("w") as f:
                        json.dump(records, f, indent=2)

                logging.info(f"Updated {len(records)} records in {tile_key}.json")

            offset += BATCH_SIZE  # Move to the next batch

    except sqlite3.OperationalError as e:
        logging.error(f"Database error: {e}")
    finally:
        conn.close()

    logging.info("Processing complete.")

if __name__ == "__main__":
    fetch_isbns_in_batches()

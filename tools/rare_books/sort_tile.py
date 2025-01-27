import sqlite3
import json
import logging
import math
from pathlib import Path
from PIL import Image
import numpy as np

DB_FILE = "rare_books.db"
OUTPUT_DIR = "tiles"
BATCH_SIZE = 10000  # Process batch of records at a time
BASE_ISBN = 978000000000  # 12-digit base ISBN on map
TOTAL_WIDTH = 50000
TOTAL_HEIGHT = 40000
TILE_WIDTH = 1000
TILE_HEIGHT = 800
RARE_THRESHOLD = 4

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
                WHERE isbn_13 IS NOT NULL AND
                total_holding_count < ?
                ORDER BY isbn_13 ASC
                LIMIT ? OFFSET ?
            """, (RARE_THRESHOLD, BATCH_SIZE, offset))

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
                        "i": isbn,  # Keep as integer
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

# read the rare book json files from another folder with exact tile names, and evalute the records in those files
# in the format of {"i", "t", "h"} and add "e"(existence) to the record based on the tile image here,
# if the same isbn exists(green) in the tile image, then add "e": 1, otherwise "e": 0, and save the record
def existence_check():
    for i in range(50):
        # if i != 0: continue    # just test one file
        for j in range(50):
            # if j != 0: continue    # just test one file
            rarebook_tile_path = Path(f"../../rarebook_tiles/tile_{i}_{j}.json")
            if rarebook_tile_path.exists():
                with rarebook_tile_path.open("r") as f:
                    tile_data = json.load(f)
                tile_path = Path(f"../../tiles/tile_{i}_{j}.png")
                if tile_path.exists():
                    img = Image.open(tile_path)
                    img_data = np.array(img)
                    for record in tile_data:
                        isbn_index = record["i"] // 10 - BASE_ISBN
                        global_row = isbn_index // TOTAL_WIDTH
                        global_col = isbn_index % TOTAL_WIDTH
                        local_row = global_row - j * TILE_HEIGHT
                        local_col = global_col - i * TILE_WIDTH
                        if img_data[local_row, local_col][1] == 255:
                            record["e"] = 1
                        else:
                            record["e"] = 0
                    with rarebook_tile_path.open("w") as f:
                        json.dump(tile_data, f, indent=2)
                    logging.info(f"Tile {i}, {j} done")
            else: 
                #create an empty tile file
                with rarebook_tile_path.open("w") as f:
                    json.dump([], f, indent=2)


if __name__ == "__main__":
    #fetch_isbns_in_batches()
    existence_check()
import sqlite3
import json
import logging
import math
from pathlib import Path
import isbnlib

DB_FILE = "isbn_holdings.db"
RARE_THRESHOLD = 4
OUTPUT_DIR = "tiles"
BASE_ISBN = 978000000000
TOTAL_WIDTH = 50000
TOTAL_HEIGHT = 40000
TILE_WIDTH = 1000
TILE_HEIGHT = 800

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def calculate_tile_position(isbn13):
    """
    Calculate the tile position (x, y) for a given ISBN-13 number.
    """
    isbn_num = int(isbn13) - BASE_ISBN
    tile_x = (isbn_num % TOTAL_WIDTH) // TILE_WIDTH
    tile_y = (isbn_num // (TOTAL_WIDTH * TILE_HEIGHT))
    return tile_x, tile_y

def update_tile_positions():
    """
    Update tile_x and tile_y values for all ISBNs in the database.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT isbn_13 FROM oclc_holdings WHERE isbn_13 IS NOT NULL")
    records = cursor.fetchall()
    counter = 0
    report_interval = 10000
    for (isbn,) in records:
        counter += 1
        tile_x, tile_y = calculate_tile_position(isbn)
        cursor.execute("UPDATE oclc_holdings SET tile_x = ?, tile_y = ? WHERE isbn_13 = ?", (tile_x, tile_y, isbn))
        if counter % report_interval == 0:
            logging.info(f"Processed {counter} records.")
            conn.commit()
    conn.close()
    logging.info("Tile positions updated in the database.")

def fetch_records_for_tile(tile_x, tile_y):
    """
    Fetch all records matching the tile_x and tile_y.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT isbn_13, title, total_holding_count 
        FROM oclc_holdings 
        WHERE tile_x = ? AND tile_y = ? AND total_holding_count < ?
    """, (tile_x, tile_y, RARE_THRESHOLD))

    records = cursor.fetchall()
    conn.close()
    return records

def create_tiles():
    """
    Process all existing records and generate tile files.
    """
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT tile_x, tile_y FROM oclc_holdings WHERE tile_x IS NOT NULL")
    tiles = cursor.fetchall()

    for tile_x, tile_y in tiles:
        records = fetch_records_for_tile(tile_x, tile_y)
        tile_data = [{"i": record[0], "t": record[1], "h": record[2]} for record in records]

        tile_file = Path(OUTPUT_DIR) / f"tile_{tile_x}_{tile_y}.json"
        with tile_file.open("w") as f:
            json.dump(tile_data, f, indent=2)

        logging.info(f"Saved {len(tile_data)} records to {tile_file}")

    conn.close()
    logging.info("Tile creation complete.")

if __name__ == "__main__":
    # Step 1: Update DB with tile positions
    update_tile_positions()

    # Step 2: Generate tile files
    create_tiles()

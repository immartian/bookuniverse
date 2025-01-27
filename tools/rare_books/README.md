# Rare Books Tools

This repository contains a set of tools for processing and analyzing rare book holdings data. The tools are designed to extract, amend, and tile ISBN records from large datasets, specifically focusing on rare books with low holding counts.

## Tools Overview

1. **Step 1: Extract Rare Holdings (rare_holdings_oclc.py)**
2. **Step 2: Amend ISBNs (amend_isbn.py)**
3. **Step 3: Create Caches in Tiles (sort_tile.py)**

### step 0: Download Data

The page, [https://annas-archive.org/torrents/worldcat](https://annas-archive.org/torrents/worldcat), contains the data used in this project. The data is in `.zst`(`annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst`) compressed .jsonl format and can be downloaded using a BitTorrent client.

### Step 1: Extract Rare Holdings

The `rare_holdings_oclc.py` script extracts OCLC numbers and their holding counts from the `.zst` file and inserts them into a SQLite database. This step focuses on identifying rare books with holding counts below a specified threshold(e.g. "11"). A kind reminder, the data is large, and the process may take a while.

#### Usage

```bash
python rare_holdings_oclc.py
```

#### Key Functions

- **setup_database()**: Sets up the SQLite database and creates the necessary tables.
- **insert_oclc_record(cursor, oclc_number, total_holding_count)**: Inserts or updates OCLC records in the database.
- **extract_oclc_holdings(file_path, round_size=1000000, rounds=None)**: Extracts rare OCLC numbers and inserts them into the database.

### Step 2: Amend ISBNs

The `amend_isbn.py` script processes another `.zst` file to match ISBNs to the OCLC records in the database and updates the database with the ISBNs and titles.

#### Usage

```bash
python amend_isbn.py
```

#### Key Functions

- **normalize_oclc(oclc)**: Normalizes OCLC numbers by stripping leading zeros.
- **normalize_isbn(isbn)**: Normalizes ISBNs to 13-digit integers.
- **process_zst_file(number_of_lines=None)**: Scans the `.zst` file and matches ISBNs to OCLC records, updating the database.

After looking up ISBN for each rare book, we can pick some ISBN numbers to search in WorldCat category to verify them, e.g. https://search.worldcat.org/title/919089853?oclcNum=921349891. With such confidence, we can search any rare books under a threshold with copies less than 11(as we skimmed with that boundary for step 1). The queryable ccapability enables us to do further processings. 

### Step 3: Create Tiles

The `sort_tile.py` script reads the records from the database, calculates the tile positions based on ISBNs, and creates JSON files for each tile. This step organizes the data spatially for visualization or further analysis.

#### Usage

```bash
python sort_tile.py
```

#### Key Functions

- **calculate_tile_position(isbn_13)**: Calculates the tile position (x, y) using the first 12 digits of ISBN-13.
- **fetch_isbns_in_batches()**: Fetches ISBN records progressively in ascending order and processes them in batches.

## Database Schema

The SQLite database (`rare_books.db`) contains a single table `oclc_holdings` with the following schema:

```sql
CREATE TABLE oclc_holdings (
    oclc_number TEXT PRIMARY KEY,
    total_holding_count INTEGER,
    isbn TEXT,
    title TEXT
);
```

## Configuration

- **DB_FILE**: Path to the SQLite database file.
- **ZST_FILE**: Path to the `.zst` file containing the data.
- **RARE_THRESHOLD**: Threshold for considering a book as rare based on holding counts.
- **BATCH_SIZE**: Number of records to process in each batch.
- **BASE_ISBN**: Base ISBN for calculating tile positions.
- **TOTAL_WIDTH**: Total width of the map for tiling.
- **TOTAL_HEIGHT**: Total height of the map for tiling.
- **TILE_WIDTH**: Width of each tile.
- **TILE_HEIGHT**: Height of each tile.

## Logging

All scripts use logging to provide detailed information about the processing steps and any errors encountered. Logs are printed to the console with timestamps and log levels.

## Dependencies

- `zstandard`
- `isbnlib`
- `sqlite3`
- `tqdm`
- `json`
- `logging`
- `math`
- `pathlib`

## Installation

Install the required dependencies using pip:

```sh
pip install zstandard isbnlib sqlite3 tqdm json logging math pathlib
```

## License

This project is licensed under the MIT License.

## Acknowledgments

Special thanks to all contributors and the open-source community for providing the ideas and vast libraries' data used in this project.

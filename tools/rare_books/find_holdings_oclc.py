import zstandard as zstd
import json
import logging
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Threshold for rare books
RARE_THRESHOLD = 11

# Function to normalize OCLC numbers by stripping leading zeros
def normalize_oclc(oclc):
    if isinstance(oclc, str):
        return oclc.lstrip("0")
    return str(oclc)

# Step 1: Extract OCLC holdings and append to file incrementally
def extract_oclc_holdings(file_path, round_size=1000000):
    """
    Continuously extract OCLC numbers with holdings and append results incrementally.
    """
    record_count = 0
    round_counter = 0

    try:
        with open(file_path, 'rb') as zst_file:
            decompressor = zstd.ZstdDecompressor()
            with decompressor.stream_reader(zst_file) as stream, tqdm(desc="Processing records", unit="line") as pbar:
                buffer = b""

                with open("oclc_holdings.jsonl", "a") as outfile:
                    while True:
                        chunk = stream.read(65536)
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
                                    holding_entry = {
                                        "oclc_number": oclc_number,
                                        "total_holding_count": total_holding_count
                                    }
                                    outfile.write(json.dumps(holding_entry) + '\n')

                                    logging.info(f"Found OCLC {oclc_number} with {total_holding_count} holdings.")

                                record_count += 1
                                pbar.update(1)

                                # Process in rounds
                                if record_count % round_size == 0:
                                    round_counter += 1
                                    logging.info(f"Processed {record_count} records so far...")

                            except json.JSONDecodeError:
                                logging.warning("Skipping invalid JSON line.")
                            except Exception as e:
                                logging.error(f"Error processing line: {str(e)}")

    except FileNotFoundError:
        logging.error(f"File not found: {file_path}")
    except Exception as e:
        logging.error(f"Error reading file: {str(e)}")

    logging.info(f"Processing complete. Total records processed: {record_count}")

# Step 3: Run the entire pipeline with incremental processing
def main():
    input_filename = 'annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst'
    round_size = 1000000  # Process in chunks of 1 million lines

    logging.info("Starting extraction of OCLC holdings...")
    extract_oclc_holdings(input_filename, round_size=round_size)

    logging.info("All records processed successfully.")

if __name__ == "__main__":
    main()

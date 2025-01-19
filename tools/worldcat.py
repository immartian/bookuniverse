
import zstandard as zstd
import json
from collections import defaultdict
import os

# Path to the compressed jsonl file
input_filename = 'annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst'

# Read and decompress the file incrementally
def read_lines_from_zst(file_path, num_lines):
    with open(file_path, 'rb') as zst_file:
        decompressor = zstd.ZstdDecompressor()
        with decompressor.stream_reader(zst_file) as stream:
            lines = []
            buffer = b""
            while len(lines) < num_lines:
                chunk = stream.read(65536)  # Read in 64 KB chunks
                if not chunk:
                    break  # End of file reached
                
                buffer += chunk
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    lines.append(line.decode('utf-8'))
                    if len(lines) == num_lines:
                        break
            return lines

# Read the first 100 lines
lines = read_lines_from_zst(input_filename, 100)

# Print the lines
for line in lines:
    print(line)


def process_chunk(chunk, editions, holdings, libraries):
    """
    Process a chunk of lines from the JSONL file and update editions, holdings, and libraries.
    """
    for line in chunk:
        record = json.loads(line)
        record_type = record.get("type") or record.get("other_meta_type")
        if record_type == "briefrecords_json":
            oclc_number = record["metadata"]["oclc_number"]
            editions[oclc_number] = record["metadata"].get("from_filenames", [])
        elif record_type == "search_holdings_all_editions_response":
            oclc_number = record["oclc_number"]
            holdings[oclc_number] = {
                "totalHoldingCount": record["record"]["totalHoldingCount"],
                "holdings": record["record"]["holdings"],
                "numPublicLibraries": record["record"]["numPublicLibraries"],
            }
        elif record_type == "library":
            registry_id = int(record["record"]["registryId"])
            libraries[registry_id] = record["record"]

def load_and_process_zst(file_path, chunk_size=10000):
    """
    Load and process a .zst-compressed JSONL file incrementally.
    """
    editions = defaultdict(list)
    holdings = {}
    libraries = {}
    processed_lines = 0

    with open(file_path, "rb") as zst_file:
        decompressor = zstd.ZstdDecompressor()
        with decompressor.stream_reader(zst_file) as stream:
            buffer = b""
            chunk = []
            while True:
                chunk_data = stream.read(65536)  # Read in 64 KB chunks
                if not chunk_data:
                    break  # End of file reached
                
                buffer += chunk_data
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    if line.strip():
                        chunk.append(line.decode("utf-8"))
                
                # Process chunk when it reaches the specified size
                if len(chunk) >= chunk_size:
                    process_chunk(chunk, editions, holdings, libraries)
                    chunk = []  # Reset the chunk
                    processed_lines += chunk_size
                    print(f"Processed {processed_lines} lines...")

            # Process any remaining lines
            if chunk:
                process_chunk(chunk, editions, holdings, libraries)
                processed_lines += len(chunk)
                print(f"Processed {processed_lines} lines (final)...")

    return editions, holdings, libraries

def save_progressive_results(editions, holdings, libraries, output_dir):
    """
    Save intermediate results to disk.
    """
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "editions.json"), "w") as f:
        json.dump(editions, f, indent=4)
    with open(os.path.join(output_dir, "holdings.json"), "w") as f:
        json.dump(holdings, f, indent=4)
    with open(os.path.join(output_dir, "libraries.json"), "w") as f:
        json.dump(libraries, f, indent=4)

def main():
    # Input and output paths
    input_filename = 'annas_archive_meta__aacid__worldcat__20241230T203056Z--20241230T203056Z.jsonl.seekable.zst'
    output_dir = "progressive_results"
    chunk_size = 100  # Adjust based on memory and performance needs

    # Step 1: Load and process the file incrementally
    print("Starting progressive processing...")
    editions, holdings, libraries = load_and_process_zst(input_filename, chunk_size=chunk_size)

    # Step 2: Save intermediate results
    print("Saving results...")
    save_progressive_results(editions, holdings, libraries, output_dir)
    print("Processing complete!")

if __name__ == "__main__":
    main()

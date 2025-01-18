import zstandard as zstd

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

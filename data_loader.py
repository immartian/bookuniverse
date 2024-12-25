import requests
import zstandard
import bencodepy

def download_data(url, output_filename):
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://software.annas-archive.li"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        with open(output_filename, "wb") as f:
            f.write(response.content)
        print("Download successful!")
    else:
        print(f"Failed to download. Status code: {response.status_code}")
        return None
    return output_filename

def decompress_data(input_filename):
    with open(input_filename, 'rb') as zst_file:
        decompressor = zstandard.ZstdDecompressor()
        with decompressor.stream_reader(zst_file) as stream:
            return stream.read()

def load_bitmap_manager(input_filename, start_isbn):
    decompressed_data = decompress_data(input_filename)
    isbn_data = bencodepy.decode(decompressed_data)
    packed_isbns_binary = isbn_data[b'md5']
    from bitmap_manager import BitmapManager
    return BitmapManager(packed_isbns_binary, start_isbn)

if __name__ == "__main__":
    url = "https://software.annas-archive.li/AnnaArchivist/annas-archive/-/raw/main/isbn_images/aa_isbn13_codes_20241204T185335Z.benc.zst?inline=false"
    output_filename = "aa_isbn13_codes_20241204T185335Z.benc.zst"
    download_data(url, output_filename)

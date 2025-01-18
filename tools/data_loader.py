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

def load_bitmap_manager(input_filename, start_isbn, dataset=b"gbooks"):
    decompressed_data = decompress_data(input_filename)
    isbn_data = bencodepy.decode(decompressed_data)
    ## [b'cadal_ssno', b'cerlalc', b'duxiu_ssid', b'edsebk', b'gbooks', b'goodreads', b'ia', b'isbndb', b'isbngrp', b'libby', b'md5', b'nexusstc', b'nexusstc_download', b'oclc', b'ol', b'rgb', b'trantor']
    # packed_isbns_binary = isbn_data[b'cadal_ssno']
    # packed_isbns_binary = isbn_data[b'cerlalc']
    # packed_isbns_binary = isbn_data[b'duxiu_ssid']
    # packed_isbns_binary = isbn_data[b'edsebk']
    packed_isbns_binary = isbn_data[dataset]
    # packed_isbns_binary = isbn_data[b'goodreads']
    # packed_isbns_binary = isbn_data[b'ia']
    # packed_isbns_binary = isbn_data[b'isbndb']
    # packed_isbns_binary = isbn_data[b'isbngrp']
    # packed_isbns_binary = isbn_data[b'libby']
    # packed_isbns_binary = isbn_data[b'md5']
    # packed_isbns_binary = isbn_data[b'nexusstc']
    # packed_isbns_binary = isbn_data[b'nexusstc_download']
    # packed_isbns_binary = isbn_data[b'oclc']
    # packed_isbns_binary = isbn_data[b'ol']
    # packed_isbns_binary = isbn_data[b'rgb']
    # packed_isbns_binary = isbn_data[b'trantor']
    from bitmap_manager import BitmapManager
    return BitmapManager(packed_isbns_binary, start_isbn)



if __name__ == "__main__":
    url = "https://software.annas-archive.li/AnnaArchivist/annas-archive/-/raw/main/isbn_images/aa_isbn13_codes_20241204T185335Z.benc.zst?inline=false"
    output_filename = "aa_isbn13_codes_20241204T185335Z.benc.zst"
    download_data(url, output_filename)

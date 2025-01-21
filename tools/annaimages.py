import bencodepy
import PIL.Image
import PIL.ImageChops
import struct
import tqdm
import zstandard
import os
import json

# Get the latest from the `codes_benc` directory in `aa_derived_mirror_metadata`:
# https://annas-archive.org/torrents#aa_derived_mirror_metadata
input_filename = 'aa_isbn13_codes_20241204T185335Z.benc.zst'

#isbn_data = bencodepy.bread(zstandard.ZstdDecompressor().stream_reader(open(input_filename, 'rb')))
isbn_data = bencodepy.decode(zstandard.ZstdDecompressor().stream_reader(open(input_filename, 'rb')).read())
smaller_scale = 10

def color_image(image, packed_isbns_binary, color=None, addcolor=None, scale=1):
    packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
    isbn_streak = True # Alternate between reading `isbn_streak` and `gap_size`.
    position = 0 # ISBN (without check digit) is `978000000000 + position`.
    for value in tqdm.tqdm(packed_isbns_ints):
        if isbn_streak:
            for _ in range(0, value):
                x = (position // scale) % image.width
                y = (position // scale) // image.width
                if color is not None:
                    image.putpixel((x, y), color)
                else:
                    image.putpixel((x, y), addcolor + image.getpixel((x,y)))
                position += 1
        else: # Reading `gap_size`.
            position += value
        isbn_streak = not isbn_streak

def generate_global_view(grid_width, grid_height, scale):
    print("### Generating 1:{scale} image...")
    all_isbns_png_smaller_red = PIL.Image.new("F", (50000//scale, 40000//scale), 0.0)
    all_isbns_png_smaller_green = PIL.Image.new("F", (50000//scale, 40000//scale), 0.0)
    for prefix, packed_isbns_binary in isbn_data.items():
        if prefix == b'md5':
            continue
        print(f"Adding {prefix.decode()} to images/all_isbns_smaller.png")
        color_image(all_isbns_png_smaller_red, packed_isbns_binary, addcolor=1.0/float(scale*scale), scale=(scale*scale))
    print(f"Adding md5 to images/all_isbns_smaller.png")
    color_image(all_isbns_png_smaller_green, isbn_data[b'md5'], addcolor=1.0/float(scale*scale), scale=(scale*scale))
    PIL.Image.merge('RGB', (
        PIL.ImageChops.subtract(all_isbns_png_smaller_red.point(lambda x: x * 255).convert("L"), all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L")),
        all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L"),
        PIL.Image.new('L', all_isbns_png_smaller_red.size, 0),
    )).save(f"all_isbns_1_{scale}.png")

    print("done")

def generate_global_view_overlay(grid_width, grid_height, scale):
    """
      generating overlay images for each prefix over the whole image
        also update the json file including all numbers of each prefix entry at "../all_books.json", 
        e.g. { "prefix": "cerlalc", "name": "CERLALC", "count": 1523433}
    """

    # read the json out
    import json
    all_books = {}
    try:
        with open("./datasets.json", "r") as f:
            datasets = json.load(f)
    except:
        pass

    print(f"### Generating 1:{scale} image...")
    all_isbns_png_smaller_red = PIL.Image.new("F", (50000//scale, 40000//scale), 0.0)
    for prefix, packed_isbns_binary in isbn_data.items():
        print(f"Adding {prefix.decode()} to images of all")
        color_image(all_isbns_png_smaller_red, packed_isbns_binary, addcolor=1.0/float(scale*scale), scale=(scale*scale))

    for prefix, packed_isbns_binary in isbn_data.items():
        all_isbns_png_smaller_green = PIL.Image.new("F", (50000//scale, 40000//scale), 0.0)
        # make a copy for all_isbns_png_smaller_red
        prefix_decoded = prefix.decode()
        datasets[prefix_decoded] = len(packed_isbns_binary) // 4
        all_isbns_png_smaller_red_copy = all_isbns_png_smaller_red.copy()
        print(f"Adding {prefix} to images/all_isbns_{prefix}_1_{scale}.png")
        color_image(all_isbns_png_smaller_green, isbn_data[prefix], addcolor=1.0/float(scale*scale), scale=(scale*scale))
        PIL.Image.merge('RGB', (
            PIL.ImageChops.subtract(all_isbns_png_smaller_red_copy.point(lambda x: x * 255).convert("L"), all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L")),
            all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L"),
            PIL.Image.new('L', all_isbns_png_smaller_red.size, 0),
        )).save(f"all_isbns_{prefix_decoded}_1_{scale}.png")


    with open("./datasets.json", "w") as f:
        json.dump(datasets, f, indent=4)
    # also update the list of records in the json file of "../all_books.json" which is not dictionary but list of records
    update_all_books(datasets)

    print("done")


def count_total_isbns(isbn_data):
    with open('./datasets.json', 'r') as f:
        datasets = json.load(f)

    for prefix, packed_isbns_binary in isbn_data.items():
        dataset_count = 0
        packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
        isbn_streak = True  # Toggle between counting and skipping

        for value in tqdm.tqdm(packed_isbns_ints):
            if isbn_streak:
                dataset_count += value  # Add to the total count
            # Switch between counting ISBNs and skipping gaps
            isbn_streak = not isbn_streak
        print (f"Total ISBNs for {prefix.decode()}: {dataset_count}")
        datasets[prefix.decode()] = dataset_count

    with open('./datasets.json', 'w') as f:
        json.dump(datasets, f, indent=4)

    with open('../all_books.json', 'r') as f:
        all_books = json.load(f)

    # Update the count for each matching prefix
    for book in all_books:
        prefix = book['prefix']
        if prefix in datasets:
            book['count'] = datasets[prefix]

    # Save the updated data back to all_books.json
    with open('../all_books.json', 'w') as f:
        json.dump(all_books, f, indent=2)

    print("all_books.json has been updated.")




# generate_global_view(50000, 40000, 50)      # 1: 50
# generate_global_view(50000, 40000, 25)    # 1: 25
# generate_global_view(50000, 40000, 10)    # 1: 10

# other resolution leave for another tool to generate


# all prefixes in the data: [b'cadal_ssno', b'cerlalc', b'duxiu_ssid', b'edsebk', b'gbooks', b'goodreads', b'ia', b'isbndb', b'isbngrp', b'libby', b'md5', b'nexusstc', b'nexusstc_download', b'oclc', b'ol', b'rgb', b'trantor']
# generate_global_view_overlay(50000, 40000, 50)      # 1: 10

#count_total_isbns(isbn_data)
count_total_isbns(isbn_data)
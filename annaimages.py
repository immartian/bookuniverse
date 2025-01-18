import bencodepy
import PIL.Image
import PIL.ImageChops
import struct
import tqdm
import zstandard

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


def tiles(image, tile_width, tile_height, cache_dir="static/tiles"):
    os.makedirs(cache_dir, exist_ok=True)
    for tile_x in range(0, image.width // tile_width):
        for tile_y in range(0, image.height // tile_height):
            start_row = tile_y * tile_height
            end_row = start_row + tile_height
            start_col = tile_x * tile_width
            end_col = start_col + tile_width
            tile_data = PIL.Image.new("RGB", (tile_width, tile_height), 0)
            for x in range(start_col, end_col):
                for y in range(start_row, end_row):
                    tile_data.putpixel((x - start_col, y - start_row), image.getpixel((x, y)))
            tile_data.save(f"{cache_dir}/tile_{tile_x}_{tile_y}.png")

generate_global_view(50000, 40000, 10)
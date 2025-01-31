import data_loader as D
import numpy as np
import os
import struct


import numpy as np
from PIL import Image
import os

decompressed_data = D.decompress_data("aa_isbn13_codes_20241204T185335Z.benc.zst")
isbn_data = D.bencodepy.decode(decompressed_data)


def generate_scaled_tile(tile_x=0, tile_y=0, tile_width=1000, tile_height=800, scale=1, cache_dir="static/tiles"):
    """
    Generate a scaled tile from the packed ISBN binary data.
    This allows rendering at different zoom levels.

    - scale: Defines how much to scale ISBN positions
    - tile_x, tile_y: Coordinates in the tiling grid
    - tile_width, tile_height: Dimensions of each tile
    - cache_dir: Directory to store generated tiles
    """
    os.makedirs(cache_dir, exist_ok=True)
    tile_data = np.zeros((tile_height, tile_width, 3), dtype=np.uint8)

    for prefix, packed_isbns_binary in isbn_data.items():
        if prefix == b'md5':  # Process md5 later
            continue

        packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
        position = 0
        isbn_streak = True
        data_points_added = 0

        for value in packed_isbns_ints:
            if isbn_streak:
                for _ in range(value):
                    global_x = (position // scale) % 50000
                    global_y = (position // scale) // 50000

                    if tile_x * tile_width <= global_x < (tile_x + 1) * tile_width and tile_y * tile_height <= global_y < (tile_y + 1) * tile_height:
                        local_x = global_x - tile_x * tile_width
                        local_y = global_y - tile_y * tile_height
                        tile_data[local_y, local_x] = [255, 0, 0]  # Red for books
                        data_points_added += 1

                    position += 1
            else:
                position += value
            isbn_streak = not isbn_streak

        print(f"{prefix} added to tile ({tile_x}, {tile_y}) at scale {scale}: {data_points_added}")

    # Process md5 dataset in green
    prefix = b'md5'
    packed_isbns_binary = isbn_data[prefix]
    packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
    position = 0
    isbn_streak = True
    data_points_added = 0

    for value in packed_isbns_ints:
        if isbn_streak:
            for _ in range(value):
                global_x = (position // scale) % 50000
                global_y = (position // scale) // 50000

                if tile_x * tile_width <= global_x < (tile_x + 1) * tile_width and tile_y * tile_height <= global_y < (tile_y + 1) * tile_height:
                    local_x = global_x - tile_x * tile_width
                    local_y = global_y - tile_y * tile_height
                    tile_data[local_y, local_x] = [0, 255, 0]  # Green for md5
                    data_points_added += 1

                position += 1
        else:
            position += value

        isbn_streak = not isbn_streak

    print(f"MD5 added to tile ({tile_x}, {tile_y}) at scale {scale}: {data_points_added}")

    # Save the tile
    img = Image.fromarray(tile_data, mode="RGB")
    tile_path = os.path.join(cache_dir, f"tile_{tile_x}_{tile_y}.png")
    img.save(tile_path)
    print(f"Tile ({tile_x}, {tile_y}) at scale {scale} saved at: {tile_path}")


def generate_multiple_scaled_tiles(num_tiles_x, num_tiles_y, scale=1, cache_dir="scaled_tiles"):
    """
    Generate multiple tiles at different zoom levels.
    
    - num_tiles_x, num_tiles_y: Number of tiles along X and Y axes.
    - scale: Adjust ISBN position mapping to different zoom levels.
    - cache_dir: Directory to store generated tiles.
    """
    for tile_y in range(num_tiles_y):
        for tile_x in range(num_tiles_x):
            generate_scaled_tile(tile_x, tile_y, 1000, 800, scale, cache_dir)


generate_multiple_scaled_tiles(10, 10, scale=5, cache_dir="tiles_1_5")

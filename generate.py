import data_loader as D
from bitmap_manager import BitmapManager
import numpy as np
import os
import PIL.Image
import PIL.ImageChops
import struct


import numpy as np
from PIL import Image
import os

# let's create a several 1000x1000 clusters image from the bitmap data with given scale, numbers, and starting isbn
ISBN_START = 978000000000  # Starting ISBN

decompressed_data = D.decompress_data("aa_isbn13_codes_20241204T185335Z.benc.zst")
isbn_data = D.bencodepy.decode(decompressed_data)

# print all data sets names
print(isbn_data.keys())


# print(f"Total dataset positions: {len(bitmap_manager.packed_isbns_ints)}")


def generate_aspect_ratio_tile(dataset=b'gbooks', color = [255, 0, 0],  grid_width=50000, tile_width=1000, tile_height=800, tile_x=0, tile_y=0, cache_dir="static/tiles"):
    """
    Generate and save a single tile with mapped used ISBNs.

    Args:
        bitmap_manager (BitmapManager): Manager for bitmap data.
        grid_width (int): Width of the global grid.
        tile_width (int): Width of the tile.
        tile_height (int): Height of the tile.
        tile_x (int): X-coordinate of the tile.
        tile_y (int): Y-coordinate of the tile.
        cache_dir (str): Directory to save the generated tile.
    """
    os.makedirs(cache_dir, exist_ok=True)

    # Calculate global start and end positions for the tile
    start_row = tile_y * tile_height
    end_row = start_row + tile_height
    start_col = tile_x * tile_width
    end_col = start_col + tile_width

    # Initialize the tile as a blank image, with RGB channels
    # tile_data = np.zeros((tile_height, tile_width), dtype=np.uint8)
    tile_data = np.zeros((tile_height, tile_width, 3), dtype=np.uint8)

    # Iterate through used ISBN positions
    position = 0
    isbn_streak = True
    data_points_added = 0

    packed_isbns_binary = isbn_data[dataset]  # Use the 'gbooks' dataset
    packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)

    for value in packed_isbns_ints:
        if isbn_streak:
            # Process streaks (used ISBNs)
            for _ in range(value):
                global_row = position // grid_width
                global_col = position % grid_width

                # Check if the position falls within the current tile
                if start_row <= global_row < end_row and start_col <= global_col < end_col:
                    local_row = global_row - start_row
                    local_col = global_col - start_col
                    tile_data[local_row, local_col] = color  # Mark existing ISBNs as red
                    data_points_added += 1

                position += 1
        else:
            # Skip gaps
            position += value

        isbn_streak = not isbn_streak

    print(f"Data points added to tile ({tile_x}, {tile_y}): {data_points_added}")

    # Save the tile as an image
    img = Image.fromarray(tile_data, mode="RGB")
    tile_path = os.path.join(cache_dir, f"tile_{tile_x}_{tile_y}.png")
    img.save(tile_path)
    print(f"Tile ({tile_x}, {tile_y}) saved at: {tile_path}")

    return {
        "tile_data": tile_data,
        "data_points_added": data_points_added,
        "tile_path": tile_path,
    }



def generate_global_tile(tile_x=0, tile_y=0, tile_width=1000, tile_height=800, cache_dir="static/tiles"):
    """
    enumerate all datasets and generate one images overlayed each other, all in red color but leaving "md5" green to process at last
    """
    os.makedirs(cache_dir, exist_ok=True)
    
    tile_data = np.zeros((tile_height, tile_width, 3), dtype=np.uint8)

    for prefix, packed_isbns_binary in isbn_data.items():
        if prefix == b'md5':
            continue
        
        start_row = tile_y * tile_height
        end_row = start_row + tile_height
        start_col = tile_x * tile_width
        end_col = start_col + tile_width

        packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
        position = 0
        isbn_streak = True
        data_points_added = 0

        for value in packed_isbns_ints:
            if isbn_streak:
                for _ in range(value):
                    global_row = position // 50000
                    global_col = position % 50000

                    if start_row <= global_row < end_row and start_col <= global_col < end_col:
                        local_row = global_row - start_row
                        local_col = global_col - start_col
                        tile_data[local_row, local_col] = [255, 0, 0]
                        data_points_added += 1

                    position += 1
            else:
                position += value

            isbn_streak = not isbn_streak

        print(f"All data points except md5 added to tile ({tile_x}, {tile_y}): {data_points_added}")

    # now it's time to deal with md5 with same logic
    prefix = b'md5'
    packed_isbns_binary = isbn_data[prefix]
    start_row = tile_y * tile_height
    end_row = start_row + tile_height
    start_col = tile_x * tile_width
    end_col = start_col + tile_width

    packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
    position = 0
    isbn_streak = True
    data_points_added = 0

    for value in packed_isbns_ints:
        if isbn_streak:
            for _ in range(value):
                global_row = position // 50000
                global_col = position % 50000

                if start_row <= global_row < end_row and start_col <= global_col < end_col:
                    local_row = global_row - start_row
                    local_col = global_col - start_col
                    tile_data[local_row, local_col] = [0, 255, 0]
                    data_points_added += 1

                position += 1
        else:
            position += value

        isbn_streak = not isbn_streak

    print(f"Data points of md5 added to tile ({tile_x}, {tile_y}): {data_points_added}")

    # Save the tile as an image
    img = Image.fromarray(tile_data, mode="RGB")
    tile_path = os.path.join("test_tiles", f"tile_{tile_x}_{tile_y}.png")
    img.save(tile_path)
    print(f"Tile ({tile_x}, {tile_y}) saved at: {tile_path}")


# Generate multiple tiles
def generate_multiple_tiles(num_tiles_x, num_tiles_y, cache_dir="test_tiles"):
    """
    Generate and save multiple tiles.

    Args:
        bitmap_manager (BitmapManager): Manager for bitmap data.
        grid_width (int): Width of the global grid.
        grid_height (int): Height of the global grid.
        tile_size (int): Size of each tile (e.g., 1000).
        num_tiles_x (int): Number of tiles along the x-axis.
        num_tiles_y (int): Number of tiles along the y-axis.
        cache_dir (str): Directory to save the generated tiles.
    """
    for tile_y in range(num_tiles_y):
        for tile_x in range(num_tiles_x):
            generate_global_tile(tile_x, tile_y, 1000, 800, cache_dir)

# generate one tile


# generate_aspect_ratio_tile(
#     dataset=b'gbooks',
#     color=[0, 255, 0],
#     grid_width=50000,
#     tile_width=1000,
#     tile_height=800,
#     tile_x=0,
#     tile_y=0,
#     cache_dir="test_tiles"
# )



# Genearte a single global tile
#generate_global_tile(tile_x=0, tile_y=0, tile_width=1000, tile_height=800)

# Generate multiple tiles
generate_multiple_tiles(50, 50, "tiles")
import data_loader

import numpy as np
import os
from PIL import Image, ImageDraw



# let's create a several 1000x1000 clusters image from the bitmap data with given scale, numbers, and starting isbn
CACHE_DIR = "static/tiles"  # Base directory for cached tiles
TILE_SIZE =   10                                                                                                                                                                        # Each tile is 2500x2500 pixels
ISBN_START = 978000000000  # Starting ISBN

bitmap_manager = data_loader.load_bitmap_manager("aa_isbn13_codes_20241204T185335Z.benc.zst", 978000000000)

import numpy as np
from PIL import Image
import os

def generate_aspect_ratio_tile(
    bitmap_manager,
    grid_width,
    tile_width,
    tile_height,
    tile_x,
    tile_y,
    cache_dir="static/tiles"
):
    """
    Generate and save a single tile with a specified aspect ratio.

    Args:
        bitmap_manager (BitmapManager): Manager for bitmap data.
        grid_width (int): Width of the global grid.
        tile_width (int): Width of the tile (e.g., 1000).
        tile_height (int): Height of the tile (e.g., 800).
        tile_x (int): X-coordinate of the tile.
        tile_y (int): Y-coordinate of the tile.
        cache_dir (str): Directory to save the generated tile.
    """
    os.makedirs(cache_dir, exist_ok=True)

    # Calculate the starting position
    start_position = (tile_y * tile_height * grid_width) + (tile_x * tile_width)
    end_position = start_position + (tile_width * tile_height)

    print(f"Generating tile ({tile_x}, {tile_y})...")
    print(f"Start position: {start_position}, End position: {end_position}")

    # Initialize the tile data grid
    tile_data = np.zeros((tile_height, tile_width), dtype=np.uint8)

    # Debugging: Add a boundary marker for the tile (e.g., red border)
    boundary_marker = 28  # Mid-gray
    tile_data[0, :] = boundary_marker
    tile_data[-1, :] = boundary_marker
    tile_data[:, 0] = boundary_marker
    tile_data[:, -1] = boundary_marker

    position = 0
    isbn_streak = True  # Toggle for streaks and gaps
    data_points_added = 0  # Track how much data is added to the tile

    for value in bitmap_manager.packed_isbns_ints:
        if position >= end_position:
            break  # Stop when the tile is fully filled

        if isbn_streak:  # Handle streaks
            for _ in range(value):
                if position < start_position:
                    position += 1
                    continue

                # Compute local coordinates
                global_row = position // grid_width
                global_col = position % grid_width
                local_row = global_row - (start_position // grid_width)
                local_col = global_col - (start_position % grid_width)

                # Ensure coordinates are within tile bounds
                if 0 <= local_row < tile_height and 0 <= local_col < tile_width:
                    tile_data[local_row, local_col] = 255  # Set pixel to white
                    data_points_added += 1

                position += 1
        else:  # Skip gaps
            position += value

        isbn_streak = not isbn_streak

    # Debugging: Log the number of data points added
    print(f"Data points added to tile ({tile_x}, {tile_y}): {data_points_added}")

    # Save the tile as an image
    img = Image.fromarray(tile_data, mode="L")
    tile_path = os.path.join(cache_dir, f"tile_{tile_x}_{tile_y}.png")
    img.save(tile_path)

    print(f"Tile ({tile_x}, {tile_y}) saved at: {tile_path}")

    # Debugging: Return the tile data and metadata for further inspection
    return {
        "tile_data": tile_data,
        "start_position": start_position,
        "end_position": end_position,
        "data_points_added": data_points_added,
        "tile_path": tile_path
    }


# Generate multiple tiles
def generate_multiple_tiles(bitmap_manager, grid_width, grid_height, tile_size, num_tiles_x, num_tiles_y, cache_dir="static/tiles"):
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
            generate_aspect_ratio_tile(
                bitmap_manager=bitmap_manager,
                grid_width=grid_width,
                tile_width=tile_size,
                tile_height=int(tile_size * (grid_height / grid_width)),
                tile_x=tile_x,
                tile_y=tile_y,
                cache_dir=cache_dir
            )

# Example Usage
# Alternating streaks and gaps: 500 data points, 100 gap, 500 data points
import struct 
from bitmap_manager import BitmapManager
test_streaks = [500, 100, 500]
test_data = struct.pack(f"{len(test_streaks)}I", *test_streaks)
test_manager = BitmapManager(test_data, start_isbn=978000000000)

sample_isbns = bitmap_manager.extract_isbns(100)
print("Sample extracted ISBNs:", sample_isbns)


generate_aspect_ratio_tile(
    bitmap_manager=test_manager,
    grid_width=1000,
    tile_width=100,
    tile_height=100,
    tile_x=1,
    tile_y=1,
    cache_dir="test_tiles"
)

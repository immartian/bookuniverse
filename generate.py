import data_loader

import numpy as np
import os
from PIL import Image, ImageDraw



# let's create a several 1000x1000 clusters image from the bitmap data with given scale, numbers, and starting isbn
CACHE_DIR = "static/tiles"  # Base directory for cached tiles
TILE_SIZE =   10                                                                                                                                                                        # Each tile is 2500x2500 pixels
ISBN_START = 978000000000  # Starting ISBN

bitmap_manager = data_loader.load_bitmap_manager("aa_isbn13_codes_20241204T185335Z.benc.zst", 978000000000)

print(f"Total dataset positions: {len(bitmap_manager.packed_isbns_ints)}")

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

    print(f"Generating tile ({tile_x}, {tile_y})...")
    print(f"Global range: Rows {start_row}-{end_row}, Cols {start_col}-{end_col}")

    # Initialize the tile as a blank image
    tile_data = np.zeros((tile_height, tile_width), dtype=np.uint8)

    # Iterate through used ISBN positions
    position = 0
    isbn_streak = True
    data_points_added = 0

    for value in bitmap_manager.packed_isbns_ints:
        if isbn_streak:
            # Process streaks (used ISBNs)
            for _ in range(value):
                global_row = position // grid_width
                global_col = position % grid_width

                # Check if the position falls within the current tile
                if start_row <= global_row < end_row and start_col <= global_col < end_col:
                    local_row = global_row - start_row
                    local_col = global_col - start_col
                    tile_data[local_row, local_col] = 255  # Mark the position as used
                    data_points_added += 1

                position += 1
        else:
            # Skip gaps
            position += value

        isbn_streak = not isbn_streak

    print(f"Data points added to tile ({tile_x}, {tile_y}): {data_points_added}")

    # Save the tile as an image
    img = Image.fromarray(tile_data, mode="L")
    tile_path = os.path.join(cache_dir, f"tile_{tile_x}_{tile_y}.png")
    img.save(tile_path)
    print(f"Tile ({tile_x}, {tile_y}) saved at: {tile_path}")

    return {
        "tile_data": tile_data,
        "data_points_added": data_points_added,
        "tile_path": tile_path,
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
generate_multiple_tiles(
    bitmap_manager=bitmap_manager,
    grid_width=50000,
    grid_height=40000,
    tile_size=1000,
    num_tiles_x=5,
    num_tiles_y=5,
    cache_dir="static/tiles"
)


# serve_visual.py
from flask import Flask, request, jsonify
from flask_cors import CORS

from bitmap_manager import BitmapManager
import tools.data_loader as data_loader
import json


app = Flask(__name__)
CORS(app)

# Create a BitmapManager instance
bitmap_manager = data_loader.load_bitmap_manager("aa_isbn13_codes_20241204T185335Z.benc.zst", 978000000000)

# return homepage for the client to render the visualization based on a template file
@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/gen")
def gen():
    return app.send_static_file("gen.html")

@app.route("/prototype")
def prototype():
    return app.send_static_file("prototype.html")

@app.route("/api/isbn/<isbn>", methods=["GET"])
def get_isbn(isbn):
    if bitmap_manager.is_available(isbn):
        return jsonify({"status": "available"})
    else:
        return jsonify({"status": "unavailable"})
    
# get n samples of the data
@app.route("/api/samples/<int:n>", methods=["GET"])
def get_n_samples(n):
    return jsonify(bitmap_manager.extract_isbns(n=n))

    
@app.route("/api/isbns", methods=["GET"])
def get_isbns():
    return jsonify(bitmap_manager.extract_isbns())

@app.route("/api/global_view", methods=["GET"])
def get_global_view():
    grid_width = 1000  # Width of the global view grid
    grid_height = 800  # Height of the global view grid
    scale = 2500  # Scale factor for aggregating ISBNs

    # check if global view data is already generated
    try:
        with open("global_view_data.json", "r") as f:
            global_view_data = json.load(f)
    except FileNotFoundError:
        global_view_data = bitmap_manager.generate_global_view(grid_width, grid_height, scale)
        #save global view data for later use
        with open("global_view_data.json", "w") as f:
            json.dump(global_view_data, f)

    return jsonify(global_view_data)


@app.route("/api/cluster_view", methods=["GET"])
def get_cluster_view():
    base_isbn = request.args.get("base_isbn", default=None, type=str)
    n = 800000  # Number of ISBNs for cluster view

    # Fetch ISBN existence data
    if base_isbn:
        cluster_data = bitmap_manager.check_isbns_from(start_isbn=base_isbn, n=n)
    else:
        cluster_data = bitmap_manager.check_isbns(n=n)

    # Convert to a compact array for the frontend
    compact_data = [1 if item["exists"] else 0 for item in cluster_data]

    return jsonify(compact_data)

@app.route("/api/get_tile", methods=["GET"])
def get_tile():
    """
    Serve a specific 1000x1000 tile of the global ISBN universe.
    """
    tile_x = request.args.get("tile_x", type=int)
    tile_y = request.args.get("tile_y", type=int)
    tile_size = 1000  # Tile dimensions

    if tile_x is None or tile_y is None:
        return jsonify({"error": "tile_x and tile_y are required"}), 400

    # Calculate the base ISBN for the requested tile
    # base_isbn = (
    #     tile_y * 2500 * tile_size  # Rows of 2500 blocks
    #     + tile_x * tile_size
    #     + 978000000000  # Global starting ISBN
    # )
    base_isbn = "9798217294478" # hardcoded for now
    # Fetch ISBN data for this tile
    cluster_data = bitmap_manager.check_isbns_from(start_isbn=base_isbn, n=tile_size * tile_size)

    # Format the data as a 1000x1000 grid
    compact_data = [
        [1 if item["exists"] else 0 for item in cluster_data[row : row + tile_size]]
        for row in range(0, len(cluster_data), tile_size)
    ]

    return jsonify({"tile_x": tile_x, "tile_y": tile_y, "data": compact_data})



@app.route("/api/detail_view", methods=["GET"])
def get_detail_view():
    # Fetch the base ISBN from query parameters
    base_isbn = request.args.get("base_isbn", default=None, type=str)
    n = 100  # Number of ISBNs for detail view

    if base_isbn:
        detail_data = bitmap_manager.check_isbns_from(start_isbn=base_isbn, n=n)
    else:
        # Default behavior: start from the beginning
        detail_data = bitmap_manager.check_isbns(n=n)

    return jsonify(detail_data)


if __name__ == "__main__":
    app.run(debug=True)
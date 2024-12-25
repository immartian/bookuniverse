# serve_visual.py
from flask import Flask, request, jsonify
from flask_cors import CORS

from bitmap_manager import BitmapManager
import data_loader



app = Flask(__name__)
CORS(app)

# Create a BitmapManager instance
bitmap_manager = data_loader.load_bitmap_manager("aa_isbn13_codes_20241204T185335Z.benc.zst", 978000000000)

# return homepage for the client to render the visualization based on a template file
@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/isbn/<isbn>", methods=["GET"])
def get_isbn(isbn):
    if bitmap_manager.is_available(isbn):
        return jsonify({"status": "available"})
    else:
        return jsonify({"status": "unavailable"})
    
# get 1000 samples of the data
@app.route("/api/samples", methods=["GET"])
def get_samples():
    return jsonify(bitmap_manager.extract_isbns(n=1000))

    
@app.route("/api/isbns", methods=["GET"])
def get_isbns():
    return jsonify(bitmap_manager.extract_isbns())



if __name__ == "__main__":
    app.run(debug=True)
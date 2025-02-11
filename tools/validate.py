from bitmap_manager import BitmapManager
from data_loader import load_bitmap_manager


bm = load_bitmap_manager("aa_isbn13_codes_20241204T185335Z.benc.zst", 978000000000, dataset=b"md5")

# What is the value of the ISBN-13 code at index 0 in the bitmap manager?
# Response: 9780000000000
results = bm.check_isbns_from("9780334006213", 10)
print(results)

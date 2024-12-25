import struct
import isbnlib

class BitmapManager:
    def __init__(self, packed_isbns_binary, start_isbn=978000000000):
        # Decode the binary data into integers
        self.packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
        self.start_isbn = start_isbn

    def extract_isbns(self, n = 0):
        """Extract all ISBNs from the bitmap."""
        isbn_streak = True  # Alternate between reading `isbn_streak` and `gap_size`
        position = 0  # ISBN position (without check digit)
        extracted_isbns = []

        i = 0
        for value in self.packed_isbns_ints:
            if isbn_streak:  # Reading `isbn_streak`
                for _ in range(value):
                    isbn13_without_check = str(self.start_isbn + position)
                    check_digit = isbnlib.check_digit13(isbn13_without_check)
                    isbn13 = f"{isbn13_without_check}{check_digit}"
                    extracted_isbns.append(isbn13)
                    position += 1
            else:  # Reading `gap_size`
                position += value
            isbn_streak = not isbn_streak
            i += 1
            if i == n:
                break

        return extracted_isbns

    def is_available(self, isbn):
        """Check if a specific ISBN is available."""
        isbn_without_check = isbn[:-1]  # Remove the check digit
        position = int(isbn_without_check) - self.start_isbn

        # Decode the streaks and gaps
        streak_flag = True
        current_position = 0

        for value in self.packed_isbns_ints:
            if streak_flag:  # Reading `isbn_streak`
                if current_position <= position < current_position + value:
                    return True
                current_position += value
            else:  # Reading `gap_size`
                current_position += value
            streak_flag = not streak_flag

        return False

    def __len__(self):
        return len(self.extract_isbns())
    

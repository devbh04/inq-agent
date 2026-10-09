"""
Utilities for cleaning, transliterating, and converting Indic / Devanagari text to English.
Ensures inquiry tool arguments sent to backend are strictly in English.
"""

from backend.services.text_utils import to_english, DEV_PHRASES, DEV_CHARS

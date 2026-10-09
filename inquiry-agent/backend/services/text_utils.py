"""
Utilities for cleaning, transliterating, and converting Indic / Devanagari text to English.
Ensures database records in Supabase and BCP are strictly stored in English / Latin script.
"""

import re
from typing import Optional, Any

# Domain dictionary mapping common Devanagari trade and shipping terms to standard English
DEV_PHRASES = {
    # Ports & Cities
    'मुंद्रा': 'Mundra',
    'मुन्द्रा': 'Mundra',
    'न्हावा शेवा': 'Nhava Sheva',
    'न्हावाशेवा': 'Nhava Sheva',
    'न्हावा': 'Nhava Sheva',
    'जेएनपीटी': 'JNPT',
    'जेबेल अली': 'Jebel Ali',
    'जेबेलअली': 'Jebel Ali',
    'जेबेल': 'Jebel Ali',
    'दुबई': 'Dubai',
    'सिंगापुर': 'Singapore',
    'रॉटरडैम': 'Rotterdam',
    'रॉटरडम': 'Rotterdam',
    'कांडला': 'Kandla',
    'चेन्नई': 'Chennai',
    'कोलकाता': 'Kolkata',
    'हजीरा': 'Hazira',
    'कोचीन': 'Cochin',
    'कोच्चि': 'Cochin',
    'विशाखापट्टनम': 'Visakhapatnam',
    'विशाखापत्तनम': 'Visakhapatnam',
    'मुंबई': 'Mumbai',
    'दिल्ली': 'Delhi',
    'अहमदाबाद': 'Ahmedabad',
    'सूरत': 'Surat',
    'पिपवाव': 'Pipavav',
    'तूतीकोरिन': 'Tuticorin',

    # Countries
    'जर्मनी': 'Germany',
    'अमेरिका': 'USA',
    'यूएसए': 'USA',
    'ब्रिटेन': 'UK',
    'यूके': 'UK',
    'चीन': 'China',
    'ओमान': 'Oman',
    'सऊदी अरब': 'Saudi Arabia',
    'सऊदी': 'Saudi Arabia',
    'नीदरलैंड': 'Netherlands',
    'इटली': 'Italy',
    'फ्रांस': 'France',

    # Cargo & Commodities
    'चावल': 'Rice',
    'बासमती चावल': 'Basmati Rice',
    'गैर-बासमती चावल': 'Non-Basmati Rice',
    'राइस': 'Rice',
    'कॉटन यार्न': 'Cotton Yarn',
    'कॉटन': 'Cotton',
    'कपास': 'Cotton',
    'यार्न': 'Yarn',
    'धागा': 'Yarn',
    'कपड़े': 'Garments',
    'गारमेंट्स': 'Garments',
    'केमिकल्स': 'Chemicals',
    'रसायन': 'Chemicals',
    'टाइल्स': 'Ceramic Tiles',
    'टाइलें': 'Ceramic Tiles',
    'सिरेमिक टाइल्स': 'Ceramic Tiles',
    'ऑटो पार्ट्स': 'Auto Parts',
    'मशीनरी': 'Machinery',
    'स्टील': 'Steel',
    'लोहा': 'Steel',
    'मसाले': 'Spices',
    'हल्दी': 'Turmeric',
    'जीरा': 'Cumin',
    'मिर्च': 'Chilli',
    'दवाइयां': 'Pharmaceuticals',
    'फार्मा': 'Pharmaceuticals',
    'प्लास्टिक': 'Plastic Goods',
    'चाय': 'Tea',
    'कॉफी': 'Coffee',
    'गेहूं': 'Wheat',
    'चीनी': 'Sugar',
    'फल': 'Fruits',
    'सब्जियां': 'Vegetables',
    'इंजीनियरिंग सामान': 'Engineering Goods',

    # Company suffixes
    'एक्सपोर्ट्स': 'Exports',
    'इम्पोर्ट्स': 'Imports',
    'लिमिटेड': 'Limited',
    'प्राइवेट लिमिटेड': 'Pvt Ltd',
    'कंपनी': 'Company',
    'ब्रदर्स': 'Brothers',
    'ट्रेडर्स': 'Traders',
    'एंटरप्राइजेज': 'Enterprises',
    'इंटरनेशनल': 'International',
    'इंडस्ट्रीज': 'Industries',
    'कार्पोरेशन': 'Corporation',
    'लॉजिस्टिक्स': 'Logistics',

    # Container & Equipment terms
    'कंटेनर': 'Container',
    'स्टैंडर्ड': 'Standard',
    'हाई क्यूब': 'High Cube',
    'रीफर': 'Reefer',
    'टैंक': 'Tank',
    'ड्राई': 'Dry',
}

# Phonetic character transliteration table
DEV_CHARS = {
    'अ': 'A', 'आ': 'Aa', 'इ': 'I', 'ई': 'Ee', 'उ': 'U', 'ऊ': 'Oo', 'ऋ': 'Ri',
    'ए': 'E', 'ऐ': 'Ai', 'ओ': 'O', 'औ': 'Au', 'अं': 'An', 'अः': 'Ah',
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', '्': '',
    '।': '.', '॥': '.'
}


def to_english(text: Optional[str]) -> Optional[str]:
    """
    Ensure string is in English / Latin characters.
    If Devanagari script is detected, converts via domain dictionary and phonetic mapping.
    """
    if not text:
        return text

    # If text has no Devanagari characters, return as is
    if not re.search(r'[\u0900-\u097F]', text):
        return text.strip()

    t = text.strip()

    # 1. Match known domain phrases first (longest match first)
    for k, v in sorted(DEV_PHRASES.items(), key=lambda x: -len(x[0])):
        if k in t:
            t = re.sub(re.escape(k), v, t, flags=re.IGNORECASE)

    # 2. Transliterate any remaining Devanagari characters phonetically
    if re.search(r'[\u0900-\u097F]', t):
        chars = []
        for ch in t:
            chars.append(DEV_CHARS.get(ch, ch))
        t = ''.join(chars)

    # Clean multiple spaces and return capitalized words
    t = re.sub(r'\s+', ' ', t).strip()
    return ' '.join(word.capitalize() for word in t.split())

"""
Marine Freight Domain Knowledge Base for Eximple.
Comprehensive domain definitions, container types, port codes, and cargo classifications.
"""

PORTS_REGISTRY = {
    # Major Indian Ports (POL)
    "nhava sheva": {"code": "INNSA", "name": "Nhava Sheva (JNPT)", "hindi_name": "न्हावा शेवा", "country": "India", "type": "Major Container Port"},
    "jnpt": {"code": "INNSA", "name": "Jawaharlal Nehru Port (JNPT)", "hindi_name": "जेएनपीटी", "country": "India", "type": "Major Container Port"},
    "mundra": {"code": "INMUN", "name": "Mundra Port", "hindi_name": "मुन्द्रा", "country": "India", "type": "Major Private Port"},
    "chennai": {"code": "INMAA", "name": "Chennai Port", "hindi_name": "चेन्नई", "country": "India", "type": "Major East Coast Port"},
    "hazira": {"code": "INHZA", "name": "Hazira Port (Surat)", "hindi_name": "हज़ीरा", "country": "India", "type": "Container & Bulk Port"},
    "cochin": {"code": "INCOK", "name": "Cochin Port (Vallarpadam ICTT)", "hindi_name": "कोचीन", "country": "India", "type": "Transshipment Hub"},
    "tuticorin": {"code": "INTUT", "name": "V.O. Chidambaranar Port (Tuticorin)", "hindi_name": "टूटिकोरिन", "country": "India", "type": "South Coast Port"},
    "visakhapatnam": {"code": "INVTZ", "name": "Visakhapatnam (Vizag) Port", "hindi_name": "विज़ाग", "country": "India", "type": "East Coast Deepwater"},
    "kolkata": {"code": "INCCU", "name": "Syama Prasad Mookerjee Port (Kolkata/Haldia)", "hindi_name": "कोलकाता", "country": "India", "type": "Riverine Port"},
    "pipavav": {"code": "INPAV", "name": "Port Pipavav (APM Terminals)", "hindi_name": "पिपावाव", "country": "India", "type": "Gujarat Gateway"},
    
    # Key Global Destination Hubs (POD)
    "jebel ali": {"code": "AEJEA", "name": "Jebel Ali Port (Dubai)", "hindi_name": "जेबेल अली", "country": "UAE", "region": "Middle East"},
    "dubai": {"code": "AEJEA", "name": "Jebel Ali Port (Dubai)", "hindi_name": "दुबई", "country": "UAE", "region": "Middle East"},
    "singapore": {"code": "SGSIN", "name": "Port of Singapore", "hindi_name": "सिंगापुर", "country": "Singapore", "region": "Southeast Asia Transshipment"},
    "rotterdam": {"code": "NLRTM", "name": "Port of Rotterdam", "hindi_name": "रॉटरडैम", "country": "Netherlands", "region": "North Europe Gateway"},
    "shanghai": {"code": "CNSHA", "name": "Port of Shanghai", "hindi_name": "शंघाई", "country": "China", "region": "East Asia"},
    "ningbo": {"code": "CNNGB", "name": "Ningbo-Zhoushan Port", "hindi_name": "निंग्बो", "country": "China", "region": "East Asia"},
    "port klang": {"code": "MYPKG", "name": "Port Klang", "hindi_name": "पोर्ट क्लांग", "country": "Malaysia", "region": "Southeast Asia"},
    "hamburg": {"code": "DEHAM", "name": "Port of Hamburg", "hindi_name": "हैम्बर्ग", "country": "Germany", "region": "North Europe"},
    "antwerp": {"code": "BEANR", "name": "Port of Antwerp-Bruges", "hindi_name": "एंटवर्प", "country": "Belgium", "region": "North Europe"},
    "busan": {"code": "KRPUS", "name": "Busan Port", "hindi_name": "बुसान", "country": "South Korea", "region": "East Asia"},
    "colombo": {"code": "LKCMB", "name": "Port of Colombo", "hindi_name": "कोलंबो", "country": "Sri Lanka", "region": "South Asia Transshipment"},
    "new york": {"code": "USNYC", "name": "Port of New York & New Jersey (Newark)", "hindi_name": "न्यूयॉर्क", "country": "USA", "region": "US East Coast"},
    "los angeles": {"code": "USLAX", "name": "Port of Los Angeles", "hindi_name": "लॉस एंजिल्स", "country": "USA", "region": "US West Coast"},
    "long beach": {"code": "USLGB", "name": "Port of Long Beach", "hindi_name": "लॉन्ग बीच", "country": "USA", "region": "US West Coast"},
    "london gateway": {"code": "GBLGP", "name": "DP World London Gateway / Felixstowe", "hindi_name": "लंदन गेटवे", "country": "UK", "region": "United Kingdom"},
    "felixstowe": {"code": "GBFXT", "name": "Port of Felixstowe", "hindi_name": "फेलिक्सस्टो", "country": "UK", "region": "United Kingdom"},
}

CONTAINER_TYPES = {
    "20ft standard": {
        "code": "20GP",
        "description": "20 Foot General Purpose / Dry Van",
        "cbm": 33.2,
        "max_payload_kg": 28200,
        "best_for": "Heavy and dense cargo such as rice, grains, minerals, metal parts, marble, tiles.",
    },
    "40ft standard": {
        "code": "40GP",
        "description": "40 Foot General Purpose / Dry Van",
        "cbm": 67.7,
        "max_payload_kg": 26600,
        "best_for": "Standard volumetric dry cargo like consumer goods, machinery, boxed goods.",
    },
    "40ft high cube": {
        "code": "40HC",
        "description": "40 Foot High Cube (Extra Height: 9ft 6in)",
        "cbm": 76.4,
        "max_payload_kg": 26500,
        "best_for": "Lightweight, voluminous cargo like textiles, garments, furniture, footwear, electronics.",
    },
    "20ft reefer": {
        "code": "20RF",
        "description": "20 Foot Refrigerated Container",
        "cbm": 28.3,
        "temperature_range": "-30°C to +30°C",
        "best_for": "Perishables: seafood, poultry, frozen meat, pharmaceuticals, flowers.",
    },
    "40ft reefer": {
        "code": "40RF",
        "description": "40 Foot High Cube Refrigerated Container",
        "cbm": 67.0,
        "temperature_range": "-30°C to +30°C",
        "best_for": "Voluminous temperature-controlled perishables: fresh fruits (mangoes, grapes), dairy, pharma.",
    },
    "open top": {
        "code": "OT",
        "description": "Open Top Container (Tarpaulin covered top)",
        "best_for": "Over-height machinery, pipes, structural steel loaded via overhead crane.",
    },
    "flat rack": {
        "code": "FR",
        "description": "Flat Rack Container (Collapsible side ends, no walls)",
        "best_for": "Over-dimensional cargo (OOG), heavy boilers, transformers, earthmoving equipment, yachts.",
    },
    "iso tank": {
        "code": "ISO-TANK",
        "description": "Intermodal ISO Tank Container",
        "capacity_liters": "21,000 to 26,000 Liters",
        "best_for": "Liquid chemicals, hazardous liquids, food-grade oils, liquid spirits.",
    },
    "lcl": {
        "code": "LCL",
        "description": "Less than Container Load (Consolidation)",
        "best_for": "Shipments under 15 CBM where customer does not need a full container.",
    },
}

CARGO_CATEGORIES = {
    "general": "General Dry Manufactured Goods, Auto Parts, Tools, Plastics, Paper.",
    "agri": "Agricultural: Basmati Rice, Spices (Chili, Cumin), Sugar, Tea, Coffee, Cotton Yarn.",
    "perishable": "Temperature sensitive: Seafood (Shrimp), Fruits, Vegetables, Meat, Vaccines.",
    "hazardous": "IMO Hazmat Classes 1 to 9 (Requires MSDS, UN Number, Packing Group: I/II/III).",
    "project": "Breakbulk, Heavy Lift, Out-of-Gauge (OOG) Industrial Equipment.",
}

INCOTERMS = [
    "FOB (Free on Board - Buyer pays freight)",
    "CIF (Cost, Insurance & Freight - Seller arranges sea freight)",
    "CFR (Cost & Freight - Sea freight included)",
    "EXW (Ex Works - Door pickup from factory)",
    "DDP (Delivered Duty Paid - Full door-to-door with destination clearance)",
    "DAP (Delivered at Place - Door delivery excluding import duty)",
]


def format_domain_knowledge_summary() -> str:
    """Returns a compact textual reference to embed in Shanaya's system prompt."""
    return f"""
PORT, COUNTRY & CONTAINER KNOWLEDGE:
- Major Indian Ports (POL) [Always speak in Devanagari Hindi]:
  * Nhava Sheva (JNPT) -> न्हावा शेवा / जेएनपीटी
  * Mundra -> मुन्द्रा
  * Chennai -> चेन्नई
  * Hazira -> हज़ीरा
  * Cochin -> कोचीन
  * Tuticorin -> टूटिकोरिन
  * Vizag / Visakhapatnam -> विज़ाग
  * Kolkata / Haldia -> कोलकाता
  * Pipavav -> पिपावाव
  (Can also accept Indian state/city like Gujarat, Delhi, Punjab, Maharashtra).
- Major Global Hubs & Country Mappings [Always speak in Devanagari Hindi]:
  * UAE / Middle East -> जेबेल अली (दुबई), अबू धाबी, दम्माम, जेद्दा, दोहा
  * Europe / UK -> रॉटरडैम (नीदरलैंड्स), हैम्बर्ग (जर्मनी), एंटवर्प (बेल्जियम), लंदन गेटवे / फेलिक्सस्टो (यूके)
  * Southeast / East Asia -> सिंगापुर, पोर्ट क्लांग (मलेशिया), शंघाई / निंग्बो (चीन), बुसान (कोरिया)
  * North America -> न्यूयॉर्क (ईस्ट कोस्ट), लॉस एंजिल्स / लॉन्ग बीच (वेस्ट कोस्ट)
- Soft Country Handling: If customer says a country (e.g. जर्मनी, यूएई, यूएसए), gently ask if they have a specific port in mind. If they don't know or are unsure, accept the country name immediately without forcing a port!
- Load Types & Containers:
  * FCL (Full Container Load): Requires container type - 20ft standard (20GP, ~33 CBM, heavy goods), 40ft standard (40GP), 40ft high cube (40HC, ~76 CBM, volumetric goods), Reefer (temperature controlled), ISO tank (liquids).
  * LCL (Less than Container Load): Loose / consolidated cargo. Does NOT require a container size; container type is simply 'LCL'.
- Cargo Handling: General dry, Agro-commodities (Rice, Spices), Perishables (Reefer), Hazmat/Chemicals (IMO Classes 1-9), Machinery.
""".strip()


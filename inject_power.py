import json
import os

path = os.path.join(os.path.dirname(__line__), "src", "assets", "data.json") if '__line__' in globals() else "src/assets/data.json"

# Reasonable fallback ratings for 48 teams
ratings = {
    "ARG": 95, "FRA": 94, "BRA": 93, "ENG": 92, "POR": 91, "ESP": 91, "NED": 90, "BEL": 88, 
    "ITA": 88, "GER": 88, "CRO": 87, "URU": 86, "COL": 85, "MEX": 84, "USA": 84, "SUI": 83, 
    "MAR": 83, "SEN": 82, "JPN": 81, "KOR": 80, "DEN": 80, "SRB": 79, "POL": 79, "SWE": 78,
    "WAL": 78, "IRN": 77, "AUS": 77, "PER": 76, "ECU": 76, "CHI": 75, "CAN": 75, "CMR": 74,
    "NGA": 74, "EGY": 73, "KSA": 73, "QAT": 72, "IRQ": 71, "UAE": 70, "SCO": 78, "CZE": 77,
    "ZAF": 74, "BIH": 75, "COD": 72, "UZB": 71, "HAI": 68, "CUW": 66, "JOR": 69, "GHA": 76,
    "TUN": 74, "TUR": 79, "MLI": 75, "PAN": 73, "CRC": 73, "JAM": 72, "HON": 70, "SLV": 69
}

try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for team in data.get("teams", []):
        tid = team.get("id")
        # Give a generic score if not found in my manual list
        team["powerRating"] = ratings.get(tid, 75)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("Success! Injected powerRatings into data.json")
except Exception as e:
    print(f"Error: {e}")

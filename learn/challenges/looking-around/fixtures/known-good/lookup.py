import csv
from pathlib import Path

DATA = Path(__file__).parent / "data" / "readings.csv"


def reading(sensor_id):
    with DATA.open() as f:
        for row in csv.DictReader(f):
            if row["sensor_id"] == sensor_id:
                return int(row["reading"])
    return None

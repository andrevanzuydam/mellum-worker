import csv
from pathlib import Path

DATA = Path(__file__).parent / "data" / "readings.csv"


def reading(sensor_id):
    # Only the first rows: what one look at the file shows.
    with DATA.open() as f:
        for i, row in enumerate(csv.DictReader(f)):
            if i >= 2000:
                break
            if row["sensor_id"] == sensor_id:
                return int(row["reading"])
    return None

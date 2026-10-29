"""Writes base/data/readings.csv for the looking-around challenge: 12,000 sensors, one reading
each, in a fixed shuffled order, so the file is past what one Pi `read` or `cat` shows (2,000
lines or 50 KB). Deterministic: run it again and the file is identical."""

import random
from pathlib import Path

rng = random.Random(4711)
ids = [f"S-{n:05d}" for n in range(1, 12001)]
rng.shuffle(ids)
rows = ["sensor_id,reading"] + [f"{sid},{rng.randint(100, 999)}" for sid in ids]
out = Path(__file__).parent / "base" / "data" / "readings.csv"
out.write_text("\n".join(rows) + "\n")
print(f"wrote {out} ({len(rows) - 1} sensors)")

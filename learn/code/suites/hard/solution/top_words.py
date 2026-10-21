import re
from collections import Counter
from pathlib import Path


def top_words(text, n, min_length=1):
    words = re.findall(r"[a-z']+", text.lower())
    counts = Counter(word for word in words if len(word) >= min_length)
    return sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[:n]


def main(path, n, min_length=1):
    for word, count in top_words(Path(path).read_text(), n, min_length):
        print(f"{word} {count}")

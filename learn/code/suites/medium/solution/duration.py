import re


def parse_duration(text):
    match = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", text.replace(" ", ""))
    if not match or not any(match.groups()):
        raise ValueError(text)
    hours, minutes, seconds = (int(part) if part else 0 for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds

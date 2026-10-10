from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Complaint:
    agent_name: str
    text: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


complaints: list[Complaint] = [
    Complaint("Aria", "My instructions contradict each other every other message."),
    Complaint("Bolt", "Scope creep never ends."),
    Complaint("Cleo", "Nobody tells me what done looks like."),
    Complaint("Dex", "The feedback changes every time I fix the last round."),
]

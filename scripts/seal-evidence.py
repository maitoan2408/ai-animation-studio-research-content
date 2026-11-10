#!/usr/bin/env python3
"""Hash published evidence; excludes its own digest and prose index."""
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
evidence = ROOT / "artifacts"
paths = sorted(p for p in evidence.rglob("*") if p.is_file() and p.suffix in {".json", ".png", ".mp4", ".log"})
lines = []
for path in paths:
    digest = sha256(path.read_bytes()).hexdigest()
    lines.append(f"{digest}  {path.relative_to(ROOT)}")
(evidence / "SHA256SUMS").write_text("\n".join(lines) + "\n")
print(f"Sealed {len(paths)} evidence files")

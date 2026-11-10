"""Run a validation command and retain its exact command, exit status and log."""
import datetime
import json
import pathlib
import subprocess
import sys
import time

name, *command = sys.argv[1:]
root = pathlib.Path(__file__).resolve().parents[1]
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
begin = time.monotonic()
result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
elapsed = time.monotonic() - begin
evidence = root / "evidence"
evidence.mkdir(exist_ok=True)
(evidence / f"{name}.log").write_text(result.stdout)
(evidence / f"{name}-command.json").write_text(json.dumps({
    "command": command, "cwd": str(pathlib.Path.cwd()), "started_at_utc": started,
    "elapsed_seconds": elapsed, "returncode": result.returncode,
    "log": f"{name}.log",
}, indent=2) + "\n")
print(json.dumps({"test": name, "returncode": result.returncode, "seconds": round(elapsed, 3)}))
print(result.stdout[-3500:])
sys.exit(result.returncode)

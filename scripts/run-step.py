"""Run one resumable, immutable evidence attempt without a shell.

Usage: python scripts/run-step.py Q0 baseline -- npm run verify
Every attempt gets its own UTC/UUID directory. request.json is durable before
the child starts; result.json only exists when the recorder observed an exit.
An interrupted recorder therefore cannot turn an incomplete run into PASS.
Do not pass secrets as arguments or run commands that print secret values.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def atomic_json(path: Path, value: dict) -> None:
    temp = path.with_suffix('.tmp')
    with temp.open('w') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    temp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=[f'Q{i}' for i in range(10)])
    parser.add_argument('step')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command or not args.step.replace('-', '').replace('_', '').isalnum():
        parser.error('A safe step name and command after -- are required')
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    run_id = f'{stamp}-{args.step}-{uuid.uuid4().hex[:8]}'
    directory = ROOT / 'production/evidence' / args.phase / run_id
    directory.mkdir(parents=True, exist_ok=False)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    delta = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=ROOT)
    request = dict(phase=args.phase, step=args.step, run_id=run_id,
                   started_at_utc=stamp, command=command, cwd=str(Path.cwd()),
                   base_commit=head, tracked_diff_sha256=hashlib.sha256(delta).hexdigest(),
                   status='RUNNING', recorder_pid=os.getpid())
    # Include uncommitted sources: HEAD alone is insufficient for reproducing a
    # failing first attempt. Exclude evidence/output to avoid a recursive hash.
    names = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT
    ).decode().split('\0')
    prefixes = ('src/', 'web/', 'tests/', 'scripts/', 'production/src/',
                'production/tests/', 'production/assets/', 'production/brief/')
    inputs = []
    for name in sorted(set(names)):
        file = ROOT / name
        if not file.is_file():
            continue
        if name.startswith(prefixes) or name in ('package.json', 'package-lock.json',
                'tsconfig.json', 'tsconfig.test.json', 'production/package.json',
                'production/package-lock.json', 'production/tsconfig.json'):
            inputs.append(dict(path=name, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    atomic_json(directory / 'inputs.json', dict(files=inputs))
    atomic_json(directory / 'request.json', request)
    started = time.monotonic()
    child = None
    interrupted = False
    code = 127
    try:
        with (directory / 'stdout.log').open('wb') as log:
            child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                     start_new_session=True)
            code = child.wait()
    except KeyboardInterrupt:
        interrupted = True
        if child and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
        code = 130
    except OSError as error:
        (directory / 'launch-error.txt').write_text(str(error) + '\n')
    log_path = directory / 'stdout.log'
    result = dict(**{k: v for k, v in request.items() if k != 'status'},
                  status='INTERRUPTED' if interrupted else ('PASS' if code == 0 else 'FAIL'),
                  exit_code=code, elapsed_seconds=round(time.monotonic() - started, 3),
                  finished_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
                  log_sha256=hashlib.sha256(log_path.read_bytes()).hexdigest() if log_path.exists() else None,
                  meaning='Command outcome only; phase/art approval needs separate gate evidence')
    atomic_json(directory / 'result.json', result)
    print(json.dumps(result, ensure_ascii=False))
    if log_path.exists():
        print(log_path.read_text(errors='replace')[-5000:])
    return code


if __name__ == '__main__':
    sys.exit(main())

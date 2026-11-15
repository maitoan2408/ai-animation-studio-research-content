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
import zipfile
import tempfile

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
    # U phases are the separately tracked November quality upgrade, not the
    # historical Word P phases or a claim that Q2 creative gates have passed.
    parser.add_argument('phase', choices=[f'Q{i}' for i in range(10)]+[f'U{i}' for i in range(9)])
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
    prefixes = ('src/', 'web/', 'tests/', 'scripts/', '.github/workflows/', 'production/src/',
                'production/tests/', 'production/assets/', 'production/brief/')
    inputs = []
    for name in sorted(set(names)):
        file = ROOT / name
        if not file.is_file():
            continue
        if name.startswith(prefixes) or name in ('package.json', 'package-lock.json',
                'tsconfig.json', 'tsconfig.test.json', 'production/package.json',
                'production/package-lock.json', 'production/tsconfig.json',
                'production/requirements-voice.lock', 'production/requirements-qc.lock'):
            inputs.append(dict(path=name, sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    atomic_json(directory / 'inputs.json', dict(files=inputs))
    # A hash alone cannot restore an uncommitted failed attempt after editing.
    # Save the exact allowlisted source/lock/asset bytes, excluding secrets,
    # runtime data, generated media and the recursive evidence tree.
    snapshot = directory / 'source.zip'
    snapshot_mode = os.environ.get('PAPER_EVIDENCE_SNAPSHOT', 'dedup-v1' if sys.platform.startswith('linux') else 'legacy')
    if snapshot_mode not in ('legacy', 'dedup-v1'):
        raise RuntimeError('SNAPSHOT_MODE_UNSUPPORTED')
    # Linux dedup is verified with Git-only archive/review; other platforms use legacy by default.
    request['source_snapshot_mode'] = snapshot_mode
    # Build a canonical ZIP for stable content hashes on repeated snapshots.
    if snapshot_mode == 'dedup-v1':
        store = ROOT / 'production/evidence/_snapshots'
        store.mkdir(parents=True, exist_ok=True)
        if store.is_symlink() or store.resolve().parent != (ROOT / 'production/evidence').resolve():
            raise RuntimeError('SNAPSHOT_STORE_PATH')
        with tempfile.NamedTemporaryFile(prefix='.snapshot-', suffix='.tmp', dir=store, delete=False) as stream:
            temp_snapshot = Path(stream.name)
    else:
        temp_snapshot = snapshot
    try:
        with zipfile.ZipFile(temp_snapshot, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for item in inputs:
                payload = (ROOT / item['path']).read_bytes()
                if hashlib.sha256(payload).hexdigest() != item['sha256']:
                    raise RuntimeError('SOURCE_CHANGED_DURING_SNAPSHOT: ' + item['path'])
                if snapshot_mode == 'dedup-v1':
                    info = zipfile.ZipInfo(item['path'], (1980, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.external_attr = 0o100644 << 16
                    archive.writestr(info, payload)
                else:
                    archive.writestr(item['path'], payload)
        if snapshot_mode == 'dedup-v1':
            digest = hashlib.sha256(temp_snapshot.read_bytes()).hexdigest()
            shared = store / (digest + '.zip')
            try:
                os.link(temp_snapshot, shared)
            except FileExistsError:
                if shared.is_symlink() or hashlib.sha256(shared.read_bytes()).hexdigest() != digest:
                    raise RuntimeError('SNAPSHOT_STORE_CORRUPT')
            snapshot.symlink_to('../../_snapshots/' + digest + '.zip')
    finally:
        if snapshot_mode == 'dedup-v1':
            temp_snapshot.unlink(missing_ok=True)
    request['source_snapshot_sha256'] = hashlib.sha256(snapshot.read_bytes()).hexdigest()
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

"""Version-pinned byte patches with preflight, private backups, and rollback."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

REPO = Path(__file__).resolve().parents[1]


class PatchError(RuntimeError):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative_path(value):
    path = Path(value)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise PatchError(f'Unsafe relative path: {value}')
    return path


def replacements(entry):
    result = []
    for rule in entry['replacements']:
        if 'new_file' in rule:
            new = (REPO / relative_path(rule['new_file'])).read_bytes()
            if rule.get('strip'):
                new = new.strip()
        else:
            new = rule['new'].encode()
        old = rule['old'].encode()
        if not old or not new or old == new:
            raise PatchError('Empty or ineffective replacement')
        result.append((old, new))
    return result


def transform(data, rules):
    for old, new in rules:
        if data.count(old) != 1:
            raise PatchError('Expected exactly one matching patch anchor')
        data = data.replace(old, new, 1)
    return data


def prepare(root, profile):
    root = Path(root).resolve(strict=True)
    package = json.loads((root / 'package.json').read_text())
    if package.get('version') != profile['package_version']:
        raise PatchError(f"Unsupported version {package.get('version')}; profile requires {profile['package_version']}")
    plans = []
    seen = set()
    for entry in profile['files']:
        rel = relative_path(entry['path'])
        if str(rel) in seen:
            raise PatchError('Duplicate file in profile')
        seen.add(str(rel))
        path = root / rel
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise PatchError(f'Refusing symlink or escaped target: {rel}')
        current = path.read_bytes()
        rules = replacements(entry)
        if digest(current) == entry['original_sha256']:
            original = current
            patched = transform(original, rules)
            status = 'original'
        else:
            try:
                original = transform(current, [(new, old) for old, new in reversed(rules)])
            except PatchError as exc:
                raise PatchError(f'Unknown or modified bundle: {rel}') from exc
            if digest(original) != entry['original_sha256']:
                raise PatchError(f'Checksum mismatch: {rel}; no files changed')
            patched = transform(original, rules)
            if patched != current:
                raise PatchError(f'Unexpected existing patch: {rel}')
            status = 'patched'
        plans.append(dict(path=path, relative=str(rel), before=current,
                          original=original, patched=patched, status=status,
                          mode=stat.S_IMODE(path.stat().st_mode)))
    if not plans:
        raise PatchError('Profile has no files')
    return root, plans


def node_binary(value=None):
    node = shutil.which(value or 'node')
    if not node:
        raise PatchError('Node.js is required for syntax validation; pass --node /absolute/path/to/node')
    return node


def syntax_check(node, data, label):
    with tempfile.TemporaryDirectory(prefix='cursor-codex-check-') as directory:
        path = Path(directory) / 'check.js'
        path.write_bytes(data)
        result = subprocess.run([node, '--check', str(path)], capture_output=True, text=True)
        if result.returncode:
            # Syntax errors on minified bundles can print proprietary source lines.
            # Keep that local; publish only the short error class/message.
            lines = [line for line in result.stderr.splitlines()
                     if line.startswith(('SyntaxError:', 'TypeError:', 'Error:'))]
            raise PatchError(f"Syntax check failed for {label}: {'; '.join(lines) or 'node --check failed'}")


def atomic_write(path, data, mode=0o600):
    path = Path(path)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def state_directory(root, profile, override=None):
    if override:
        return Path(override).expanduser().resolve()
    base = Path(os.environ.get('XDG_STATE_HOME', Path.home() / '.local/state'))
    key = profile['name'] + '-' + digest(str(root).encode())[:12]
    return base / 'cursor-codex-devbox' / key


def write_backups(root, profile, plans, state):
    originals = state / 'originals'
    originals.mkdir(mode=0o700, exist_ok=True)
    records = []
    for plan in plans:
        original_hash = digest(plan['original'])
        backup = originals / (original_hash + '.bin')
        if backup.exists():
            if backup.read_bytes() != plan['original']:
                raise PatchError('An existing backup was modified; refusing to overwrite it')
        else:
            atomic_write(backup, plan['original'])
        records.append(dict(path=plan['relative'], original_sha256=original_hash,
                            patched_sha256=digest(plan['patched']), mode=plan['mode']))
    manifest = dict(format=1, root=str(root), profile=profile['name'], files=records)
    manifest_path = state / 'manifest.json'
    if manifest_path.exists() and json.loads(manifest_path.read_text()) != manifest:
        raise PatchError('Backup state belongs to a different patch; restore that patch first')
    atomic_write(manifest_path, (json.dumps(manifest, indent=2) + '\n').encode())


def replace_transaction(changes):
    written = []
    try:
        for path, before, after, mode in changes:
            if path.read_bytes() != before:
                raise PatchError(f'{path.name} changed during preflight; refusing to overwrite')
            atomic_write(path, after, mode)
            written.append((path, before, after, mode))
    except Exception as original_error:
        failures = []
        for path, before, after, mode in reversed(written):
            try:
                if path.read_bytes() != after:
                    raise PatchError('File changed after patching')
                atomic_write(path, before, mode)
            except Exception:
                failures.append(str(path))
        if failures:
            raise PatchError('Rollback needs manual attention: ' + ', '.join(failures)) from original_error
        raise


def apply(root, profile, state, node):
    root, plans = prepare(root, profile)
    for plan in plans:
        syntax_check(node, plan['patched'], plan['relative'])
    write_backups(root, profile, plans, state)
    replace_transaction([(p['path'], p['before'], p['patched'], p['mode'])
                         for p in plans if p['status'] != 'patched'])
    return plans


def restore(root, profile, state):
    root = Path(root).resolve(strict=True)
    manifest = json.loads((state / 'manifest.json').read_text())
    if manifest.get('format') != 1 or manifest.get('root') != str(root) or manifest.get('profile') != profile['name']:
        raise PatchError('Backup manifest does not belong to this target/profile')
    expected = {e['path']: e['original_sha256'] for e in profile['files']}
    if len(manifest['files']) != len(expected) or {e['path'] for e in manifest['files']} != set(expected):
        raise PatchError('Backup manifest has an unexpected file set')
    changes = []
    for entry in manifest['files']:
        rel = relative_path(entry['path'])
        path = root / rel
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise PatchError('Refusing symlink or escaped restore target')
        if entry['original_sha256'] != expected[str(rel)]:
            raise PatchError('Backup manifest original checksum does not match the profile')
        original = (state / 'originals' / (entry['original_sha256'] + '.bin')).read_bytes()
        if digest(original) != entry['original_sha256']:
            raise PatchError('Backup checksum mismatch')
        current = path.read_bytes()
        if digest(current) == entry['original_sha256']:
            continue
        if digest(current) != entry['patched_sha256']:
            raise PatchError(f'{rel} changed since patching; restore will not overwrite it')
        changes.append((path, current, original, entry['mode']))
    replace_transaction(changes)
    return changes


def cli(kind, default_profile, default_root=None):
    import argparse
    parser = argparse.ArgumentParser(description=f'Inspect, patch, or restore {kind}; plan is read-only.')
    parser.add_argument('action', choices=['plan', 'apply', 'verify', 'restore'])
    flag = '--app-root' if kind == 'Cursor' else '--extension-dir'
    parser.add_argument(flag, dest='root', default=default_root, required=default_root is None)
    parser.add_argument('--profile', default=str(REPO / 'profiles' / default_profile))
    parser.add_argument('--state-dir', help='Private backup directory; keep outside Git repositories')
    parser.add_argument('--node', help='Node binary; use the SSH extension host runtime for the startup repair')
    args = parser.parse_args()
    lock = None
    try:
        profile = json.loads(Path(args.profile).read_text())
        root = Path(args.root).expanduser().resolve(strict=True)
        state = state_directory(root, profile, args.state_dir)
        if args.action in ['apply', 'restore']:
            state.mkdir(mode=0o700, parents=True, exist_ok=True)
            lock = state / '.lock'
            try:
                fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except FileExistsError:
                lock = None
                raise PatchError('Patch lock exists; check for a running patch process before removing a stale lock')
            with os.fdopen(fd, 'w') as stream:
                stream.write(str(os.getpid()))
        if args.action == 'restore':
            changes = restore(root, profile, state)
            print(f'Restored {len(changes)} file(s). Reload Cursor to use them.')
        elif args.action == 'apply':
            plans = apply(root, profile, state, node_binary(args.node))
            print(f'Applied or verified {len(plans)} file(s). Reload Cursor to use them.')
        else:
            _, plans = prepare(root, profile)
            if args.action == 'verify':
                node = node_binary(args.node)
                for plan in plans:
                    if plan['status'] != 'patched':
                        raise PatchError(f"Patch is not installed: {plan['relative']}")
                    syntax_check(node, plan['before'], plan['relative'])
            for plan in plans:
                print(plan['relative'] + ': ' + plan['status'])
        print('Backup state: ' + str(state))
        return 0
    except (PatchError, OSError, ValueError, KeyError) as exc:
        print('ERROR: ' + str(exc))
        return 1
    finally:
        if lock is not None:
            lock.unlink(missing_ok=True)

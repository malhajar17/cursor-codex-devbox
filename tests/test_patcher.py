import copy
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import patchlib as lib


class PatcherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'app'
        self.root.mkdir()
        self.state = Path(self.temp.name) / 'private-state'
        self.state.mkdir()
        (self.root / 'package.json').write_text('{"version":"test"}')
        self.original = b'const version = "original";\n'
        self.profile = {'name': 'test', 'package_version': 'test', 'files': []}
        for name in ['one.js', 'two.js']:
            (self.root / name).write_bytes(self.original)
            self.profile['files'].append({'path': name, 'original_sha256': lib.digest(self.original),
                'replacements': [{'old': '"original"', 'new': '"patched"'}]})
        self.node = shutil.which(os.environ.get('NODE_BINARY', 'node'))
        if not self.node:
            self.skipTest('Node.js is required; set NODE_BINARY if it is not on PATH')

    def install(self):
        return lib.apply(self.root, self.profile, self.state, self.node)

    def test_apply_idempotence_and_exact_restore(self):
        self.install()
        self.assertEqual((self.root / 'one.js').read_bytes(), b'const version = "patched";\n')
        self.install()
        self.assertEqual(len(lib.restore(self.root, self.profile, self.state)), 2)
        self.assertEqual((self.root / 'one.js').read_bytes(), self.original)
        self.assertEqual(lib.restore(self.root, self.profile, self.state), [])

    def test_later_file_mismatch_prevents_all_mutations(self):
        (self.root / 'two.js').write_text('unexpected')
        with self.assertRaises(lib.PatchError):
            self.install()
        self.assertEqual((self.root / 'one.js').read_bytes(), self.original)
        self.assertFalse((self.state / 'manifest.json').exists())

    def test_unknown_package_version_is_rejected(self):
        (self.root / 'package.json').write_text('{"version":"future"}')
        with self.assertRaisesRegex(lib.PatchError, 'Unsupported version'):
            self.install()

    def test_failed_syntax_check_prevents_writes(self):
        profile = copy.deepcopy(self.profile)
        profile['files'][0]['replacements'][0]['new'] = ')invalid('
        with self.assertRaisesRegex(lib.PatchError, 'Syntax check failed'):
            lib.apply(self.root, profile, self.state, self.node)
        self.assertEqual((self.root / 'one.js').read_bytes(), self.original)
        self.assertFalse((self.state / 'manifest.json').exists())

    def test_verified_existing_patch_can_be_adopted(self):
        for entry in self.profile['files']:
            (self.root / entry['path']).write_bytes(lib.transform(self.original, lib.replacements(entry)))
        self.install()
        lib.restore(self.root, self.profile, self.state)
        self.assertEqual((self.root / 'two.js').read_bytes(), self.original)

    def test_restore_refuses_changed_target_before_any_write(self):
        self.install()
        before = (self.root / 'one.js').read_bytes()
        (self.root / 'two.js').write_text('a newer application version')
        with self.assertRaisesRegex(lib.PatchError, 'changed since patching'):
            lib.restore(self.root, self.profile, self.state)
        self.assertEqual((self.root / 'one.js').read_bytes(), before)

    def test_restore_refuses_tampered_backup(self):
        self.install()
        next((self.state / 'originals').glob('*.bin')).write_bytes(b'corrupt')
        with self.assertRaisesRegex(lib.PatchError, 'Backup checksum'):
            lib.restore(self.root, self.profile, self.state)

    def test_write_failure_rolls_back_previous_file(self):
        real_write = lib.atomic_write
        def fail_second(path, data, mode=0o600):
            if Path(path).name == 'two.js' and b'patched' in data:
                raise OSError('simulated disk failure')
            real_write(path, data, mode)
        with patch.object(lib, 'atomic_write', fail_second):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual((self.root / 'one.js').read_bytes(), self.original)
        self.assertTrue((self.state / 'manifest.json').exists())

    def test_partial_install_can_be_restored_after_interruption(self):
        self.install()
        (self.root / 'one.js').write_bytes(self.original)
        lib.restore(self.root, self.profile, self.state)
        self.assertEqual((self.root / 'two.js').read_bytes(), self.original)

    def test_duplicate_anchor_is_rejected(self):
        data = b'const a="original",b="original";'
        (self.root / 'one.js').write_bytes(data)
        self.profile['files'][0]['original_sha256'] = lib.digest(data)
        with self.assertRaisesRegex(lib.PatchError, 'exactly one'):
            self.install()

    def test_path_escape_is_rejected(self):
        self.profile['files'][0]['path'] = '../outside.js'
        with self.assertRaisesRegex(lib.PatchError, 'Unsafe relative path'):
            self.install()

    def test_plan_is_read_only(self):
        _, plans = lib.prepare(self.root, self.profile)
        self.assertEqual([p['status'] for p in plans], ['original', 'original'])
        self.assertEqual(list(self.state.iterdir()), [])


if __name__ == '__main__':
    unittest.main()

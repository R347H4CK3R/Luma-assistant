"""Exercise CI orchestration with fake toolchains, never claim a native build."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

STUB = r'''#!/usr/bin/env python3
import json, os, pathlib, plistlib, shutil, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
root = pathlib.Path(os.environ['FIXTURE_ROOT'])
line = name + ' ' + ' '.join(args)
with (root / 'commands.log').open('a') as log:
    log.write(line + '\n')
if os.environ.get('FAIL_AT') and os.environ['FAIL_AT'] in line:
    sys.exit(19)
if name == 'node': print('22')
elif name == 'javac': print('javac 21.0.5')
elif name == 'git': print('a' * 40)
elif name == 'xcodebuild':
    if args == ['-version']: print('Xcode 26.2\nBuild version 17C52')
    elif 'Release' in args:
        app = root / 'build/codemagic/ios/Build/Products/Release-iphoneos/App.app'
        (app / 'public').mkdir(parents=True)
        info = {'CFBundleIdentifier': os.environ.get('BUNDLE_ID', 'app.luma.personal'), 'CFBundleExecutable': 'App', 'CFBundleShortVersionString': '1.2', 'CFBundleVersion': '1', 'CFBundleSupportedPlatforms': ['iPhoneOS']}
        (app / 'Info.plist').write_bytes(plistlib.dumps(info))
        (app / 'App').write_text('fake binary, not build evidence')
        (app / 'public/index.html').write_text('test')
        shutil.copy(root / 'public/THIRD_PARTY_NOTICES.txt', app / 'public/THIRD_PARTY_NOTICES.txt')
        (app / 'capacitor.config.json').write_text(json.dumps({'appId': 'app.luma.personal'}))
elif name == 'xcrun':
    if '--show-sdk-version' in args: print('26.2')
    elif args[0] == 'vtool': print('    platform ' + os.environ.get('MACH_PLATFORM', 'IOS'))
elif name == 'npx' and args == ['playwright', 'test']:
    (root / 'docs').mkdir(exist_ok=True)
    (root / 'docs/luma-mobile-preview.png').write_text('fixture screenshot')
elif name == 'gradlew':
    apk = root / 'android/app/build/outputs/apk/debug/app-debug.apk'
    apk.parent.mkdir(parents=True)
    apk.write_text('fixture apk')
elif name == 'ditto':
    if '-c' in args:
        import zipfile
        source, target = pathlib.Path(args[-2]), pathlib.Path(args[-1])
        with zipfile.ZipFile(target, 'w') as archive:
            for path in source.rglob('*'):
                if path.is_file(): archive.write(path, path.as_posix())
    else: shutil.copytree(args[0], args[1])
'''


class WorkflowTests(unittest.TestCase):
    def run_workflow(self, **extra):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        for folder in ['scripts', 'bin', 'android', 'public', 'sdk/platforms/android-35']:
            (root / folder).mkdir(parents=True, exist_ok=True)
        script = ROOT / 'scripts/codemagic-build.sh'
        self.assertTrue(script.is_file(), 'Codemagic build script must exist')
        shutil.copy(script, root / 'scripts/codemagic-build.sh')
        (root / 'public/THIRD_PARTY_NOTICES.txt').write_text('fixture notices')
        (root / 'scripts/test-native.sh').write_text('#!/bin/bash\nset -e\nswiftc native-tests\n')
        for name in ['node', 'javac', 'git', 'npm', 'npx', 'xcodebuild', 'xcrun', 'ditto', 'swiftc']:
            path = root / 'bin' / name
            path.write_text(STUB)
            path.chmod(0o755)
        (root / 'android/gradlew').write_text(STUB)
        # A stale previous output must never survive a new failed build.
        (root / 'build/release-ready').mkdir(parents=True)
        (root / 'build/release-ready/stale.ipa').write_text('stale')
        environment = dict(os.environ, PATH=f"{root / 'bin'}:{os.environ['PATH']}",
                           FIXTURE_ROOT=str(root), ANDROID_HOME=str(root / 'sdk'),
                           CM_COMMIT='a' * 40, **extra)
        result = subprocess.run(['bash', 'scripts/codemagic-build.sh'], cwd=root,
                                env=environment, text=True, capture_output=True)
        return root, result

    def test_success_packages_only_after_every_gate(self):
        root, result = self.run_workflow()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        output = root / 'build/release-ready'
        self.assertTrue((output / 'Luma-unsigned.ipa').is_file())
        self.assertTrue((output / 'Luma-android-debug.apk').is_file())
        self.assertFalse((output / 'stale.ipa').exists())
        commands = (root / 'commands.log').read_text()
        for command in ['npm test', 'npm run build', 'npx playwright test',
                        'gradlew test lint assembleDebug', 'swiftc native-tests',
                        'LOCAL_ASSISTANT_DISABLE_MODEL', '-configuration Release']:
            self.assertIn(command, commands)
        self.assertEqual(commands.count('xcodebuild -workspace'), 3)
        self.assertIn('Physical installation: not verified', (output / 'VERIFICATION.txt').read_text())
        check = subprocess.run(['shasum', '-a', '256', '-c', 'SHA256SUMS.txt'], cwd=output,
                               capture_output=True, text=True)
        self.assertEqual(check.returncode, 0, check.stdout + check.stderr)

    def test_every_gate_failure_withholds_all_artifacts(self):
        for gate in ['npm ci', 'npm test', 'npm run build', 'playwright install',
                     'playwright test', 'cap sync', 'gradlew test', 'swiftc',
                     '-derivedDataPath build/codemagic/native-check',
                     'LOCAL_ASSISTANT_DISABLE_MODEL', '-configuration Release',
                     'lipo', 'ditto -c']:
            with self.subTest(gate=gate):
                root, result = self.run_workflow(FAIL_AT=gate)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(gate, (root / 'commands.log').read_text())
                self.assertFalse((root / 'build/release-ready').exists())

    def test_wrong_identity_withholds_artifacts(self):
        root, result = self.run_workflow(BUNDLE_ID='wrong.identity')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((root / 'build/release-ready').exists())

    def test_simulator_platform_cannot_be_packaged_as_device(self):
        root, result = self.run_workflow(MACH_PLATFORM='IOSSIMULATOR')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((root / 'build/release-ready').exists())


if __name__ == '__main__':
    unittest.main()

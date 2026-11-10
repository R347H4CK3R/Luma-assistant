#!/usr/bin/env bash
# One fail-closed pipeline; never publish a partial or stale preview.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
export CI=true
WORK=build/codemagic
READY=build/release-ready
# Only disposable outputs owned by this script are removed.
rm -rf "$WORK" "$READY"
mkdir -p "$WORK"

SOURCE_SHA=$(git rev-parse HEAD)
if [[ -n "${CM_COMMIT:-}" ]]; then
  test "$SOURCE_SHA" = "$CM_COMMIT"
fi
test "$(node -p 'process.versions.node.split(".")[0]')" = 22
javac -version 2>&1 | tee "$WORK/java-version.txt"
grep -Eq '^javac 21([. ]|$)' "$WORK/java-version.txt"
xcodebuild -version | tee "$WORK/xcode-version.txt"
grep -Eq '^Xcode 26\.2$' "$WORK/xcode-version.txt"
SDK=$(xcrun --sdk iphoneos --show-sdk-version)
test "${SDK%%.*}" -ge 26
: "${ANDROID_HOME:?Android SDK must be present on the build machine}"
test -d "$ANDROID_HOME/platforms/android-35"

printf '\n== Node tests and Vite build ==\n'
npm ci
npm test
npm run build

printf '\n== Chromium UI checks ==\n'
npx playwright install --with-deps chromium
npx playwright test
test -s docs/luma-mobile-preview.png

printf '\n== Native Swift validation and lifecycle tests ==\n'
bash scripts/test-native.sh

printf '\n== Sync native projects and run Android checks ==\n'
npx cap sync
(
  cd android
  chmod +x gradlew
  ./gradlew test lint assembleDebug
)
test -s android/app/build/outputs/apk/debug/app-debug.apk

printf '\n== Compile FoundationModels and Capacitor bridge ==\n'
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -configuration Debug -derivedDataPath build/codemagic/native-check \
  CODE_SIGNING_ALLOWED=NO build

printf '\n== Compile model-unavailable fallback ==\n'
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -configuration Debug -derivedDataPath build/codemagic/native-fallback \
  SWIFT_ACTIVE_COMPILATION_CONDITIONS='DEBUG LOCAL_ASSISTANT_DISABLE_MODEL' \
  CODE_SIGNING_ALLOWED=NO build

printf '\n== Build unsigned arm64 iPhone application ==\n'
# Keep the repository's native marketing/build versions. No signing or export.
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -configuration Release -derivedDataPath build/codemagic/ios \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build

APP="$WORK/ios/Build/Products/Release-iphoneos/App.app"
test -d "$APP"
EXE=$(python3 - "$APP" <<'PY'
import json
from pathlib import Path
import plistlib
import sys

app = Path(sys.argv[1])
with (app / 'Info.plist').open('rb') as stream:
    info = plistlib.load(stream)
assert info['CFBundleIdentifier'] == 'app.luma.personal', 'Wrong bundle identifier'
assert info['CFBundleSupportedPlatforms'] == ['iPhoneOS'], 'Not a device application'
exe = info['CFBundleExecutable']
assert exe and Path(exe).name == exe, 'Invalid executable name'
assert (app / exe).stat().st_size > 0, 'Missing executable'
assert (app / 'public/index.html').stat().st_size > 0, 'Missing web assets'
assert json.loads((app / 'capacitor.config.json').read_text())['appId'] == 'app.luma.personal'
assert (app / 'public/THIRD_PARTY_NOTICES.txt').read_bytes() == Path('public/THIRD_PARTY_NOTICES.txt').read_bytes(), 'Missing or changed bundled notices'
print(exe)
PY
)
xcrun lipo "$APP/$EXE" -verify_arch arm64
xcrun vtool -show-build "$APP/$EXE" | tee "$WORK/mach-o-platform.txt"
grep -Eq '^[[:space:]]*platform IOS$' "$WORK/mach-o-platform.txt"
if grep -Eq 'platform (IOSSIMULATOR|MACOS|MACCATALYST)' "$WORK/mach-o-platform.txt"; then
  echo 'Unexpected Mach-O platform' >&2
  exit 1
fi
test -s public/THIRD_PARTY_NOTICES.txt

printf '\n== Package privately collected previews ==\n'
mkdir -p "$WORK/package/Payload" "$WORK/staged"
ditto "$APP" "$WORK/package/Payload/App.app"
(
  cd "$WORK/package"
  ditto -c -k --sequesterRsrc --keepParent Payload ../staged/Luma-unsigned.ipa
)
unzip -t "$WORK/staged/Luma-unsigned.ipa"
cp android/app/build/outputs/apk/debug/app-debug.apk "$WORK/staged/Luma-android-debug.apk"
cp docs/luma-mobile-preview.png "$WORK/staged/luma-mobile-preview.png"
cp public/THIRD_PARTY_NOTICES.txt "$WORK/staged/THIRD_PARTY_NOTICES.txt"
cp "$WORK/mach-o-platform.txt" "$WORK/staged/mach-o-platform.txt"
{
  printf 'Source commit: %s\n' "$SOURCE_SHA"
  printf 'Codemagic build: %s\n' "${CM_BUILD_ID:-not supplied}"
  printf 'iOS SDK: %s\n' "$SDK"
  cat "$WORK/xcode-version.txt" "$WORK/java-version.txt"
  printf '%s\n' \
    'Checks: Node tests; Vite build; Chromium UI; native Swift tests; Android test/lint/assembleDebug; normal and model-disabled iOS simulator compilation; unsigned device build; bundle/arm64/iPhoneOS inspection; IPA ZIP integrity.' \
    'Architecture: arm64' \
    'Platform: iphoneos' \
    'Bundle identifier: app.luma.personal' \
    'Native versions: unchanged from source' \
    'Signing: iOS unsigned; requires user signing. Android debug-signed test APK.' \
    'Physical installation: not verified' \
    'On-device inference and native Files behavior: not verified' \
    'Store submission: not ready' \
    'Distribution: private preview artifacts only; no store or public release.'
} > "$WORK/staged/VERIFICATION.txt"
(
  cd "$WORK/staged"
  shasum -a 256 Luma-unsigned.ipa Luma-android-debug.apk luma-mobile-preview.png \
    THIRD_PARTY_NOTICES.txt mach-o-platform.txt VERIFICATION.txt > SHA256SUMS.txt
  shasum -a 256 -c SHA256SUMS.txt
)
# Atomic promotion is the final operation. Codemagic collects nothing on failure.
mv "$WORK/staged" "$READY"

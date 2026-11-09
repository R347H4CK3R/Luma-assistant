#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
swiftc -swift-version 5 -D LOCAL_ASSISTANT_TESTING \
  "$ROOT/ios/App/App/LocalAssistantPlugin.swift" \
  "$ROOT/tests/native/LocalAssistantTests.swift" -o "$OUT/native-tests"
"$OUT/native-tests"


swiftc -swift-version 5 -D LOCAL_FILES_TESTING \
  "$ROOT/ios/App/App/LocalFilesPlugin.swift" \
  "$ROOT/tests/native/LocalFilesTests.swift" -o "$OUT/file-tests"
"$OUT/file-tests"

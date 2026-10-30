#!/bin/bash
# usage: make_reel.sh scenario.json out.mp4   (needs KOKORO_DIR with kokoro.onnx + voices.bin)
set -e; D=$(cd "$(dirname "$0")" && pwd); W=$(mktemp -d)
python3 "$D/tts.py" "$1" "$W/vo" "$KOKORO_DIR/kokoro.onnx" "$KOKORO_DIR/voices.bin"
node "$D/record.js" "$1" "$W/rec" "$W/vo/dur.json"
python3 "$D/assemble.py" "$W/rec" "$W/vo" "$2"
rm -rf "$W"

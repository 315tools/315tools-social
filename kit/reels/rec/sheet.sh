#!/bin/bash
# contact sheet: sheet.sh video.mp4 out.png  (10 frames)
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"); T=$(mktemp -d)
for k in 0 1 2 3 4 5 6 7 8 9; do ffmpeg -loglevel error -y -ss $(python3 -c "print($D*($k+.5)/10)") -i "$1" -frames:v 1 -vf scale=180:-1 $T/$k.png; done
ffmpeg -loglevel error -y $(for k in 0 1 2 3 4 5 6 7 8 9; do echo -i $T/$k.png; done) -filter_complex "hstack=10" "$2"; rm -rf $T

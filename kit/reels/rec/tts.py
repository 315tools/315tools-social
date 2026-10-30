"""Make voice lines for a reel scenario. usage: python3 tts.py scenario.json outdir model.onnx voices.bin"""
import json, sys, os, soundfile as sf
from kokoro_onnx import Kokoro
sc = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
k = Kokoro(sys.argv[3], sys.argv[4])
lines = [sc["intro"]["say"]] + [s["say"] for s in sc["scenes"]] + [sc["outro"]["say"]] + ([] if sc.get("brand") is False else [sc.get("brand_say", "Three, one, five tools.")])
voice = sc.get('voice', 'af_heart'); dur = []
for i, t in enumerate(lines):
    a, sr = k.create(t, voice=voice, speed=sc.get('speed', 1.05), lang='en-us')
    sf.write(f'{out}/{i}.wav', a, sr); dur.append(round(len(a) / sr, 3))
json.dump(dur, open(f'{out}/dur.json', 'w')); print('voice', dur)

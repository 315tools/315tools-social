"""Combine recorded frames + voice + sound effects into an Instagram reel MP4.
usage: python3 assemble.py <recdir> <vodir> <out.mp4>"""
import json, sys, subprocess, numpy as np, soundfile as sf
rec, vo, dst = sys.argv[1:4]
t = json.load(open(rec + '/timeline.json')); fr = t['frames']; total = t['end'] - t['start']
with open(rec + '/list.txt', 'w') as f:
    for i, x in enumerate(fr):
        a = t['start'] if i == 0 else x['t']; b = fr[i + 1]['t'] if i + 1 < len(fr) else t['end']
        f.write(f"file '{x['fn']}'\nduration {max(b - a, 0.001):.4f}\n")
    f.write(f"file '{fr[-1]['fn']}'\n")
SR = 48000; mix = np.zeros(int((total + 1) * SR))
def put(sig, at, gain=1.0):
    i = int(at * SR); n = min(len(sig), len(mix) - i)
    if n > 0: mix[i:i + n] += sig[:n] * gain
def rs(sig, sr):  # resample linear
    return np.interp(np.arange(0, len(sig), sr / SR), np.arange(len(sig)), sig)
for m in t['marks']:
    a, sr = sf.read(f"{vo}/{m['i']}.wav"); put(rs(a, sr), m['t'] + 0.05, 1.0)
tt = lambda d: np.arange(int(d * SR)) / SR
def tap():
    x = tt(.09); return (np.sin(2 * np.pi * 1500 * x) * .6 + np.sin(2 * np.pi * 900 * x) * .4) * np.exp(-x * 55)
def key():
    x = tt(.03); return np.sin(2 * np.pi * 2600 * x) * np.exp(-x * 160)
def whoosh():
    x = tt(.5); n = np.random.default_rng(3).standard_normal(len(x))
    n = np.convolve(n, np.ones(6) / 6, 'same'); env = np.sin(np.pi * x / .5) ** 2
    return n * env * .5
def ding():
    x = tt(1.2); return sum(np.sin(2 * np.pi * f * x) * g for f, g in ((880, .5), (1320, .3), (1760, .15))) * np.exp(-x * 3.2)
SFX = {'tap': (tap(), .22), 'key': (key(), .08), 'whoosh': (whoosh(), .10), 'ding': (ding(), .16)}
for s in t.get('sfx', []): sig, g = SFX[s['k']]; put(sig, s['t'], g)
mix = mix[:int(total * SR)]; pk = np.abs(mix).max() or 1; mix = mix / pk * 0.89
sf.write(rec + '/audio.wav', mix, SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', rec + '/list.txt', '-i', rec + '/audio.wav',
  '-vf', 'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high',
  '-af', 'loudnorm=I=-14:TP=-1.5', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-t', f'{total:.2f}', dst], check=True)
print('ok', round(total, 1), 's ->', dst)

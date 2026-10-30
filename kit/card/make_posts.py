"""315tools Instagram post generator — 1080x1350 JPEG cards in brand style.
Usage: python3 make_posts.py posts.json outdir
posts.json: [{"id","kicker","title","body","bullets":[...],"cta","url"}]
"""
import json, os, sys
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

NAVY, AMBER, AMBER_TXT, PAPER, INK2 = '#1B2B4B', '#F5A524', '#C47A0B', '#F6F4EF', '#5A6478'
W, H, M = 1080, 1350, 90
HERE = os.path.dirname(os.path.abspath(__file__))
FD = os.path.join(HERE, 'fonts'); os.makedirs(FD, exist_ok=True)

def ttf(src, name):
    out = os.path.join(FD, name)
    if not os.path.exists(out):
        f = TTFont(src); f.flavor = None; f.save(out)
    return out

def fonts(noto_dir, mono_dir):
    return {
        'black': ttf(os.path.join(noto_dir, 'noto-sans-latin-800-normal.woff'), 'n800.ttf'),
        'bold': ttf(os.path.join(noto_dir, 'noto-sans-latin-700-normal.woff'), 'n700.ttf'),
        'reg': ttf(os.path.join(noto_dir, 'noto-sans-latin-400-normal.woff'), 'n400.ttf'),
        'mono': ttf(os.path.join(mono_dir, 'ibm-plex-mono-latin-600-normal.woff'), 'm600.ttf'),
    }

def wrap(d, text, font, maxw):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for w in para.split(' '):
            t = (cur + ' ' + w).strip()
            if d.textlength(t, font=font) <= maxw: cur = t
            else: lines.append(cur); cur = w
        lines.append(cur)
    return lines

def logo(d, F, x, y, size, dark_bg):
    f = ImageFont.truetype(F['black'], size)
    d.text((x, y), '315', font=f, fill=PAPER if dark_bg else NAVY)
    d.text((x + d.textlength('315', font=f), y), 'tools', font=f, fill=AMBER if dark_bg else AMBER_TXT)

def card(p, F, out):
    dark = p.get('theme', 'paper') == 'navy'
    bg, fg, sub = (NAVY, PAPER, '#B9C2D3') if dark else (PAPER, NAVY, INK2)
    im = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(im)
    # top bar: logo + kicker
    logo(d, F, M, 78, 44, dark)
    fk = ImageFont.truetype(F['mono'], 26)
    k = p['kicker'].upper(); kw = d.textlength(k, font=fk)
    d.rounded_rectangle((W - M - kw - 36, 76, W - M, 128), 26, fill=AMBER)
    d.text((W - M - kw - 18, 88), k, font=fk, fill=NAVY)
    # content block, vertically centred between header and footer
    def body_block(y, draw):
        for size in (108, 100, 92, 84, 76, 68):
            ft = ImageFont.truetype(F['black'], size)
            tl = wrap(d, p['title'], ft, W - 2 * M)
            if len(tl) * size * 1.14 <= 500: break
        for ln in tl:
            if draw: d.text((M, y), ln, font=ft, fill=fg)
            y += int(size * 1.14)
        y += 30
        if draw: d.rounded_rectangle((M, y, M + 120, y + 12), 6, fill=AMBER)
        y += 60
        if p.get('body'):
            fb = ImageFont.truetype(F['reg'], 42)
            for ln in wrap(d, p['body'], fb, W - 2 * M):
                if draw: d.text((M, y), ln, font=fb, fill=sub)
                y += 60
            y += 40
        fbul = ImageFont.truetype(F['bold'], 44); fn = ImageFont.truetype(F['mono'], 32)
        for i, b in enumerate(p.get('bullets', [])):
            cy = y + 4
            if draw:
                if p.get('numbered'):
                    d.ellipse((M, cy, M + 60, cy + 60), fill=AMBER)
                    n = str(i + 1); d.text((M + 30 - d.textlength(n, font=fn) / 2, cy + 9), n, font=fn, fill=NAVY)
                else:
                    d.rounded_rectangle((M + 12, cy + 18, M + 42, cy + 48), 8, fill=AMBER)
            for ln in wrap(d, b, fbul, W - 2 * M - 96):
                if draw: d.text((M + 96, y), ln, font=fbul, fill=fg)
                y += 60
            y += 30
        return y
    top, bottom = 190, H - 190
    h = body_block(0, False) - 30
    body_block(top + max(0, (bottom - top - h) // 2), True)
    # footer CTA
    fy = H - 170
    d.line((M, fy, W - M, fy), fill=('#33456A' if dark else '#DDD8CC'), width=2)
    fc = ImageFont.truetype(F['bold'], 38); fu = ImageFont.truetype(F['mono'], 32)
    d.text((M, fy + 40), p.get('cta', 'Free · No sign-up · No upload'), font=fc, fill=fg)
    u = p.get('url', '315tools.com')
    d.text((W - M - d.textlength(u, font=fu), fy + 44), u, font=fu, fill=AMBER if dark else AMBER_TXT)
    im.save(os.path.join(out, p['id'] + '.jpg'), 'JPEG', quality=92, optimize=True)

if __name__ == '__main__':
    posts, out = json.load(open(sys.argv[1])), sys.argv[2]
    os.makedirs(out, exist_ok=True)
    F = fonts(sys.argv[3], sys.argv[4])
    for p in posts: card(p, F, out)
    print(sorted(os.listdir(out)))

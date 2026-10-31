"""Make demo files for 315tools reels. usage: python3 make_samples.py <rec dir>  (needs package/files/noto-sans-latin-800-normal.woff)"""
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
R = sys.argv[1]; D = R + '/samples'; os.makedirs(D, exist_ok=True)
f = TTFont(R + '/package/files/noto-sans-latin-800-normal.woff'); f.flavor = None; f.save(R + '/n800.ttf')
# small PDFs for merge
for n, (t, c) in enumerate([("Invoice", (0.96, 0.65, 0.14)), ("Contract", (0.11, 0.17, 0.29)), ("Photos", (0.37, 0.4, 0.46))], 1):
    cv = canvas.Canvas(f"{D}/{n}-{t.lower()}.pdf", pagesize=A4)
    for p in range(2):
        cv.setFillColorRGB(*c); cv.rect(0, 700, 595, 142, fill=1, stroke=0)
        cv.setFillColorRGB(1, 1, 1); cv.setFont("Helvetica-Bold", 48); cv.drawString(50, 750, t)
        cv.setFillColorRGB(.2, .2, .2); cv.setFont("Helvetica", 20); cv.drawString(50, 640, f"Page {p+1}"); cv.showPage()
    cv.save()
# 3.5 MB landscape photo
rng = np.random.default_rng(7); W, H = 4032, 3024
y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
img = np.stack([255 * (0.98 - 0.3 * y) + 0 * x, 255 * (0.62 + 0.2 * y) + 0 * x, 255 * (0.35 + 0.55 * y) + 0 * x], -1)
for k, (base, amp, col) in enumerate([(0.55, 0.12, (70, 82, 110)), (0.68, 0.08, (44, 58, 84)), (0.8, 0.05, (27, 43, 75))]):
    ridge = base + amp * np.sin(x * np.pi * (3 + k * 2) + k) + 0.03 * np.sin(x * 40 + k)
    img[np.broadcast_to(y > ridge, (H, W))] = col
img += rng.normal(0, 9, img.shape)
im = Image.fromarray(np.clip(img, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.6))
ImageDraw.Draw(im).ellipse((2900, 500, 3400, 1000), fill=(255, 214, 140))
im.save(D + '/photo-mountains.jpg', quality=95)
# fictional logo
lg = Image.new('RGBA', (600, 200), (0, 0, 0, 0)); d = ImageDraw.Draw(lg)
d.rounded_rectangle((10, 30, 150, 170), 36, fill=(37, 99, 235)); d.polygon([(40, 140), (80, 60), (120, 140)], fill='white')
d.text((175, 52), 'Blue Peak', font=ImageFont.truetype(R + '/n800.ttf', 62), fill=(27, 43, 75))
d.text((178, 122), 'TRADING CO.', font=ImageFont.truetype(R + '/n800.ttf', 30), fill=(37, 99, 235))
lg.save(D + '/logo.png')
# ~1.1 MB PDF with photos (compress demo)
im.resize((2000, 1500)).save(D + '/p2.jpg', quality=97)
c = canvas.Canvas(D + '/brochure.pdf', pagesize=A4)
for p in range(2):
    c.drawImage(D + '/p2.jpg', 30, 250, 535, 400); c.setFont('Helvetica-Bold', 34); c.drawString(40, 720, f'Trip photos {p+1}'); c.showPage()
c.save(); os.remove(D + '/p2.jpg')
# contract to sign (pdf-sign)
c = canvas.Canvas(D + '/agreement.pdf', pagesize=A4)
c.setFillColorRGB(.11, .17, .29); c.rect(0, 742, 595, 100, fill=1, stroke=0)
c.setFillColorRGB(1, 1, 1); c.setFont('Helvetica-Bold', 30); c.drawString(50, 780, 'Rental Agreement')
c.setFillColorRGB(.2, .2, .2); c.setFont('Helvetica', 13); yy = 690
for t in ['Between: Blue Peak Trading Co. (Owner)', 'and: J. Kim (Tenant)', '', '1. The tenant rents the studio at 12 Harbor Road for 12 months.',
          '2. Monthly rent is due on the 1st of each month.', '3. Either party may end this agreement with 30 days notice.', '4. The deposit is returned within 14 days after move-out.']:
    c.drawString(50, yy, t); yy -= 26
c.setFont('Helvetica-Bold', 13); c.drawString(50, 250, 'Tenant signature'); c.line(50, 210, 300, 210); c.setFont('Helvetica', 11); c.drawString(50, 192, 'Date: 2026-10-26')
c.showPage(); c.save()
# square logo mark (qr-logo)
lm = Image.new('RGBA', (400, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(lm)
d.rounded_rectangle((20, 20, 380, 380), 90, fill=(37, 99, 235)); d.polygon([(90, 300), (200, 100), (310, 300)], fill='white'); d.polygon([(170, 300), (240, 180), (310, 300)], fill=(191, 219, 254))
lm.save(D + '/logo-mark.png')
# 6-page catalog (pdf-split)
c = canvas.Canvas(D + '/catalog.pdf', pagesize=A4)
for i, (n, col) in enumerate(zip(['Cover', 'Price list', 'Order form', 'Terms', 'Contact', 'Notes'], [(.96, .65, .14), (.11, .17, .29), (.37, .4, .46), (.15, .39, .92), (.2, .6, .4), (.8, .3, .3)])):
    c.setFillColorRGB(*col); c.rect(0, 700, 595, 142, fill=1, stroke=0); c.setFillColorRGB(1, 1, 1); c.setFont('Helvetica-Bold', 44); c.drawString(50, 750, n)
    c.setFillColorRGB(.2, .2, .2); c.setFont('Helvetica', 20); c.drawString(50, 640, f'Blue Peak Trading - Catalog page {i+1}'); c.showPage()
c.save()
# photo with GPS + camera EXIF (image-exif)
from PIL.ExifTags import IFD
ex = Image.Exif(); ex[0x010F] = 'Fictional Camera Co'; ex[0x0110] = 'FC-100'; ex[0x0132] = '2026:10:12 14:32:10'
g = ex.get_ifd(IFD.GPSInfo); g.update({1: 'N', 2: (37.0, 33.0, 58.0), 3: 'E', 4: (126.0, 58.0, 41.0)}); ex[0x8825] = g
im.resize((2016, 1512)).save(D + '/trip-photo.jpg', quality=92, exif=ex)
print(sorted(os.listdir(D)))

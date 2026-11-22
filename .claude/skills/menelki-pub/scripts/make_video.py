"""Vidéo publicitaire verticale MENELKI (1080x1920, 13 s, silencieuse).
Usage : python3 make_video.py sortie.mp4   (depuis n'importe où ; lit les photos et le logo dans le dépôt)
Pour changer les textes, la durée ou les photos : modifier SCENES, FIN et les textes de scene_finale().
Dépendances : ffmpeg, rsvg-convert, Pillow, numpy, police Montserrat."""
import subprocess, sys, math, os, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
OUT = sys.argv[1]
W, H, FPS = 1080, 1920, 30
DUREE = 13.0
NF = int(DUREE * FPS)

NOIR = (16, 9, 6)
BORDEAUX = (97, 25, 39)
CUIVRE = (184, 122, 60)
CREME = (249, 231, 212)
MONT = '/usr/share/fonts/truetype/google-fonts/ofl/montserrat/Montserrat[wght].ttf'

_cache = {}
def font(size, poids):
    k = (size, poids)
    if k not in _cache:
        f = ImageFont.truetype(MONT, size)
        try:
            f.set_variation_by_axes([poids])
        except Exception:
            pass
        _cache[k] = f
    return _cache[k]

def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3

def ease_io(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def largeur(txt, f, esp):
    return sum(f.getlength(c) for c in txt) + esp * (len(txt) - 1)

def texte(layer, xy, txt, f, couleur, esp=0, alpha=255, ancre='l'):
    d = ImageDraw.Draw(layer)
    x, y = xy
    w = largeur(txt, f, esp)
    if ancre == 'c':
        x = x - w / 2
    for c in txt:
        d.text((x, y), c, font=f, fill=couleur + (int(alpha),))
        x += f.getlength(c) + esp

# ---------- ressources ----------
def charger(nom):
    return Image.open(f'{REPO}/{nom}').convert('RGB')

photos = {
    'art': charger('look-art.jpg'),
    'rue': charger('look-rue.jpg'),
    'tab': charger('look-tabouret.jpg'),
}
_tmp = tempfile.mkdtemp()
subprocess.run(['rsvg-convert', '-w', '900', f'{REPO}/menelki-symbole-blanc.svg', '-o', f'{_tmp}/symbole.png'], check=True)
symbole = Image.open(f'{_tmp}/symbole.png').convert('RGBA')

def degrade_bas():
    a = np.zeros((H, W), dtype=np.float32)
    ys = np.arange(H, dtype=np.float32)
    a = np.clip((ys - 700) / 800, 0, 1) ** 1.4 * 0.82
    haut = np.clip((460 - ys) / 460, 0, 1) ** 1.2 * 0.62
    a = np.maximum(a, haut)
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[..., 0], arr[..., 1], arr[..., 2] = NOIR
    arr[..., 3] = (np.repeat(a[:, None], W, axis=1) * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')
GRAD = degrade_bas()

def fond_sombre(t):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:] = NOIR
    cx = W * (0.78 + 0.05 * math.sin(t * 0.7)); cy = H * 0.22
    d = np.sqrt(((xx - cx) / 700) ** 2 + ((yy - cy) / 760) ** 2)
    g1 = np.clip(1 - d, 0, 1) ** 1.6
    cx2 = W * 0.12; cy2 = H * (0.85 + 0.03 * math.cos(t * 0.6))
    d2 = np.sqrt(((xx - cx2) / 640) ** 2 + ((yy - cy2) / 700) ** 2)
    g2 = np.clip(1 - d2, 0, 1) ** 1.6
    for i, (b, c) in enumerate(zip(BORDEAUX, CUIVRE)):
        base[..., i] += g1 * (b - NOIR[i]) * 1.0 + g2 * (c - NOIR[i]) * 0.38
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), 'RGB')

# ---------- scènes photo ----------
SCENES = [
    dict(img='art', t0=0.0, t1=2.9, num='01', l1='TON', l2='STYLE', cx=0.50, cy=0.46, z0=1.02, z1=1.16),
    dict(img='rue', t0=2.5, t1=5.4, num='02', l1='TON', l2='HISTOIRE', cx=0.50, cy=0.44, z0=1.16, z1=1.02),
    dict(img='tab', t0=5.0, t1=8.0, num='03', l1='TON', l2='ATTITUDE', cx=0.58, cy=0.50, z0=1.02, z1=1.14),
]
FIN = 7.6   # début de la scène finale

def cadre_photo(s, t):
    im = photos[s['img']]
    sw, sh = im.size
    p = (t - s['t0']) / (s['t1'] - s['t0'])
    z = s['z0'] + (s['z1'] - s['z0']) * ease_io(p)
    ch = sh / z
    cw = ch * W / H
    cx = sw * s['cx']; cy = sh * s['cy']
    x0 = max(0, min(sw - cw, cx - cw / 2)); y0 = max(0, min(sh - ch, cy - ch / 2))
    return im.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))

def scene_photo(s, t):
    base = cadre_photo(s, t).convert('RGBA')
    base = Image.alpha_composite(base, GRAD)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    tl = t - s['t0']
    # numéro + trait
    a0 = ease((tl - 0.15) / 0.4)
    texte(layer, (90, 1080 + 24 * (1 - a0)), s['num'], font(34, 600), CUIVRE, esp=8, alpha=255 * a0)
    d = ImageDraw.Draw(layer)
    d.rectangle((170, 1099 + 24 * (1 - a0), 170 + 90 * a0, 1101 + 24 * (1 - a0)), fill=CUIVRE + (int(255 * a0),))
    # titre sur deux lignes, taille ajustée pour tenir dans la largeur
    taille = 168
    f = font(taille, 800)
    while largeur(s["l2"], f, 8) > 800 and taille > 80:
        taille -= 4
        f = font(taille, 800)
    for i, (txt, y) in enumerate(((s['l1'], 1150), (s['l2'], 1150 + int(taille * 1.02)))):
        a = ease((tl - 0.3 - 0.14 * i) / 0.5)
        texte(layer, (90, y + 60 * (1 - a)), txt, f, CREME, esp=8, alpha=255 * a)
    # petit logo en haut à gauche
    sy = symbole.resize((64, int(64 * symbole.size[1] / symbole.size[0])), Image.LANCZOS)
    layer.alpha_composite(sy, (90, 170))
    texte(layer, (172, 186), 'MENELKI', font(30, 600), CREME, esp=12, alpha=235)
    return Image.alpha_composite(base, layer).convert('RGB')

# ---------- scène finale ----------
def scene_finale(t):
    tl = t - FIN
    base = fond_sombre(t).convert('RGBA')
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # symbole
    a = ease(tl / 0.9)
    sc = 0.80 + 0.20 * a
    sw = int(430 * sc)
    sy = symbole.resize((sw, int(sw * symbole.size[1] / symbole.size[0])), Image.LANCZOS)
    r, g, b, al = sy.split()
    al = al.point(lambda v: int(v * a))
    sy = Image.merge('RGBA', (r, g, b, al))
    layer.alpha_composite(sy, (W // 2 - sw // 2, 330 + int(30 * (1 - a))))
    # MENELKI
    a1 = ease((tl - 0.5) / 0.7)
    texte(layer, (W / 2, 890 + 40 * (1 - a1)), 'MENELKI', font(112, 800), CREME, esp=30, alpha=255 * a1, ancre='c')
    # slogan
    a2 = ease((tl - 0.9) / 0.7)
    texte(layer, (W / 2, 1040 + 30 * (1 - a2)), 'WEAR YOUR STORY', font(46, 500), CUIVRE, esp=22, alpha=255 * a2, ancre='c')
    d = ImageDraw.Draw(layer)
    la = int(300 * ease((tl - 1.2) / 0.6))
    d.rectangle((W / 2 - la / 2, 1122, W / 2 + la / 2, 1124), fill=CUIVRE + (200,))
    # infos
    a3 = ease((tl - 1.6) / 0.6)
    texte(layer, (W / 2, 1170 + 24 * (1 - a3)), 'STREETWEAR ÉLÉGANT', font(34, 500), CREME, esp=12, alpha=235 * a3, ancre='c')
    a4 = ease((tl - 2.3) / 0.6)
    texte(layer, (W / 2, 1240 + 24 * (1 - a4)), 'Livraison à Yamoussoukro et Abidjan', font(34, 400), CREME, esp=1, alpha=215 * a4, ancre='c')
    texte(layer, (W / 2, 1292 + 24 * (1 - a4)), 'Paiement Wave ou Orange Money', font(34, 400), CREME, esp=1, alpha=215 * a4, ancre='c')
    # appel à l'action
    a5 = ease((tl - 3.2) / 0.6)
    bw, bh = 640, 104
    x0 = W // 2 - bw // 2; y0 = 1380 + int(30 * (1 - a5))
    cta = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dc = ImageDraw.Draw(cta)
    dc.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=52, fill=CUIVRE + (int(255 * a5),))
    texte(cta, (W / 2, y0 + 30), '@menelki_shop', font(40, 700), NOIR, esp=3, alpha=255 * a5, ancre='c')
    layer = Image.alpha_composite(layer, cta)
    a6 = ease((tl - 3.6) / 0.6)
    texte(layer, (W / 2, 1520 + 18 * (1 - a6)), 'Instagram · TikTok · Lien en bio', font(30, 500), CREME, esp=3, alpha=210 * a6, ancre='c')
    return Image.alpha_composite(base, layer).convert('RGB')

def image(t):
    # fin : fondu vers noir sur la dernière demi-seconde
    actifs = [s for s in SCENES if s['t0'] <= t < s['t1']]
    if t >= FIN:
        fin = scene_finale(t)
        if actifs:
            a = ease_io((t - FIN) / 0.5)
            fr = Image.blend(scene_photo(actifs[-1], t), fin, a)
        else:
            fr = fin
    elif len(actifs) == 2:
        a = ease_io((t - actifs[1]['t0']) / 0.4)
        fr = Image.blend(scene_photo(actifs[0], t), scene_photo(actifs[1], t), a)
    else:
        fr = scene_photo(actifs[0], t)
    if t > DUREE - 0.4:
        fr = Image.blend(fr, Image.new('RGB', (W, H), NOIR), ease((t - (DUREE - 0.4)) / 0.4))
    return fr

cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
       '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
       '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', OUT]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i in range(NF):
    p.stdin.write(image(i / FPS).tobytes())
p.stdin.close()
p.wait()
print('ok', OUT, NF, 'images')

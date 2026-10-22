"""Bake the Wilson massif elevation grid for the /tour/ flyover.

Fetches the AWS Terrain Tiles (Terrarium, z13) once and samples them exactly
like loadLiveDEM() in components/tour/scene.ts, so the page loads one ~124 KB
file instead of fetching and decoding a dozen PNG tiles on every visit.

Output: public/assets/tour/terrain.bin

Format (little-endian uint16):
  header: MAGIC, GW, GH, 0
  body:   (GW+1)*(GH+1) samples, row-major from the north-west corner,
          value = round((elevation_m - OFFSET) * 10)  (decimetres)
Keep BBOX/Z/GW/GH/MAGIC/OFFSET in sync with components/tour/scene.ts.

Needs Pillow. Run from the repo root: python3 scripts/bake_terrain.py
"""
import io
import math
import os
import struct
import urllib.request

from PIL import Image

BBOX = {'w': -108.078, 'e': -107.922, 's': 37.800, 'n': 37.896}
Z, GW, GH = 13, 280, 220
MAGIC, OFFSET = 0xD3E1, 1000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'tour', 'terrain.bin')
TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'


def lon2x(lon):
    return (lon + 180) / 360 * 2 ** Z


def lat2y(lat):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z


def main():
    tx0, tx1 = math.floor(lon2x(BBOX['w'])), math.floor(lon2x(BBOX['e']))
    ty0, ty1 = math.floor(lat2y(BBOX['n'])), math.floor(lat2y(BBOX['s']))
    mosaic = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            with urllib.request.urlopen(TILE_URL.format(z=Z, x=tx, y=ty), timeout=30) as r:
                mosaic.paste(Image.open(io.BytesIO(r.read())).convert('RGB'), ((tx - tx0) * 256, (ty - ty0) * 256))
    px = mosaic.load()

    def elev(x, y):
        r, g, b = px[x, y]
        return r * 256 + g + b / 256 - 32768

    out = [MAGIC, GW, GH, 0]
    lo, hi = 1e9, -1e9
    for j in range(GH + 1):
        for i in range(GW + 1):
            fx = (lon2x(BBOX['w'] + (BBOX['e'] - BBOX['w']) * i / GW) - tx0) * 256
            fy = (lat2y(BBOX['n'] - (BBOX['n'] - BBOX['s']) * j / GH) - ty0) * 256
            ix, iy = int(fx), int(fy)
            u, v = fx - ix, fy - iy
            e = (elev(ix, iy) * (1 - u) + elev(ix + 1, iy) * u) * (1 - v) + \
                (elev(ix, iy + 1) * (1 - u) + elev(ix + 1, iy + 1) * u) * v
            lo, hi = min(lo, e), max(hi, e)
            out.append(max(0, min(65535, round((e - OFFSET) * 10))))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        f.write(struct.pack('<%dH' % len(out), *out))
    print(f'wrote {OUT} ({os.path.getsize(OUT)} bytes), elevation {lo:.0f}-{hi:.0f} m')


if __name__ == '__main__':
    main()

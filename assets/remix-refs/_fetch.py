#!/usr/bin/env python3
# Remix 参考グリッドのサムネを一度だけ生成して保存（事前ベイク）
import os, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

STYLE = ", contemporary abstract generative art, bold graphic composition, high quality, no text, no watermark"
SIZE = 512
REFS = [
    ("01", "op art concentric circles, high contrast black and white, single orange accent"),
    ("02", "glitch art horizontal bands, datamosh, warm red and cream tones"),
    ("03", "bold horizontal color field stripes, blue and red gradient"),
    ("04", "soft green and blue gradient haze, blurred atmosphere"),
    ("05", "surreal minimal landscape with a single floating sphere, muted earth tones"),
    ("06", "dark scene with a chrome metallic object, 3d render, reflective"),
    ("07", "iridescent holographic gradient, pearlescent sheen"),
    ("08", "moire interference pattern, fine concentric lines"),
    ("09", "liquid metal fluid abstract, mercury, chrome"),
    ("10", "analog crt noise, scanlines, broken signal"),
    ("11", "crystalline prismatic facets, light refraction"),
    ("12", "swirling marbled vortex, suminagashi ink"),
    ("13", "smooth gradient color field, dusk tones"),
    ("14", "minimal dark composition with a single beam of light"),
    ("15", "surreal desert dune with a tiny lone figure, muted"),
    ("16", "circuit board traces, schematic, technical lines"),
]
OUT = os.path.dirname(os.path.abspath(__file__))

def url_for(prompt):
    enc = urllib.parse.quote(prompt + STYLE, safe="")
    seed = abs(hash(prompt)) % 100000
    return f"https://image.pollinations.ai/prompt/{enc}?width={SIZE}&height={SIZE}&seed={seed}&nologo=true"

def fetch(item):
    idx, prompt = item
    path = os.path.join(OUT, f"ref-{idx}.jpg")
    if os.path.exists(path) and os.path.getsize(path) > 4000:
        return idx, "skip(exists)"
    url = url_for(prompt)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                data = r.read()
            if len(data) > 4000:
                with open(path, "wb") as f:
                    f.write(data)
                return idx, f"ok({len(data)//1024}KB)"
        except Exception as e:
            last = str(e)
            time.sleep(2)
    return idx, f"FAIL({last if 'last' in dir() else '?'})"

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=3) as ex:
        for idx, status in ex.map(fetch, REFS):
            print(f"ref-{idx}: {status}", flush=True)
    print("done")

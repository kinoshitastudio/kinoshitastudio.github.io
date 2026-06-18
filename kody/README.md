# KODY Typography

**Directional Poster Editor.** One HTML file. Keyboard-first. Monochrome.

🇯🇵 [日本語版](./README.ja.md)

---

## Concept

Click anywhere on the canvas. Move the mouse to aim the heading.
Type. Every keystroke drops one glyph in the direction your cursor points —
then the walker advances, and the next keystroke continues along whatever
new angle you've aimed since. Curves, zigzags, spirals, arcs: typography
follows the pointer's trail.

Drop an image: it's auto-monochromed and placed on the board, draggable and
resizable. Text and images are blended with `mix-blend-mode: difference`, so
overlaps invert themselves and unexpected shapes emerge in the seams.

KODY — a pixel-art cube who lives in the bottom-right corner — greets you
once, then spends his life with his eyes rolling around. Drag a layer onto
him and he eats it; the layer animates into his mouth and disappears.

## Files

```
kody_typography/
├── index.html       — landing page
├── app.html         — the editor itself
├── README.md        — this file
└── README.ja.md     — Japanese version
```

## Run

No build step. Open `index.html` in a browser, or go straight to `app.html`:

```bash
open index.html                 # macOS
# or serve locally:
python3 -m http.server 8080
```

First load fetches React, Tailwind, and Google Fonts from CDN.

## Controls

| Input                         | Action                                              |
| ----------------------------- | --------------------------------------------------- |
| click on empty canvas         | set a new start point · begin typing                |
| move mouse                    | aim the heading for the next glyph                  |
| type                          | drop a glyph at the walker (Japanese IME supported) |
| `Enter`                       | commit the current run as a layer                   |
| `Backspace` (while typing)    | remove the last glyph                               |
| `Backspace` (while selected)  | delete the selected layer                           |
| click a layer                 | select · drag to move                               |
| drop a corner handle          | (images only) resize                                |
| drop an image file            | place & auto-monochrome                             |
| drop a selected layer on KODY | feed him · layer is eaten and deleted               |
| `−` / `+`                     | font size down / up                                 |
| `I`                           | invert background black ⇄ white                     |
| `C`                           | clear canvas                                        |
| `S`                           | save as PNG (transparent bg)                        |
| `V`                           | save as SVG (vector, transparent bg)                |
| `?` / `Esc`                   | toggle / close help                                 |

## Stack

- **React 18** — via import map + `esm.sh`
- **Babel Standalone** — `data-type="module"` transpiles JSX to ESM in-browser
- **Tailwind CSS** — Play CDN, JIT with arbitrary values
- **lucide-react** — a single accent icon
- **Noto Sans JP 900** / **Space Mono 700** — Google Fonts

Runtime-only. No bundler, no `npm install`.

## Hackable points

Surfaced at the top of `app.html`:

- `FONT_FAMILY` / `FONT_WEIGHT` — typographic voice
- `DEFAULT_FONT_SIZE`, `FONT_MIN`, `FONT_MAX`, `FONT_STEP` — size bounds
- `IMG_FILTER` — the monochrome image pipeline (CSS filter string)
- `KODY_SIZE`, `KODY_MARGIN`, `KODY_EAT_RADIUS` — mascot placement and bite zone
- `exportPNG` / `exportSVG` — output pipelines

State is a tiny shape: a 2D array of `{ ch, pos, angle, advance, fontSize }`
for text runs, plus `{ x, y, w, h, src }` for images. Fork freely.

## KODY

KODY is a pixel-art cube with a light face and two blocky eyes. He:

- Appears after the initial help overlay is dismissed and greets you
  (「僕はKODYだよ」) via a speech bubble
- Spends the rest of the session moving his eyes around (ぎょろぎょろ),
  left and right pupils drifting independently
- Dilates his pupils and tilts slightly when a drag enters his bite zone
- Opens his mouth and wobbles when a layer is released on him
- Eats the layer with a rotate-shrink animation, then returns to idle

## Design notes

- **1 text run per canvas** — the "live" in-progress run lives in state; only
  on `Enter` does it freeze into the `layers` list.
- **Walker bookkeeping** — each character stores its own `angle` and `advance`;
  the walker for the next character is computed from the last one's tail.
- **Cursor via `mix-blend-mode: difference`** — always visible against black,
  white, or image content, in either theme.
- **PNG export** skips the `fillRect(bg)` and draws text in the current
  visible `fg` color directly, so the output lifts cleanly onto any surface.
- **SVG export** emits real `<text>` elements (selectable and editable in
  Illustrator), with images inlined as base64 `<image>` using a grayscale
  filter. Text rotation is preserved per-glyph.

## Browser support

Requires native import maps: Chrome 89+, Safari 16.4+, Firefox 108+.

## Philosophy

> 余計な装飾を削ぎ落とし、機能そのものが美しさを定義する。
> Strip away ornament; let function define beauty.

—

© kinoshita studio

# PIXEL BOMB

> Collapse an image into itself using ranked pixel blocks.

Inspired by [Collapse](https://collapse.constraint.systems/) by Constraint Systems.

---

## What it does

1. Load an image (via button, paste, or drop)
2. The image is divided into a grid of 8×8 pixel blocks
3. Each block's **local complexity** (variance of luminance) is calculated as a proxy for "compression complexity"
4. High-complexity blocks are ranked first and progressively **pulled toward the center** using a distance field
5. The image implodes into itself over 60 steps

## Controls

| Key | Action |
|-----|--------|
| `o` | Load image (or paste / drop) |
| `p` | Save result as PNG |
| `r` | Reset to original (step 0) |
| `h` | Step back (−1) |
| `l` | Step forward (+1) |
| `←` `→` | Same as `h` / `l` |
| Drag scrubber | Jump to any step |

## Files

```
projects/pixel_bomb/
├── index.html   Landing
├── app.html     App (single-file, vanilla JS + canvas)
└── README.md
```

## Design reference

- Font: **IBM Plex Mono** (12px / 16px line-height)
- BG: `#efefef`, canvas `#fff`
- Black shortcut keys with white letters
- 16px base padding / spacing
- Minimal constraint-systems aesthetic

## Development

```bash
cd ~/Desktop/Github/99letters.github.io
python3 server.py
# http://localhost:8001/projects/pixel_bomb/
# http://localhost:8001/projects/pixel_bomb/app.html
```

## Future tuning

- BLOCK_SIZE: 8 (px per block)
- MAX_STEPS: 60 (iterations)
- SLIC-based real superpixels (instead of grid)
- Variable direction collapse (outward = "bomb", inward = "implode")
- GIF / video export of all steps

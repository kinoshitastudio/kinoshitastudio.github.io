# MINAMO

**A calm overview for when you have too many tabs.**

MINAMO (水面 — _the calm surface of the water, from Lake Biwa_) turns the flat pile of browser tabs
into a single, glanceable overview: see everything at once, and let what you no
longer need quietly fade away.

> Japan-born, globally legible. English-first UI, mainstream Apple-flavored design.

## Phase 1 (this repo) — tab overload, one profile

A Chrome extension. Click the toolbar icon to open the **Overview Canvas**:

- **Overview Canvas** — every window and tab in one screen.
- **Context Islands** — tabs grouped by window (named contexts come next).
- **Gentle Decay** — tabs you haven't touched fade, then gently ask _"Still need this?"_

Search with `/`, clear with `Esc`. Click a tab to jump to it, `×` to close it.

## Architecture (why it's built this way)

The canvas is a **standalone web app** that knows nothing about `chrome.*`.
It only speaks a small data contract, fed by a swappable **adapter**:

```
canvas/        ← the experience (portable web app)
adapter/
  chrome-adapter.js   ← Phase 1: chrome.tabs/windows  → contract
  mock-data.js        ← design/iterate with no extension installed
background.js  ← opens the canvas
manifest.json
```

This keeps **Phase 1 from being throwaway**: Phase 2 (cross-profile, across
multiple Google accounts) can't be a Chrome extension — extensions can't see
other profiles — so it will ship as a standalone app (e.g. Electron) with a new
adapter returning the **same contract**. The canvas moves over untouched.

## Develop

**As the real extension:**
1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select this folder.
2. Click the MINAMO toolbar icon.

**As a standalone UI (with demo data):** serve the folder and open `canvas/index.html`:

```bash
cd MINAMO && python3 -m http.server 8080
# open http://localhost:8080/canvas/index.html
```

(ES modules need http(s) or the extension context — opening the file directly
via `file://` may be blocked by the browser.)

## Roadmap

- **v0.1** — Overview Canvas · windows-as-islands · gentle decay · search ← _here_
- **v0.2** — manual named islands · drag tabs between islands · archive & restore
- **v0.3** — auto-grouping suggestions · "why was this open" intent notes
- **Phase 2** — cross-profile (standalone app)

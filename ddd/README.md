```
 ██████╗  ██████╗  ██████╗
 ██╔══██╗ ██╔══██╗ ██╔══██╗      DENSITY · DAILY · DESIGN
 ██║  ██║ ██║  ██║ ██║  ██║      ──────────────────────────────
 ██║  ██║ ██║  ██║ ██║  ██║      five tasks · sequential · 365 days
 ██████╔╝ ██████╔╝ ██████╔╝      v1.2 · kinoshita studio · 2026
 ╚═════╝  ╚═════╝  ╚═════╝       updated: 2026-04-22
```

<p align="center">
  <a href="./README.ja.md">日本語版 →</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/stack-vanilla_JS-0B111F?style=flat-square" alt="stack">
  <img src="https://img.shields.io/badge/deps-tailwind_cdn-0B111F?style=flat-square" alt="deps">
  <img src="https://img.shields.io/badge/storage-localStorage-E13437?style=flat-square" alt="storage">
  <img src="https://img.shields.io/badge/offline-first-E13437?style=flat-square" alt="offline">
  <img src="https://img.shields.io/badge/license-MIT-0B111F?style=flat-square" alt="license">
</p>

---

A ritual task app for people who know **five is plenty**.
One HTML file. Sequential completion. 365-day density grid.
**No cloud. No account. No streak anxiety — only a mirror.**

```
open app.html
```

That's the install.

---

## The rules

```
5 tasks max per day        — if it doesn't fit, it's a next-day thought
tasks run top-down         — the second task locks until the first is done
durations from 1 to 180    — the timer honors what you set
today acts, past archives  — finished days are read-only
the grid sees everything   — dense weeks glow, light weeks stay dim
```

---

## What's in v1.2

```
FOCUS              today's five + date-nav · plan future, audit past
                   inline editing · 1–180 min per task · sequential lock

LOG                365-day density grid (GitHub-style, ink & red)
                   streak · best day · active days · click any cell → FOCUS
                   pixel decor (new) — weekday icon + seasonal layer

TIMER              Time Timer aesthetic · red pie consumed clockwise
                   60 / 15 / 30 / 45 face labels (CW from 12)
                   15-min chime (new) — soft 2-tone bell at each quarter
                   final-10s countdown (new) — short pips from 10 → 1
                   START · STOP · COMPLETE (engagement required)

TERMINAL           right dock on desktop / bottom dock on mobile
                   drag edge to resize · persisted in localStorage
                   cmds: log / focus / timer / start / stop / dur / task /
                          reset / clear / bgm / birthday / about / help

BGM (new)          3 procedural tracks rendered to WAV + <audio>
                   1: pad · 2: lo-fi beat · 3: rainfall + bells
                   survives mobile screen-off (bgm on / off / 1 / 2 / 3)

LOG DECOR (new)    weekday base icon × seasonal / time / milestone layer
                   MON flower · TUE tulip · WED sunflower · THU rose
                   FRI cat   · SAT bird  · SUN fish
                   03-04 sakura · 06 rain · 07-08 night fireflies
                   10-11 maple · 12-02 snow · 01/01-03 sunrise
                   night sky (22-05) · dawn glow (05-08)
                   streak 7 sparks · streak 30 glow · birthday confetti

CALENDAR           custom month view · tap any day to jump
                   green dot = tasks exist · brighter = all done

TOUCH              horizontal swipe between views (mobile)
                   safe-area-inset respected on iPhone
```

---

## Philosophy

**Five tasks.** Anything more is a wish, not a plan.
**Sequential.** No skipping — finish the first or change your life.
**Density, not count.** The grid rewards showing up, not perfection.
**Local.** Your data is on your disk. No server, no sync, no spy.
**Subtractive.** One file. Tailwind CDN + a little CSS. Zero build.

---

## Quick start

```sh
# no install. open directly:
open app.html

# or serve locally (recommended for Safari):
python -m http.server 8000
# → http://localhost:8000/app.html
```

---

## Terminal commands

```
> log / focus / timer    switch view
> stats                  today + history
> start / stop           timer control (completes current task on zero)
> dur <min>              set timer duration (15 / 25 / 45 / 60 / 1-180)
> task <n> <text>        set task n (1-5)
> reset                  reset today (escape hatch)
> clear                  clear terminal output
> bgm on / off           toggle background music
> bgm <1|2|3>            1:pad · 2:lo-fi beat · 3:rainfall + bells
> birthday MM-DD         set birthday (confetti on that day); "off" to clear
> about                  about this app
> help                   list every command
```

---

## LOG decor layers (v1.2)

The small icon at the bottom of LOG is no longer a single static flower.
It's a **weekday base** layered with **seasonal / time-of-day / milestone**
effects — all pure CSS animation, ~20 DOM nodes, zero dependencies.

```
BASE        weekday SVG rotates through 7 icons
            (MON flower → SUN fish)

SEASONAL    03-04  sakura petals       10-11  falling maples
            06     rain lines          12-02  snow drifts
            07-08  fireflies (night)   01/01-03 sunrise glow

TIME        05-08  warm dawn gradient
            22-05  dim overlay + moon + twinkling stars

MILESTONE   streak ≥ 7       small radial sparks
            streak ≥ 30      warm glow + larger sparks
            birthday MM-DD   5-color confetti
```

See `animations.html` for a live catalog of every layer.

---

## TIMER sounds (v1.2)

```
chime     fires at 15 / 30 / 45 min marks (sine 880 → 1319 Hz)
          suppressed if boundary coincides with timer completion
countdown pips at 10 / 9 / 8 ... 1 s (square 1200 Hz, 120 ms)
          silent at t = 0 (the completion toast takes over)
```

The AudioContext is primed on **START** (user gesture) so iOS Safari
unlocks playback. Sounds run only while the tab is foregrounded —
`setInterval` throttles heavily in the background.

---

## Shortcuts

```
Enter              submit (new task / save edit / cast command)
Esc                close calendar / cancel edit
↑ / ↓              command history in terminal
Swipe ← / →        next / previous view (mobile)
Drag term edge     resize terminal panel
```

---

## Data model

```
localStorage / ddd.v2
├── day        YYYY-MM-DD  (last-seen date for rollover)
├── tasks      [{ text, done }, ...]   (5 slots)
├── log        { 'YYYY-MM-DD': count, ... }
└── timer      { duration }

localStorage / ddd.birthday       MM-DD (optional)
localStorage / ddd.bgm            '1' | '2' | '3' | 'off'
localStorage / ddd.term.w|h       terminal panel size
```

Nothing leaves the browser.

---

## Files

```
ddd/
├── app.html          ← the entire engine · one file · all features
├── index.html        ← product landing page
├── animations.html   ← seasonal / time / milestone catalog
├── og-image.svg      ← OGP social preview (1200×630)
├── flower.svg        ← MON base
├── tulip.svg         ← TUE base
├── sunflower.svg     ← WED base
├── rose.svg          ← THU base
├── cat.svg           ← FRI base
├── bird.svg          ← SAT base
├── fish.svg          ← SUN base
├── favicon.svg
└── README.md / README.ja.md
```

---

## Stack

```
render       HTML + CSS grid + SVG sector path + CSS keyframes
audio        WebAudio (oscillator · OfflineAudioContext) → WAV Blob
             → HTMLAudioElement (survives mobile screen-off)
input        pointer + touch events · swipe · keyboard (enter / esc / ↑↓)
storage      localStorage (ddd.v2 · ddd.birthday · ddd.bgm)
styling      Tailwind CDN + inline CSS custom tokens
font         Space Mono (Google Fonts)
```

---

## Deploy

GitHub Pages. No build, no CI, no config. Push. Done.

---

## Contact

```
studio     →  kinoshita studio · shiga · japan
x          →  @ddddotdotddd           x.com/ddddotdotddd
feedback   →  blackmirror.board@gmail.com   (shared studio inbox)
              subject: DDD Feedback
```

---

<p align="center">
  <em>Five tasks a day. Keeps the chaos away. — kinoshita studio / 2026-04-22</em>
</p>

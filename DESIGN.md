---
name: PicVision player web
description: One identity for the share site. Daylight for reading and doing; night only where video is the page.
colors:
  paper: "#f3f1e9"
  paper-2: "#e9e6da"
  card: "#fffdf7"
  ink: "#13201a"
  ink-2: "#4b5a51"
  ink-3: "#78857d"
  rule: "#dcd7c8"
  rule-strong: "#b9b3a0"
  court: "#1f5a3f"
  court-deep: "#143d2c"
  court-tint: "#e0e9dd"
  ball: "#d7ee3c"
  ball-ink: "#1a240f"
  signal: "#b5392b"
  amber: "#8a6514"
  night: "#0d1310"
  night-2: "#171f1a"
  on-night: "#f3f1e9"
typography:
  family: "Archivo (wdth 62-125), PingFang TC, Noto Sans TC, Microsoft JhengHei"
  display: "800 weight, font-stretch 76-82%, line-height 1-1.05"
  body: "16px / 1.5"
  label: "13px / 700"
rounded:
  tag: "3-4px"
  control: "8px"
  overlay-control: "10px"
  card: "10px"
  sheet: "18px"
---

# Design System: Clubhouse

Replaces "Court Club" (2026-10-28) and the earlier navy-and-lavender reel
pages (2026-10-29). Tokens live in `app/globals.css` (`:root`, `.theme-night`);
the reels feed has its own module, `app/r/[shareId]/vertical.module.css`.

## Principles

1. **One identity, two lights.** Everything a player reads or fills in is
   *daylight*: chalk paper, court-green ink. Only pages where video is the
   content go *night* (`.theme-night`, the reels feed): green-black, not
   navy. Moving from the venue page to a reel should feel like the same
   club with the lights down.
2. **Ball yellow is earned.** It is the only accent, and only for what
   deserves the eye: a badge, the progress line, sound on, the play
   triangle. Never a border, a background wash or a decoration.
3. **Signage, not app chrome.** Square-ish shapes (4-10px). Solid
   rectangular buttons. Pills only for tags. No arrows on buttons, no
   sparkles, no outlined tile grids, no coloured side-stripes on cards.
4. **Scoreboard numerals.** Times, counts and big titles use Archivo's
   condensed width (`font-stretch` 75-82%) with tabular figures.
5. **State is said, not just coloured.** Every status pairs colour with
   words (錄影中 / Recording, 可報到 / Available, 3/10).

## Colour

| Role | Token | Use |
|---|---|---|
| Ground | `paper`, `paper-2` | page; sunken areas (lang switch, quiet buttons) |
| Surface | `card` | cards, fields, panels |
| Text | `ink`, `ink-2`, `ink-3` | primary, supporting, hints only |
| Rules | `rule`, `rule-strong` | card outlines; field outlines, dashed pending rows |
| Brand | `court`, `court-deep`, `court-tint` | primary action, active tab, your session; hover; tags |
| Accent | `ball` on `ball-ink` | see principle 2 |
| Status | `signal`, `amber` | recording/end/errors; joinable |
| Night | `night`, `night-2`, `on-night` (+ .78/.55 alpha) | video pages, sheets |

## Type

Archivo throughout, CJK falling back to PingFang TC / Noto Sans TC.
Display 28-34px / 800 / condensed. Body 16px. Labels 13px / 700. Section
labels on daylight pages are 13px / 800 / uppercase with 0.06em tracking
(Latin only; CJK is unaffected). Inputs stay at 16px or larger (iOS Safari
zooms below that).

## Components

- **Buttons** (`.btn`): 48px tall, 8px radius, 700 weight.
  `--primary` court fill; `--secondary` 1.5px ink outline; `--quiet`
  paper-2 fill; `--danger` signal outline; `--line` / `--google` brand
  sign-in. The check-in panel's `.checkin-btn--*` are the same family.
- **Fields** (`.field-input`, `.checkin-select`): 48px, card fill, 1.5px
  rule-strong inset outline, 2px court outline on focus. Selects carry
  their own chevron.
- **Your session**: a solid court-green card at the top of Check in with
  the court name in condensed display type and a live "Recording until"
  chip. It summarises; the actionable court row stays below.
- **Court cards**: card surface with a status tag in the corner. The
  owner's time editor opens only when asked.
- **Highlights rows**: big condensed time, status line, and a
  court-green play tile with a ball-yellow triangle. Pending rows are
  dashed and quiet. No invented thumbnails.
- **Tab bar**: three equal tabs; active = court text plus a 3px court bar
  on top. No raised centre button.
- **Panels** (`.panel`): account sections; title is a section label.
  The privacy switch (`.switch`) is squared and saves on change.
- **Wordmark** (`components/wordmark.tsx`): inline ball + "PicVision",
  `tone="paper" | "night"`. Use it instead of any PNG logo.

## Reels feed (night)

The video is the page. Always on: caption (bottom left), action rail
(bottom right), counter and sound (top), and a 3px ball-yellow progress
line on the bottom edge that is also the seek bar. Tap pauses and shows
one centred play glyph with the time. Controls on video are glass tiles
(`rgba(10,15,12,.5)` + blur + 1px chalk ring), 10px radius; the rail's
are 48px / 14px radius. Badge clips: a small ball tag, then the badge
name as the title in ball yellow; otherwise "Rally n" in chalk. A one-time
"Tap for sound" hint points at the sound button.

## Don't

- Use lavender, purple or navy anywhere.
- Put "→" in a button label.
- Communicate state with colour alone.
- Let a sensitive setting look saved before its save has returned.
- Use low-contrast 11px text for anything a player must act on.

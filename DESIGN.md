---
name: PicVision player web
description: A calm, daylight-readable companion for a player’s court session and highlight reel.
colors:
  court-green: "#237653"
  court-ink: "#16392d"
  court-paper: "#f4f6f0"
  court-surface: "#ffffff"
  court-soft: "#e4eee3"
  court-border: "#d3dfd6"
  court-muted: "#50645a"
  recording-red: "#ad3a31"
typography:
  display:
    fontFamily: "Barlow, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Barlow, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  control: "10px"
  card: "14px"
  pill: "999px"
spacing:
  compact: "8px"
  control: "12px"
  section: "18px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.court-green}"
    textColor: "{colors.court-surface}"
    rounded: "{rounded.control}"
    height: "46px"
  court-row:
    backgroundColor: "{colors.court-paper}"
    textColor: "{colors.court-ink}"
    divider: "{colors.court-border}"
---

# Design System: PicVision player web

## Overview

**Creative North Star: “Court Club.”**

The venue flow is a calm courtside companion: confident outdoors, legible at a glance, and clear about the player’s own recording. It begins as a practical field guide and hands off to PicVision’s existing dark, cinematic reel viewer when the footage is ready.

Key characteristics: player-first status, quiet paper-like surfaces, court-green as an action signal, and explicit rather than clever controls. Court and recording lists use typography and dividers instead of repeated cards.

## Colors

Court Club is warm neutral paper with deep green information hierarchy. Green confirms purposeful movement; red is reserved for live recording/end actions and errors.

### Primary

- **Court Green** (`#237653`): primary actions, active navigation, and focus treatment.
- **Court Ink** (`#16392d`): headings and high-priority status surfaces.

### Neutral

- **Court Paper** (`#f4f6f0`): venue page background.
- **Court Surface** (`#ffffff`): fields and cards.
- **Court Soft** (`#e4eee3`): selected pills and quiet identity surfaces.
- **Court Border** (`#d3dfd6`): dividers and resting card borders.
- **Court Muted** (`#50645a`): supporting copy only.

## Typography

**Venue display and body:** Barlow, with PingFang TC / Noto Sans TC fallbacks for Traditional Chinese. The reel player retains its existing type system.

- **Display:** 26px / 700 / 1.15 / -0.035em for page titles.
- **Title:** 18–20px / 700 for venue, session, and account identity.
- **Body:** 15px / 400 / 1.55 for actions and explanatory copy.
- **Label:** 12px / 700 for fields and small status labels; avoid faded all-caps eyebrows.

## Layout

Venue content is mobile-first, constrained to 430px, with 18px horizontal page padding and 24px between major sections. The fixed three-item navigation retains its own bottom clearance. Put a current player session above the complete court list; do not reorder or hide courts to manufacture hierarchy. Court groups and recordings share a divider rhythm so the list can be scanned by court and time.

## Elevation & Depth

Court and recording rows sit directly on Court Paper. Fine rules separate court rows in Check in and court groups in Highlight; individual recording rows rely on spacing. Account panels retain their white surface. The current session uses scale and spacing for emphasis; it has no shadow.

## Shapes

Account panels use 14px corners. Court and recording rows have square edges. Controls use small corners. State markers are text and a colored dot; large actions remain rounded rectangles, never pills.

## Components

### Buttons

- **Primary:** Court Green fill, white text, 46px minimum height, 10px radius, 700 weight.
- **Secondary:** white/transparent with a readable green-gray border.
- **Danger:** quiet red outline; retain explicit text such as End.

### Court rows

Use unboxed rows with a strong court title, a small status dot, and explicit text. Available, live, and joinable states use descriptive text as well as color.
An owned court shows its current end time first; the time editor opens only when requested.

### Your session

The signature component: a large court name and recording end time above the court list, separated from it by a single rule. It summarizes without replacing the actionable court row below.

### Highlights

The date shares the title line; recordings are grouped by court. Ready rows show their time and a clear play action; pending rows state that reels are on the way. Do not invent thumbnails for sessions when the calendar has no image data.

In Sessions, mark only a currently joined court as the player's current court. The calendar does not identify a player's historical games.

### Navigation

Three labeled, icon-supported destinations. Active state uses Court Green and stronger weight; inactive items remain readable in Court Muted.
Highlight is the center destination and primary return path for today's footage. Its circular green icon stays visible across the venue tabs and becomes Court Ink when selected.

### Account

The name is edited in its profile heading, with a local Save and Cancel state. Privacy and security use distinct, readable sections with their own boundaries. The optional training preference saves at the switch and reports the result beside it. Only supported sign-in and credential controls appear for the current account type.
Sign out and the PicVision attribution remain visible below these sections in the signed-in Account tab and its sample preview.

## Do's and Don'ts

### Do:

- **Do** make the player’s current recording identifiable within one glance.
- **Do** use the lighter Court Club system for venue tasks and retain the dark player for immersive reel viewing.
- **Do** preserve English and Traditional Chinese with labels that remain readable at mobile widths.

### Don't:

- **Don't** communicate important state with color alone.
- **Don't** make a sensitive setting appear saved before its save boundary is clear.
- **Don't** use low-contrast 11px metadata as a primary navigation or task cue.

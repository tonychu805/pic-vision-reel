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
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
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
  card:
    backgroundColor: "{colors.court-surface}"
    textColor: "{colors.court-ink}"
    rounded: "{rounded.card}"
    padding: "16px"
---

# Design System: PicVision player web

## Overview

**Creative North Star: “Court Club.”**

The venue flow is a calm courtside companion: confident outdoors, legible at a glance, and clear about the player’s own recording. It begins as a practical field guide and hands off to PicVision’s existing dark, cinematic reel viewer when the footage is ready.

Key characteristics: player-first status, quiet paper-like surfaces, court-green as an action signal, and explicit rather than clever controls.

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

**Display and body:** Inter, system-ui, sans-serif.

- **Display:** 26px / 700 / 1.15 / -0.035em for page titles.
- **Title:** 18–20px / 700 for venue, session, and account identity.
- **Body:** 15px / 400 / 1.55 for actions and explanatory copy.
- **Label:** 12px / 700 for fields and small status labels; avoid faded all-caps eyebrows.

## Layout

Venue content is mobile-first, constrained to 430px, with 18px horizontal page padding and 24px between major sections. The fixed three-item navigation retains its own bottom clearance. Put a current player session above the complete court list; do not reorder or hide courts to manufacture hierarchy.

## Elevation & Depth

Cards are primarily separated by paper/surface contrast and a 1px border. Only cards use a low ambient shadow (`0 3px 10px rgba(22,57,45,.06)`). The active-session block earns a deeper contextual shadow because it is the status anchor, not decoration.

## Shapes

Cards and session blocks use 14px corners. Controls use 10px. Pills are reserved for small state labels and language/sign-in badges; large actions remain rounded rectangles, never pills.

## Components

### Buttons

- **Primary:** Court Green fill, white text, 46px minimum height, 10px radius, 700 weight.
- **Secondary:** white/transparent with a readable green-gray border.
- **Danger:** quiet red outline; retain explicit text such as End.

### Court cards

Use white surfaces with a 1px Court Border, 16px padding, a strong court title, and an explicit status pill. Available, live, and joinable states use descriptive text as well as color.

### Your session

The signature component: a dark Court Ink status block showing the player’s court and recording end time. It summarizes without replacing the actionable court card below.

### Navigation

Three labeled, icon-supported destinations. Active state uses Court Green and stronger weight; inactive items remain readable in Court Muted.

## Do's and Don'ts

### Do:

- **Do** make the player’s current recording identifiable within one glance.
- **Do** use the lighter Court Club system for venue tasks and retain the dark player for immersive reel viewing.
- **Do** preserve English and Traditional Chinese with labels that remain readable at mobile widths.

### Don't:

- **Don't** communicate important state with color alone.
- **Don't** make a sensitive setting appear saved before its save boundary is clear.
- **Don't** use low-contrast 11px metadata as a primary navigation or task cue.

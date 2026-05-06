---
name: sprite-sequence-generator
description: Generate stable, aligned sprite animation frames for game characters using AI, optimized for extraction and game engine usage.
---

# Sprite Sequence Generator

## Purpose
Generate high-quality, aligned sprite animation frames using AI, ensuring:
- consistent character position
- in-place motion
- loopable animation
- no visual artifacts

This workflow is designed for game-ready sprite production.

---

## Inputs

- character_description: description of the character
- animation_type: one of [idle, walk, jump, attack, transform, sleep, hatch]
- frame_count: number of frames (recommended: 4–8)
- style: visual style (e.g. anime, pixel, cartoon)
- generation_mode: [image_grid, video]

---

## Workflow

### Step 1 — Normalize Constraints (CRITICAL)

Always enforce:
- character centered in every frame
- no position shift
- no scale change
- left-facing only (side view)
- all motion in-place (no translation)
- no camera movement
- no effects (glow, particles, motion blur)

---

### Step 2 — Choose Generation Strategy

#### If generation_mode = image_grid:
→ generate 1xN sprite grid (strip)

#### If generation_mode = video:
→ generate animation video for frame extraction (Not currently implemented in this demo)

---

### Step 3 — Prompt Engineering

Generate a sprite sheet strip:
- grid size = 1 row, N columns

Prompt template:
"Create a perfectly aligned sprite sheet strip.
Each frame must:
- contain the same character
- be perfectly centered
- have identical size and proportions
- face left only (side profile)
- perform motion in-place

Animation: {animation_type}
Character: {character_description}
Style: {style}

No visual effects, no camera movement, no text, plain solid background."

---

## Validation Checklist

Before finalizing:
* [ ] all frames centered
* [ ] no jitter between frames
* [ ] consistent scale
* [ ] correct orientation (left-facing)
* [ ] no visual effects
* [ ] animation loop is smooth

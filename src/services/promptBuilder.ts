/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimationState, PET_CONFIG } from "../types";

const STATE_DESCRIPTIONS: Record<AnimationState, string> = {
  'base': 'Static character design, clean side profile, neutral pose.',
  'idle': 'Standing idle, subtle breathing or tail twitching.',
  'running-right': 'Continuous running cycle moving towards the right (facing left but motion vector is right).',
  'running-left': 'Continuous running cycle towards the left.',
  'waving': 'Waving hand or greeting motion, looking at viewer or side.',
  'jumping': 'Starting jump, mid-air peak, and landing sequence.',
  'failed': 'Expressing disappointment, collapsing or hanging head low.',
  'review': 'Slow rotation or looking around curiously.',
  'sleeping': 'Curled up on the ground, slow breathing animation, eyes closed.'
};

const CODEX_STYLE_RULES = `
Art style enforcement: compact chibi proportions, chunky readable silhouettes, thick dark 1-2px outlines, visible stepped pixel edges, limited flat palette, cel shading. 
NO realistic texture, NO soft gradients, NO high-detail antialiasing.
NO detached sparkles, NO motion trails, NO shadows, NO glows, NO wave marks, NO speed lines, NO dust clouds, NO text, NO chroma-key-adjacent artifacts.`;

export function buildSpritePrompt(
  description: string,
  state: AnimationState,
  style: string
): string {
  const n = PET_CONFIG.count;
  const fw = PET_CONFIG.width;
  const fh = PET_CONFIG.height;

  if (state === 'base') {
    return `Generate a technical character design reference for a game character.
  
Character: ${description}
Visual Style: ${style}

${CODEX_STYLE_RULES}

Output Rule (CRITICAL):
- Output ONE centered full-body sprite pose only.
- Do NOT draw a strip. 
- Side profile (facing left).
- Background: FLAT solid #00FF00.
- Vertical/Horizontal Centering: Precise.`;
  }

  return `Generate a technical 1x${n} sprite strip for a digital pet.
  
Action: ${STATE_DESCRIPTIONS[state]}
Prompt Context: ${description}

Attached Images Context:
- Image 1 (GRID): Layout reference guide. Use ONLY for slot count (${n}), centering, and safe padding. Do NOT copy these lines.
- Image 2 (PERSONA): Identity reference. Lock identity: preserve head shape, markings, palette, and proportions exactly from this character.

Rules (STRICT):
1. Geometry: Single horizontal strip of ${n} frames. Each slot is ${fw}x${fh}px.
2. Identity Lock: ${description} features must be 100% consistent with Image 2.
3. Format: Side profile, facing left.
4. Motion: "Treadmill" style (in-place). No horizontal drifting.
5. Background: FLAT solid #00FF00 only.

${CODEX_STYLE_RULES}`;
}

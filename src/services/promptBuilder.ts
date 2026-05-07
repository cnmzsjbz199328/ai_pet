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
    return `Generate a technical character design reference for a digital pet. This is the MASTER ANCHOR for all subsequent animations.
  
Character: ${description}
Visual Style: ${style}

${CODEX_STYLE_RULES}

Output Rule (INTERNAL ANCHOR):
- Output EXACTLY ONE (1) centered full-body sprite pose.
- This is a SEED frame for identity lock.
- Do NOT draw a horizontal strip. 
- Side profile (facing left).
- Background: FLAT solid #00FF00 (Chroma Key).
- Proportions: Large enough to fill 70% of vertical space, perfectly centered.`;
  }

  return `Generate a technical 1x${n} sprite strip for a digital pet animation sequence.
  
Sequence Action: ${STATE_DESCRIPTIONS[state]}
Target Identity: ${description}

Attached Data:
- Image 1 (GRID): Spatial reference. Proves grid alignment for ${n} slots of ${fw}x${fh}px.
- Image 2 (IDENTITY): Master anchor image. CLONE this character's visual identity exactly. Preserve palette, unique markings, and proportions with 100% fidelity.

Production Rules (MANDATORY):
1. Geometry: Single horizontal strip of ${n} frames. Each slot is ${fw}x${fh}px.
2. Identity Lock: Follow Image 2 exactly. If it has blue spots, the strip MUST have identical blue spots.
3. Centroid Consistency: Character must stay centered in each slot. NO jumping up/down or horizontal drift unless specified in action.
4. Format: Side profile, facing left.
5. Background: FLAT solid #00FF00 only.

${CODEX_STYLE_RULES}`;
}

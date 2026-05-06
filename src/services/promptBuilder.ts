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

  return `Generate a technical 1x${n} sprite strip for a game character.
  
Character: ${description}
Action: ${STATE_DESCRIPTIONS[state]}
Visual Style: ${style}

${CODEX_STYLE_RULES}

Rules (STRICT):
1. Format: A single horizontal strip with exactly ${n} frames.
2. Geometry: Each frame is exactly ${fw}x${fh} pixels. Total image size: ${n * fw}x${fh} px.
3. Alignment: Character MUST be perfectly centered in every frame (+/- 5px). 
4. Background: Use a FLAT solid #00FF00 (Chroma Key Green) background. No patterns.
5. In-place Motion: All movement must be "on a treadmill". No horizontal translation.
6. Side Profile: Left-facing orientation preferred for stability.
7. Technicality: NO shadows, NO glow, NO particles, NO motion blur, NO visual effects.
8. Consistency: Identical character proportions and features across all ${n} frames.

GUIDE ATTACHED: Follow the provided grid layout as a spatial reference for frame boundaries.`;
}

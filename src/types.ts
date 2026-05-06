/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AnimationType = 'hatch' | 'walk' | 'attack' | 'transform' | 'rest';

export interface SpriteFrame {
  id: string;
  url: string;
  timestamp: string;
}

export interface SpriteAsset {
  id: string;
  characterDescription: string;
  animationType: AnimationType;
  style: string;
  imageUrl: string;
  frameCount: number;
}

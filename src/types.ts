/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Hatch-pet 标准行序 (9行模式)
export type AnimationState = 
  | 'base'          // 静态基准
  | 'idle'          // 待机
  | 'running-right' // 向右跑
  | 'running-left'  // 向左跑
  | 'waving'        // 挥手/打招呼
  | 'jumping'       // 跳跃
  | 'failed'        // 失败/沮丧
  | 'review'        // 检查/旋转
  | 'sleeping';     // 睡觉

export interface FrameConfig {
  width: number;
  height: number;
  count: number;
}

export const PET_CONFIG: FrameConfig = {
  width: 192,
  height: 208,
  count: 8, // 每行固定 8 帧
};

export interface SpriteRow {
  state: AnimationState;
  imageUrl: string; // 原始生成的 strip url
  frames: string[]; // 切割后的透明 PNG data urls
  isValid: boolean;
  error?: string;
}

export interface SpriteAsset {
  id: string;
  name: string;
  description: string;
  style: string;
  rows: Partial<Record<AnimationState, SpriteRow>>;
  compositeUrl?: string; // 最终 1536x1872 图集
}

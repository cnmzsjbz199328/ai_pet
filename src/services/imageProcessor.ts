/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PET_CONFIG } from "../types";

export interface ProcessedFrame {
  dataUrl: string;
  offsetX: number;
  offsetY: number;
}

/**
 * Handles image splitting, chroma-keying, and centroid alignment.
 */
export class ImageProcessor {
  /**
   * Splits a strip into frames and applies chroma-key transparency.
   */
  static async processStrip(stripUrl: string, frameCount: number): Promise<string[]> {
    const img = await this.loadImage(stripUrl);
    const fw = PET_CONFIG.width;
    const fh = PET_CONFIG.height;
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = fw;
        canvas.height = fh;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
        
        // Apply Chroma Key
        this.applyChromaKey(ctx, fw, fh);
        
        // Potential centroid alignment could go here
        // For now we trust the guide, but we could compute bounds
        
        frames.push(canvas.toDataURL('image/png'));
    }

    return frames;
  }

  private static applyChromaKey(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Green screen detection (range for #00FF00)
      // Simple logic: if green is significantly higher than r and b
      if (g > 150 && g > r * 1.4 && g > b * 1.4) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Combines frames into a 1536x1872 (8x9) spritesheet.
   */
  static async assembleAtlas(rows: Record<string, string[]>): Promise<string> {
    const canvas = document.createElement('canvas');
    const columns = 8;
    const rowList = ['base', 'idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'review', 'sleeping'];
    
    canvas.width = columns * PET_CONFIG.width;
    canvas.height = rowList.length * PET_CONFIG.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    for (let r = 0; r < rowList.length; r++) {
      const state = rowList[r];
      const frames = rows[state];
      if (!frames) continue;

      for (let c = 0; c < columns; c++) {
          if (frames[c]) {
              const img = await this.loadImage(frames[c]);
              ctx.drawImage(img, c * PET_CONFIG.width, r * PET_CONFIG.height);
          }
      }
    }

    return canvas.toDataURL('image/webp', 0.85);
  }

  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}

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
   * Splits a strip into frames, applies chroma-key transparency, and performs QA.
   */
  static async processStrip(stripUrl: string, frameCount: number): Promise<{frames: string[], isValid: boolean, error?: string}> {
    const img = await this.loadImage(stripUrl);
    const fw = PET_CONFIG.width;
    const fh = PET_CONFIG.height;
    const frames: string[] = [];
    let allValid = true;

    // Calculate actual frame dimensions from the source image
    const actualFw = img.width / frameCount;
    const actualFh = img.height;

    for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = fw;
        canvas.height = fh;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Scale and draw from source to destination frame
        ctx.drawImage(img, i * actualFw, 0, actualFw, actualFh, 0, 0, fw, fh);
        
        // Apply Soft Chroma Key
        this.applyChromaKey(ctx, fw, fh);
        
        // Centroid QA check
        const isValid = this.checkCentroid(ctx, fw, fh);
        if (!isValid) allValid = false;
        
        frames.push(canvas.toDataURL('image/png'));
    }

    return { 
      frames, 
      isValid: allValid,
      error: allValid ? undefined : "Centroid alignment check failed: Character might not be centered."
    };
  }

  private static applyChromaKey(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Improved soft green keying
      // Distance from #00FF00
      const isGreen = g > 130 && g > r * 1.2 && g > b * 1.2;
      
      if (isGreen) {
        // Simple alpha falloff for antialiasing
        const maxOther = Math.max(r, b);
        const diff = g - maxOther;
        if (diff > 20) {
            data[i + 3] = Math.max(0, 255 - (diff * 2));
        }
        
        // If it's very green, just kill it
        if (g > 180 && g > r * 1.8 && g > b * 1.8) {
            data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private static checkCentroid(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, maxX = 0;
    let hasContent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          hasContent = true;
        }
      }
    }

    if (!hasContent) return false;

    const centerX = (minX + maxX) / 2;
    const frameCenter = width / 2;
    
    // Tolerance: ±25px
    return Math.abs(centerX - frameCenter) <= 25;
  }

  /**
   * Horizontally mirrors a set of frames.
   */
  static async mirrorFrames(frames: string[]): Promise<string[]> {
    const mirrored: string[] = [];
    for (const frame of frames) {
      const img = await this.loadImage(frame);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      mirrored.push(canvas.toDataURL('image/png'));
    }
    return mirrored;
  }

  /**
   * Combines frames into a 1536x1872 (8x9) spritesheet.
   */
  static async assembleAtlas(rows: Record<string, string[]>): Promise<string> {
    const columns = 8;
    const rowList = ['base', 'idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'review', 'sleeping'];
    
    const canvas = document.createElement('canvas');
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

  /**
   * Generates a contact sheet with labels for QA purposes.
   */
  static async generateContactSheet(rows: Record<string, string[]>): Promise<string> {
    const columns = 8;
    const rowList = ['base', 'idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'review', 'sleeping'];
    const labelWidth = 150;
    
    const canvas = document.createElement('canvas');
    canvas.width = columns * PET_CONFIG.width + labelWidth;
    canvas.height = rowList.length * PET_CONFIG.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rowList.length; r++) {
      const state = rowList[r];
      const frames = rows[state];
      
      // Draw Label
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(state.toUpperCase(), 20, r * PET_CONFIG.height + PET_CONFIG.height / 2);
      
      // Separator line
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, (r + 1) * PET_CONFIG.height);
      ctx.lineTo(canvas.width, (r + 1) * PET_CONFIG.height);
      ctx.stroke();

      if (!frames) continue;

      for (let c = 0; c < columns; c++) {
          if (frames[c]) {
              const img = await this.loadImage(frames[c]);
              ctx.drawImage(img, labelWidth + c * PET_CONFIG.width, r * PET_CONFIG.height);
          }
      }
    }

    return canvas.toDataURL('image/webp', 0.8);
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

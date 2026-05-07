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
  static async processStrip(stripUrl: string, frameCount: number, isBase: boolean = false): Promise<{frames: string[], isValid: boolean, error?: string}> {
    const img = await this.loadImage(stripUrl);
    const fw = PET_CONFIG.width;
    const fh = PET_CONFIG.height;
    const frames: string[] = [];

    // Temporary canvas for global keying
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return { frames: [], isValid: false, error: "Canvas context error" };
    
    tempCtx.drawImage(img, 0, 0);
    this.applyChromaKey(tempCtx, img.width, img.height);
    
    // Find content blobs along X axis
    const blobs = this.detectContentBlobs(tempCtx, img.width, img.height, isBase ? 1 : frameCount);
    
    const finalFrames: string[] = [];
    let allValid = true;

    // If we can't detect correct number of blobs, fallback to equal spacing but warn
    if (!isBase && blobs.length !== frameCount) {
        console.warn(`Extraction Warning: Expected ${frameCount} blobs, detected ${blobs.length}. Falling back to slots.`);
        const actualSlotW = img.width / frameCount;
        for (let i = 0; i < frameCount; i++) {
            const slotCanvas = document.createElement('canvas');
            slotCanvas.width = fw;
            slotCanvas.height = fh;
            const sCtx = slotCanvas.width > 0 ? slotCanvas.getContext('2d') : null;
            if (sCtx) {
                sCtx.drawImage(tempCanvas, i * actualSlotW, 0, actualSlotW, img.height, 0, 0, fw, fh);
                finalFrames.push(slotCanvas.toDataURL('image/png'));
            }
        }
        allValid = false;
    } else {
        // Correct blob extraction
        for (const blob of blobs) {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = fw;
            frameCanvas.height = fh;
            const fCtx = frameCanvas.getContext('2d');
            if (fCtx) {
                // Calculate scale to fit in 192x208 with 20px padding
                const blobW = blob.x2 - blob.x1;
                const blobH = blob.y2 - blob.y1;
                const scale = Math.min((fw - 40) / blobW, (fh - 40) / blobH, 1.0);
                
                const drawW = blobW * scale;
                const drawH = blobH * scale;
                const offsetX = (fw - drawW) / 2;
                const offsetY = (fh - drawH) / 2;
                
                fCtx.drawImage(tempCanvas, blob.x1, blob.y1, blobW, blobH, offsetX, offsetY, drawW, drawH);
                finalFrames.push(frameCanvas.toDataURL('image/png'));
            }
        }
    }

    return { 
      frames: finalFrames, 
      isValid: allValid,
      error: allValid ? undefined : (isBase ? "Base detection failed" : `Blobs out of sequence: Found ${blobs.length}/${frameCount}`)
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

  private static detectContentBlobs(ctx: CanvasRenderingContext2D, width: number, height: number, expected: number) {
    const data = ctx.getImageData(0, 0, width, height).data;
    const colDensity = new Int32Array(width);
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
            colDensity[x]++;
        }
      }
    }

    const intervals: {start: number, end: number}[] = [];
    let inInterval = false;
    for (let x = 0; x < width; x++) {
        if (!inInterval && colDensity[x] > 5) {
            intervals.push({start: x, end: x});
            inInterval = true;
        } else if (inInterval && colDensity[x] <= 5) {
            intervals[intervals.length - 1].end = x;
            inInterval = false;
        }
    }

    // Merge close intervals (less than 10px apart)
    const merged: {x1: number, y1: number, x2: number, y2: number}[] = [];
    for (const interval of intervals) {
        if (merged.length > 0 && interval.start - merged[merged.length-1].x2 < 15) {
            merged[merged.length-1].x2 = interval.end;
        } else {
            merged.push({x1: interval.start, y1: 0, x2: interval.end, y2: height});
        }
    }

    // Refine Y bounds for each merged blob
    return merged.map(blob => {
        let minY = height, maxY = 0;
        for (let x = blob.x1; x < blob.x2; x++) {
            for (let y = 0; y < height; y++) {
                if (data[(y * width + x) * 4 + 3] > 10) {
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        return { ...blob, y1: minY, y2: maxY };
    }).filter(b => (b.x2 - b.x1) > 5 && (b.y2 - b.y1) > 5);
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

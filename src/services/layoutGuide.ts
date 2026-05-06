/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PET_CONFIG } from "../types";

/**
 * Generates a layout guide image (base64) to help the AI align sprites.
 * It's a grid with center crosses for each frame.
 */
export function generateLayoutGuide(): string {
  const canvas = document.createElement('canvas');
  canvas.width = PET_CONFIG.width * PET_CONFIG.count;
  canvas.height = PET_CONFIG.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return "";

  // Fill Background with Chroma Key Green
  ctx.fillStyle = "#00FF00";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Grid and Centers
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;

  for (let i = 0; i < PET_CONFIG.count; i++) {
    const x = i * PET_CONFIG.width;
    
    // Frame boundary
    ctx.strokeRect(x, 0, PET_CONFIG.width, PET_CONFIG.height);
    
    // Center crosshair
    ctx.beginPath();
    ctx.moveTo(x + PET_CONFIG.width / 2 - 10, PET_CONFIG.height / 2);
    ctx.lineTo(x + PET_CONFIG.width / 2 + 10, PET_CONFIG.height / 2);
    ctx.moveTo(x + PET_CONFIG.width / 2, PET_CONFIG.height / 2 - 10);
    ctx.lineTo(x + PET_CONFIG.width / 2, PET_CONFIG.height / 2 + 10);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

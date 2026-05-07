/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { AnimationState, PET_CONFIG } from "../types";
import { buildSpritePrompt } from "./promptBuilder";
import { generateLayoutGuide } from "./layoutGuide";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSpriteRow(
  description: string,
  state: AnimationState,
  style: string,
  baseImageBase64?: string
): Promise<string> {
  const prompt = buildSpritePrompt(description, state, style);
  const layoutGuide = generateLayoutGuide();
  
  const parts: any[] = [{ text: prompt }];

  // Attachment order:
  // 1. Layout Guide (only for strips)
  // 2. Persona Reference (if available)

  if (state !== 'base') {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: layoutGuide.split(',')[1]
      }
    });
  }

  if (baseImageBase64) {
    const base64Data = baseImageBase64.split(',')[1] || baseImageBase64;
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64Data
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts }],
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image was generated.");
}

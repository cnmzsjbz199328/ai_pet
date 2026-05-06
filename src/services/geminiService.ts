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
  
  const parts: any[] = [
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/png",
        data: layoutGuide.split(',')[1]
      }
    }
  ];

  if (baseImageBase64) {
    const base64Data = baseImageBase64.split(',')[1] || baseImageBase64;
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64Data
      }
    });
    const lastPart = parts[0];
    lastPart.text = `${lastPart.text}\n\nREFERENCE PERSONA ATTACHED: The second image provided is the base character design. The character in this new strip MUST exactly match the features, colors, and clothing of this reference character. Maintain 100% identity consistency.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts }],
    config: {
      imageConfig: {
        aspectRatio: "21:3", // Approximately 7:1 for 1x8 strip (1536x208)
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image was generated.");
}

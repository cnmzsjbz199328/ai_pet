/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { AnimationType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getModel = () => "gemini-3-flash-preview";

export async function generateSpritePrompt(
  character: string,
  animation: AnimationType,
  style: string,
  frameCount: number
): Promise<string> {
  const systemPrompt = `You are a professional game asset technical artist specializing in sprite sheet prompt engineering. 
Your task is to take a character description and return a high-quality prompt for an image generator (like Imagen) that will produce a perfectly aligned sprite sheet strip.

Constraints to follow for the generated prompt:
- Always specify a "horizontal sprite sheet strip" or "1x4 row sequence". No grids, just one row.
- Arrange the animation frames horizontally in one single row from left to right.
- Character must be perfectly centered in each frame.
- Facing left strictly (side profile).
- White or simple flat solid background.
- No artifacts, no depth of field, no motion blur.
- Motion must be "in-place" (like on a treadmill).
- Consistent scale and proportions across all frames.

Input character: ${character}
Animation: ${animation}
Style: ${style}
Frame count: ${frameCount}`;

  const response = await ai.models.generateContent({
    model: getModel(),
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\nGenerate only the image prompt, no preamble." }],
      },
    ],
  });

  return response.text?.trim() || "";
}

export async function generateSpriteImage(prompt: string, baseImageBase64?: string): Promise<string> {
  const parts: any[] = [{ text: prompt }];

  if (baseImageBase64) {
    const base64Data = baseImageBase64.split(',')[1] || baseImageBase64;
    parts.unshift({
      inlineData: {
        mimeType: "image/png",
        data: base64Data
      }
    });
    parts[parts.length - 1].text = `REFERENCE IMAGE ATTACHED. ${parts[parts.length - 1].text}. The character in the generated sprite sheet MUST be identical to the one in the reference image. Keep the same colors, clothes, and features precisely.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts }],
    config: {
      imageConfig: {
        aspectRatio: "1:1", 
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

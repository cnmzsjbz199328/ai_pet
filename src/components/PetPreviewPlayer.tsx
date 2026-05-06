/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { PET_CONFIG, AnimationState } from "../types";

interface PetPreviewPlayerProps {
  frames: string[]; // Current active row frames
  fps?: number;
  className?: string;
  autoPlay?: boolean;
}

export default function PetPreviewPlayer({ 
  frames, 
  fps = 10, 
  className = "",
  autoPlay = true
}: PetPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!frames || frames.length === 0) return;

    const animate = (time: number) => {
      const delta = time - lastTimeRef.current;
      const interval = 1000 / fps;

      if (delta >= interval) {
        setCurrentFrame((prev) => (prev + 1) % frames.length);
        lastTimeRef.current = time;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    if (autoPlay) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [frames, fps, autoPlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[currentFrame]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = frames[currentFrame];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [currentFrame, frames]);

  return (
    <div className={`relative overflow-hidden bg-gray-50 flex items-center justify-center ${className}`}>
      <canvas 
        ref={canvasRef}
        width={PET_CONFIG.width}
        height={PET_CONFIG.height}
        className="w-full h-full object-contain pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {frames.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs text-center p-4">
              Processing Frames...
          </div>
      )}

      {/* Frame Counter Overlay */}
      <div className="absolute top-2 right-2 flex gap-1">
        <span className="text-[10px] font-mono bg-white/90 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 shadow-sm">
          {currentFrame + 1} / {frames.length || 0}
        </span>
      </div>
    </div>
  );
}

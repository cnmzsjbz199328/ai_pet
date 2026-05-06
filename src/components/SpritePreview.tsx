/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface SpritePreviewProps {
  imageUrl: string;
  frameCount: number;
  fps?: number;
  className?: string;
}

export default function SpritePreview({ imageUrl, frameCount, fps = 8, className = "" }: SpritePreviewProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!imageUrl || frameCount <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [imageUrl, frameCount, fps]);

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
        <p className="text-gray-400 text-sm">No preview available</p>
      </div>
    );
  }

  // Assuming it's a horizontal strip. 
  // Each frame width is 100 / frameCount %
  const frameWidth = 100 / frameCount;

  return (
    <div className={`overflow-hidden rounded-lg bg-gray-50 border border-gray-200 relative ${className}`}>
      <motion.div
        className="absolute inset-0 h-full w-full"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${100 * frameCount}% 100%`,
          backgroundPosition: `${currentFrame * (100 / (frameCount - 1))}% 0%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Fallback for inspection */}
      <div className="absolute top-2 right-2 flex gap-1">
        <span className="text-[10px] font-mono bg-white/80 px-1 rounded border border-gray-200">
          Frame: {currentFrame + 1}/{frameCount}
        </span>
      </div>
    </div>
  );
}

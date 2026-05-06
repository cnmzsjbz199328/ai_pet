/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Sparkles, Play, Sword, Footprints, Egg, Coffee, Loader2, Download, Lock, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnimationType, SpriteAsset } from "../types";
import { generateSpritePrompt, generateSpriteImage } from "../services/geminiService";
import SpritePreview from "./SpritePreview";

const ANIMATIONS: { type: AnimationType; icon: any; label: string }[] = [
  { type: 'hatch', icon: Egg, label: 'Hatch' },
  { type: 'walk', icon: Footprints, label: 'Walk' },
  { type: 'attack', icon: Sword, label: 'Attack' },
  { type: 'transform', icon: Sparkles, label: 'Transform' },
  { type: 'rest', icon: Coffee, label: 'Rest' },
];

const STYLES = ["Pixel Art", "Anime", "Cartoon", "Realistic", "Sketch", "3D Render"];

export default function SpriteGenerator() {
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Pixel Art");
  const [isGenerating, setIsGenerating] = useState(false);
  const [assets, setAssets] = useState<SpriteAsset[]>([]);
  const [activeTab, setActiveTab] = useState<AnimationType>('walk');
  const [baseCharacter, setBaseCharacter] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description || isGenerating) return;

    setIsGenerating(true);
    try {
      const prompt = await generateSpritePrompt(description, activeTab, selectedStyle, 4);
      const imageUrl = await generateSpriteImage(prompt, baseCharacter || undefined);

      const newAsset: SpriteAsset = {
        id: crypto.randomUUID(),
        characterDescription: description,
        animationType: activeTab,
        style: selectedStyle,
        imageUrl: imageUrl,
        frameCount: 4,
      };

      setAssets([newAsset, ...assets]);
      
      // Automatically set the first generated asset as base if none exists
      if (!baseCharacter) {
        setBaseCharacter(imageUrl);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate sprite. Please check your API key or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string, name: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `sprite_${name}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Sparkles className="text-amber-500 w-8 h-8" />
            Sprite Animator Pro
          </h1>
          <p className="text-gray-500 max-w-xl">
            Character-consistent sprite generator. Lock your base design to ensure all animations match perfectly.
          </p>
        </div>
        
        {baseCharacter && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full border border-amber-200 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-100 bg-gray-50">
              <img src={baseCharacter} alt="Reference" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Design Locked</p>
              <button 
                onClick={() => setBaseCharacter(null)}
                className="text-[10px] text-gray-400 hover:text-red-500 underline"
              >
                Reset Reference
              </button>
            </div>
            <Lock size={14} className="text-amber-500 ml-2" />
          </motion.div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 sticky top-6">
            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                1. Character Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your character traits..."
                className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none resize-none"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                2. Visual Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      selectedStyle === style
                        ? "bg-amber-100 border-amber-300 text-amber-900 font-medium"
                        : "bg-white border-gray-200 text-gray-600 hover:border-amber-200"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                3. Choose Action
              </label>
              <div className="flex flex-wrap gap-2">
                {ANIMATIONS.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                      activeTab === type
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!description || isGenerating}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Drawing...
                </>
              ) : (
                <>
                  {baseCharacter ? <Sparkles size={18} /> : <Play size={18} fill="currentColor" />}
                  {baseCharacter ? "Generate Action" : "Create Base Character"}
                </>
              )}
            </button>

            {baseCharacter && (
              <p className="text-[10px] text-center text-gray-400 italic">
                Using current reference image for character consistency.
              </p>
            )}
          </div>
        </div>

        {/* Assets Feed */}
        <div className="lg:col-span-8">
          <div className="bg-gray-50/50 rounded-2xl border border-gray-200 p-6 min-h-[600px] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Sprite Gallery</h2>
              <span className="text-sm text-gray-400 font-mono px-2 py-0.5 bg-gray-100 rounded">{assets.length} Assets</span>
            </div>

            {assets.length === 0 && !isGenerating ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Footprints className="text-gray-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-gray-500">Your workshop is empty</p>
                  <p className="text-sm text-gray-400">Define your character visual to get started.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-4 rounded-2xl border border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col gap-4"
                    >
                      <div className="aspect-square bg-amber-50/30 rounded-xl animate-pulse flex items-center justify-center">
                         <Loader2 className="animate-spin text-amber-400 w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-50 rounded w-1/2 animate-pulse" />
                      </div>
                    </motion.div>
                  )}
                  {assets.map((asset) => (
                    <motion.div
                      layout
                      key={asset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white p-4 rounded-2xl border transition-all group flex flex-col gap-4 ${
                        baseCharacter === asset.imageUrl ? 'border-amber-400 ring-2 ring-amber-100 shadow-lg' : 'border-gray-200 hover:border-amber-200 hover:shadow-md'
                      }`}
                    >
                      <SpritePreview 
                        imageUrl={asset.imageUrl} 
                        frameCount={asset.frameCount} 
                        className="aspect-square w-full"
                      />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                              {asset.animationType}
                            </span>
                            {baseCharacter === asset.imageUrl && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                <Check size={10} /> Active Ref
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {asset.style}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {asset.characterDescription}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 mt-auto flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleDownload(asset.imageUrl, asset.animationType)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Download Sprite Sheet"
                          >
                            <Download size={16} />
                          </button>
                          {baseCharacter !== asset.imageUrl && (
                            <button 
                              onClick={() => {
                                setBaseCharacter(asset.imageUrl);
                                setDescription(asset.characterDescription);
                                setSelectedStyle(asset.style);
                              }}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Set as Character Reference"
                            >
                              <Lock size={16} />
                            </button>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => setAssets(assets.filter(a => a.id !== asset.id))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Asset"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

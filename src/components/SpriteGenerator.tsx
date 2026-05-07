/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { Sparkles, Play, Footprints, Box, Coffee, Loader2, Download, Lock, Check, Trash2, RotateCcw, AlertTriangle, Repeat, ChevronDown, Wand2, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { AnimationState, PET_CONFIG, SpriteRow } from "../types";
import { generateSpriteRow } from "../services/geminiService";
import { ImageProcessor } from "../services/imageProcessor";
import PetPreviewPlayer from "./PetPreviewPlayer";

const ANIMATION_ROWS: { state: AnimationState; label: string; icon: any }[] = [
  { state: 'base', label: '1. Identity', icon: Box },
  { state: 'idle', label: '2. Idle', icon: Coffee },
  { state: 'running-right', label: '3. Run Right', icon: Footprints },
  { state: 'running-left', label: '4. Run Left', icon: Footprints },
  { state: 'waving', label: '5. Waving', icon: Sparkles },
  { state: 'jumping', label: '6. Jumping', icon: Play },
  { state: 'failed', label: '7. Failed', icon: AlertTriangle },
  { state: 'review', label: '8. Review', icon: RotateCcw },
  { state: 'sleeping', label: '9. Sleeping', icon: Coffee },
];

const STYLES = ["Pixel Art", "Anime", "Cartoon", "3D Render"];

export default function SpriteGenerator() {
  // Input State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Pixel Art");

  // Workflow State
  const [rows, setRows] = useState<Record<string, SpriteRow>>({});
  const [generatingState, setGeneratingState] = useState<AnimationState | null>(null);
  const [selectedState, setSelectedState] = useState<AnimationState | null>(null);

  const detailRef = useRef<HTMLDivElement>(null);

  const hasBase = useMemo(() => !!rows['base'], [rows]);
  const progressCount = useMemo(() => Object.keys(rows).length, [rows]);

  // Force base selection if none exists
  useEffect(() => {
    if (!hasBase && selectedState !== 'base') {
      setSelectedState('base');
    }
  }, [hasBase, selectedState]);

  const handleGenerate = async (state: AnimationState) => {
    if (!description || generatingState) return;

    setGeneratingState(state);
    try {
      const isBase = state === 'base';
      const baseRow = rows['base'];
      
      const referenceImage = !isBase ? (baseRow?.frames?.[0] || baseRow?.imageUrl) : undefined;
      const stripUrl = await generateSpriteRow(description, state, selectedStyle, referenceImage);
      const result = await ImageProcessor.processStrip(stripUrl, isBase ? 1 : PET_CONFIG.count, isBase);

      const newRow: SpriteRow = {
        state,
        imageUrl: stripUrl,
        frames: result.frames,
        isValid: result.isValid,
        error: result.error
      };

      setRows(prev => ({ ...prev, [state]: newRow }));
      setSelectedState(state);
      
      // Auto scroll to detail
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Generation failed. AI may have rejected the instruction or quota limit reached.");
    } finally {
      setGeneratingState(null);
    }
  };

  const handleMirrorLeft = async () => {
    const rightRow = rows['running-right'];
    if (!rightRow) return;

    setGeneratingState('running-left');
    try {
        const mirroredFrames = await ImageProcessor.mirrorFrames(rightRow.frames);
        const newRow: SpriteRow = {
          state: 'running-left',
          imageUrl: rightRow.imageUrl,
          frames: mirroredFrames,
          isValid: true
        };
        setRows(prev => ({ ...prev, ['running-left']: newRow }));
        setSelectedState('running-left');
        setTimeout(() => {
            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } finally {
        setGeneratingState(null);
    }
  };

  const handleDownload = async () => {
    const frameMap: Record<string, string[]> = {};
    Object.keys(rows).forEach(key => { frameMap[key] = rows[key].frames; });

    try {
        const atlas = await ImageProcessor.assembleAtlas(frameMap);
        const zip = new JSZip();
        const petNameSlug = name.replace(/\s+/g, '_') || 'pet';
        const folder = zip.folder(`pets/${petNameSlug}`)!;
        
        // 1. Spritesheet
        folder.file("spritesheet.webp", atlas.split(',')[1], { base64: true });

        // 2. pet.json
        folder.file("pet.json", JSON.stringify({
            name: name || "Unnamed Pet",
            frameSize: { width: PET_CONFIG.width, height: PET_CONFIG.height },
            chromaKey: "#00FF00",
            fps: 10,
            animations: Object.keys(rows).map((key) => ({
                state: key,
                frameCount: rows[key].frames.length,
                rowIndex: ['base', 'idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'review', 'sleeping'].indexOf(key),
                loop: !['base', 'failed'].includes(key),
                mirrored: key === 'running-left' && rows['running-right']?.imageUrl === rows[key].imageUrl
            }))
        }, null, 2));

        // 3. QA
        const qaFolder = folder.folder("qa")!;
        qaFolder.file("review.json", JSON.stringify({
            metadata: { timestamp: new Date().toISOString(), totalRows: progressCount },
            results: Object.keys(rows).map(key => ({ 
                state: key, 
                isValid: rows[key].isValid, 
                error: rows[key].error || null 
            }))
        }, null, 2));
        
        const contactSheetUrl = await ImageProcessor.generateContactSheet(frameMap);
        qaFolder.file("contact-sheet.webp", contactSheetUrl.split(',')[1], { base64: true });

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${petNameSlug}_package.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-32">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
               <Box size={24} />
            </div>
            <h1 className="font-black text-lg tracking-tight uppercase">Hatch-Pet</h1>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center gap-4 border-l border-slate-200 pl-6 w-full md:w-auto">
             <div className="w-full md:w-48 shrink-0">
               <input 
                 value={name} 
                 onChange={e => setName(e.target.value)}
                 className="w-full bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold"
                 placeholder="Pet Name (e.g. Jelly)"
               />
             </div>
             <div className="flex-1 w-full">
               <input 
                 value={description} 
                 onChange={e => setDescription(e.target.value)}
                 className="w-full bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                 placeholder="Visual description (e.g. A neon blue slime with wings)"
               />
             </div>
             <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
               {STYLES.map(s => (
                 <button 
                   key={s} 
                   onClick={() => setSelectedStyle(s)}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedStyle === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {s}
                 </button>
               ))}
             </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 pl-6 border-l border-slate-200">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Progress</p>
                <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{progressCount}/9 Rows</p>
             </div>
             <button 
               onClick={handleDownload}
               disabled={progressCount === 0}
               className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
             >
               <Download size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-16 flex flex-col items-center">
        {/* Tree Canvas */}
        <div className="w-full flex flex-col items-center relative py-10">
          
          {/* Base Node (Root) */}
          <BaseNode 
            data={rows['base']} 
            isGenerating={generatingState === 'base'}
            isSelected={selectedState === 'base'}
            onSelect={() => setSelectedState('base')}
            onGenerate={() => handleGenerate('base')}
          />

          <AnimatePresence>
            {hasBase && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full flex flex-col items-center overflow-hidden"
              >
                {/* Stem */}
                <div className="w-px h-12 bg-slate-200" />

                {/* Horizontal Bar & Children */}
                <div className="w-full max-w-5xl">
                   {/* Connection Bar */}
                   <div className="grid grid-cols-4 px-[12.5%]">
                      {Array.from({length: 4}).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <div className="w-full h-px bg-slate-200" />
                           <div className="w-px h-8 bg-slate-200" />
                        </div>
                      ))}
                   </div>

                   {/* Rows */}
                   <div className="grid grid-cols-4 gap-x-8 gap-y-12">
                      {ANIMATION_ROWS.filter(r => r.state !== 'base').map((r) => (
                        <div key={r.state} className="flex flex-col items-center">
                          <AnimationNode 
                            config={r}
                            data={rows[r.state]}
                            isGenerating={generatingState === r.state}
                            isSelected={selectedState === r.state}
                            onSelect={() => setSelectedState(r.state)}
                            onGenerate={() => handleGenerate(r.state)}
                            onMirror={r.state === 'running-left' && rows['running-right'] && !rows['running-left'] ? handleMirrorLeft : undefined}
                          />
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!hasBase && !generatingState && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 flex items-center gap-3 text-slate-400 bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm"
            >
              <Info size={16} className="text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-wider">Initialize the base character to unlock the factory</p>
            </motion.div>
          )}
        </div>

        {/* Detail Panel */}
        <div ref={detailRef} className="w-full mt-24">
          <AnimatePresence mode="wait">
            {selectedState && rows[selectedState] && (
              <DetailPanel 
                state={selectedState}
                data={rows[selectedState]}
                isGenerating={generatingState === selectedState}
                onClose={() => setSelectedState(null)}
                onClear={() => {
                   const n = {...rows};
                   delete n[selectedState];
                   setRows(n);
                   setSelectedState(null);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Internal Components

function BaseNode({ data, isGenerating, isSelected, onSelect, onGenerate }: any) {
  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 z-20`}>
      <motion.div 
        layoutId="node-base"
        onClick={data ? onSelect : undefined}
        className={`w-64 h-80 rounded-[2.5rem] border-4 flex flex-col items-center justify-center relative overflow-hidden transition-all group ${
          isSelected ? 'border-amber-500 shadow-2xl shadow-amber-200 bg-white' : 
          data ? 'border-white shadow-xl bg-white hover:border-slate-100 cursor-pointer' : 
          'border-dashed border-slate-200 bg-slate-50'
        }`}
      >
        {data ? (
          <>
            <div className="flex-1 w-full flex items-center justify-center p-8 bg-slate-50/50">
              <img src={data.frames[0]} className="w-full h-full object-contain pixelated drop-shadow-2xl" style={{ imageRendering: 'pixelated' }} />
            </div>
            <div className="p-5 w-full bg-white border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Box size={14} className="text-amber-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">Identity</p>
                   <p className="text-[8px] font-bold text-slate-400 mt-0.5">Reference Anchor</p>
                 </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${data.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </>
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-6">
             <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
                <Loader2 size={40} className="text-amber-500 animate-spin relative" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 text-center px-6">Summoning Core Design...</span>
          </div>
        ) : (
          <button 
            onClick={onGenerate}
            className="flex flex-col items-center gap-6 group-hover:scale-110 transition-transform"
          >
             <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:border-amber-200 group-hover:shadow-xl transition-all">
               <Wand2 size={32} />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hatch Pet</span>
          </button>
        )}
      </motion.div>

      {data && !isGenerating && (
        <button 
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          className="absolute -bottom-4 bg-slate-900 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-30"
        >
          Redesign Anchor
        </button>
      )}
    </div>
  );
}

function AnimationNode({ config, data, isGenerating, isSelected, onSelect, onGenerate, onMirror }: any) {
  const Icon = config.icon;
  
  return (
    <motion.div 
      layoutId={`node-${config.state}`}
      className="w-full flex flex-col items-center relative z-10"
    >
      <div 
        onClick={data ? onSelect : undefined}
        className={`w-full aspect-[4/5] rounded-[2rem] border-2 flex flex-col relative overflow-hidden transition-all group ${
          isSelected ? 'border-amber-500 shadow-xl bg-white scale-105' : 
          data ? 'border-white shadow-md bg-white hover:border-slate-100 cursor-pointer' : 
          'border-dashed border-slate-200 bg-transparent'
        }`}
      >
        <div className="p-3.5 border-b border-gray-50 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Icon size={14} className={data ? 'text-amber-500' : 'text-slate-300'} />
              <span className={`text-[10px] font-black uppercase tracking-tight ${data ? 'text-slate-900' : 'text-slate-400'}`}>
                {config.label.split('. ')[1]}
              </span>
           </div>
           {data && <div className={`w-2 h-2 rounded-full ${data.isValid ? 'bg-green-500' : 'bg-red-500'}`} />}
        </div>

        <div className="flex-1 flex items-center justify-center p-3 relative">
          {data ? (
             <div className="grid grid-cols-2 gap-2 w-full h-full opacity-70 group-hover:opacity-100 transition-opacity">
               {data.frames.slice(0, 4).map((f: string, i: number) => (
                 <div key={i} className="bg-slate-50 flex items-center justify-center rounded-lg overflow-hidden border border-slate-100/50">
                   <img src={f} className="w-full h-full object-contain pixelated" />
                 </div>
               ))}
             </div>
          ) : isGenerating ? (
             <Loader2 size={24} className="text-amber-500 animate-spin" />
          ) : (
            <div className="w-full flex flex-col items-center gap-3">
                 {onMirror ? (
                   <button 
                     onClick={onMirror}
                     title="Mirror from Running Right"
                     className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 hover:text-amber-500 hover:border-amber-200 hover:shadow-lg transition-all"
                   >
                     <Repeat size={20} />
                   </button>
                 ) : (
                    <button 
                      onClick={onGenerate}
                      className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 hover:text-amber-500 hover:border-amber-200 hover:shadow-lg transition-all"
                    >
                      <Sparkles size={20} />
                    </button>
                 )}
            </div>
          )}
        </div>
      </div>
      
      {data && !isSelected && (
        <div className="mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Click for details
        </div>
      )}
    </motion.div>
  );
}

function DetailPanel({ state, data, isGenerating, onClose, onClear }: any) {
  const config = ANIMATION_ROWS.find(r => r.state === state);
  const Icon = config?.icon || Box;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="bg-white rounded-[3rem] border border-slate-200 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden"
    >
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-200">
              <Icon size={32} />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{config?.label.split('. ')[1]} Workspace</h2>
              <div className="flex items-center gap-4 mt-1.5">
                 <div className="flex items-center gap-1.5 text-slate-400">
                   <div className="w-1 h-1 rounded-full bg-slate-300" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">{PET_CONFIG.width}×{PET_CONFIG.height} Alignment</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className={`w-2 h-2 rounded-full ${data.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${data.isValid ? 'text-slate-900' : 'text-red-500'}`}>
                       {data.isValid ? 'Technical QA Passed' : 'Audit Failed'}
                    </span>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={onClear} 
             title="Discard Row"
             className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
           >
              <Trash2 size={24} />
           </button>
           <div className="w-px h-8 bg-slate-100 mx-2" />
           <button 
             onClick={onClose} 
             className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
           >
              <ChevronDown size={28} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 bg-slate-50/30">
         {/* Stage 1: Raw Output */}
         <div className="p-10 space-y-8">
            <div className="flex flex-col gap-2">
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">1</span>
                  AI Generation Source
               </h3>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">The original horizontal strip synthesized by the identity-locked transformer.</p>
            </div>
            <div className={`h-48 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center overflow-hidden relative group shadow-sm ${isGenerating ? 'animate-pulse' : ''}`}>
               {isGenerating ? (
                 <Loader2 size={32} className="text-amber-500 animate-spin" />
               ) : (
                 <>
                   <img src={data.imageUrl} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-1000" />
                   <div className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest font-mono">1x8 Strip</div>
                 </>
               )}
            </div>
         </div>

         {/* Stage 2: Fragmented Frames */}
         <div className="p-10 space-y-8">
            <div className="flex flex-col gap-2">
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">2</span>
                  Technical Extraction
               </h3>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">Centroid-based segmentation separating characters from the chroma key background.</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
               {data.frames.map((f: string, i: number) => (
                  <div key={i} className="aspect-square bg-white rounded-2xl border border-slate-100 flex items-center justify-center p-2 shadow-sm group relative overflow-hidden transition-all hover:border-amber-200">
                     <img src={f} className="w-full h-full object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                     <span className="absolute bottom-1 right-2 text-[8px] font-black text-slate-300 group-hover:text-amber-400 transition-colors">#{i+1}</span>
                  </div>
               ))}
               {data.frames.length === 1 && state === 'base' && Array.from({length: 7}).map((_, i) => (
                 <div key={i} className="aspect-square bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-200">
                    <Lock size={12} />
                 </div>
               ))}
            </div>
         </div>

         {/* Stage 3: Animation Loop */}
         <div className="p-10 space-y-8 bg-slate-950">
            <div className="flex flex-col gap-2 text-white">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px]">3</span>
                  Loop Emulation
               </h3>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">Real-time factory simulation of the sprite as it will appear in-game.</p>
            </div>
            
            <div className="flex flex-col items-center gap-10 relative py-4">
               <div className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: `${PET_CONFIG.width/2}px ${PET_CONFIG.height/2}px` }} />
               
               <div className="relative group">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-[100px] group-hover:bg-amber-500/30 transition-all duration-1000" />
                  <PetPreviewPlayer 
                    frames={data.frames}
                    className="w-56 h-56 relative z-10 transition-transform group-hover:scale-110 duration-1000 drop-shadow-[0_0_50px_rgba(245,158,11,0.25)]"
                  />
               </div>

               <div className="flex gap-4 px-6 py-3 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 relative z-20 shadow-2xl">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_12px_#22c55e]" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest font-mono">Chroma-OK</span>
                  </div>
                  <div className="w-[1px] h-4 bg-white/10" />
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest font-mono">{state === 'base' ? 'Design' : 'Animation'}</span>
                  <div className="w-[1px] h-4 bg-white/10" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-mono">10 FPS</span>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

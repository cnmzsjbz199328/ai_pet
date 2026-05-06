/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Sparkles, Play, Sword, Footprints, Box, Coffee, Loader2, Download, Lock, Check, Trash2, RotateCcw, AlertTriangle, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { AnimationState, PET_CONFIG, SpriteRow } from "../types";
import { generateSpriteRow } from "../services/geminiService";
import { ImageProcessor } from "../services/imageProcessor";
import PetPreviewPlayer from "./PetPreviewPlayer";

const ANIMATION_ROWS: { state: AnimationState; label: string; icon: any }[] = [
  { state: 'base', label: '1. Base Design', icon: Box },
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Pixel Art");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeState, setActiveState] = useState<AnimationState>('base');
  
  const [rows, setRows] = useState<Record<string, SpriteRow>>({});
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);

  const activeRow = useMemo(() => rows[activeState], [rows, activeState]);

  const ActiveIcon = useMemo(() => {
    return ANIMATION_ROWS.find(r => r.state === activeState)?.icon ?? Box;
  }, [activeState]);

  const handleGenerateRow = async () => {
    if (!description || isGenerating) return;

    setIsGenerating(true);
    try {
      const baseRow = rows['base'];
      const stripUrl = await generateSpriteRow(description, activeState, selectedStyle, baseRow?.imageUrl);
      
      // Process strip into frames with QA
      const result = await ImageProcessor.processStrip(stripUrl, PET_CONFIG.count);

      const newRow: SpriteRow = {
        state: activeState,
        imageUrl: stripUrl,
        frames: result.frames,
        isValid: result.isValid,
        error: result.error
      };

      setRows(prev => ({ ...prev, [activeState]: newRow }));
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate row. Try again or check the documentation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMirrorRunningLeft = async () => {
    const rightRow = rows['running-right'];
    if (!rightRow) return;

    const mirroredFrames = await ImageProcessor.mirrorFrames(rightRow.frames);
    const newRow: SpriteRow = {
      state: 'running-left',
      imageUrl: rightRow.imageUrl, // Link to same original but frames are transformed
      frames: mirroredFrames,
      isValid: true
    };
    setRows(prev => ({ ...prev, ['running-left']: newRow }));
    setActiveState('running-left');
  };

  const handleAssembleAtlas = async () => {
    const frameMap: Record<string, string[]> = {};
    Object.keys(rows).forEach(key => {
        frameMap[key] = rows[key].frames;
    });

    try {
        const atlas = await ImageProcessor.assembleAtlas(frameMap);
        setCompositeUrl(atlas);
    } catch (error) {
        console.error("Assembly failed:", error);
    }
  };

  const handleDownloadPackage = async () => {
    if (!compositeUrl) return;

    try {
        const zip = new JSZip();
        const petNameSlug = name.replace(/\s+/g, '_') || 'pet';
        const folder = zip.folder(`pets/${petNameSlug}`);
        
        if (!folder) throw new Error("Could not create ZIP folder structure");

        // 1. Spritesheet
        const sheetBase64 = compositeUrl.split(',')[1];
        folder.file("spritesheet.webp", sheetBase64, { base64: true });

        // 2. pet.json
        const petJson = {
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
        };
        folder.file("pet.json", JSON.stringify(petJson, null, 2));

        // 3. QA Folder: review.json and contact-sheet
        const qaFolder = folder.folder("qa");
        if (qaFolder) {
            const qaReport = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    petName: name || "Unnamed Pet",
                    totalRows: Object.keys(rows).length
                },
                results: Object.keys(rows).map(key => ({
                    state: key,
                    isValid: rows[key].isValid,
                    error: rows[key].error || null
                }))
            };
            qaFolder.file("review.json", JSON.stringify(qaReport, null, 2));
            
            // Generate labeled contact sheet (wrap in sub-try to not block main zip)
            try {
                const frameMap: Record<string, string[]> = {};
                Object.keys(rows).forEach(key => {
                    frameMap[key] = rows[key].frames;
                });
                const contactSheetUrl = await ImageProcessor.generateContactSheet(frameMap);
                const contactBase64 = contactSheetUrl.split(',')[1];
                qaFolder.file("contact-sheet.webp", contactBase64, { base64: true });
            } catch (qaErr) {
                console.error("QA Contact sheet generation failed", qaErr);
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${petNameSlug}_package.zip`;
        
        // Append to DOM to ensure click works in all environments
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Failed to export bundle. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-20">
      {/* ... header ... */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Box className="text-amber-500 w-10 h-10" />
            Hatch-Pet Factory
          </h1>
          <p className="text-gray-500 max-w-xl text-sm">
             Professional character sprite production system. 9-row standard spritesheet generator with technical alignment.
          </p>
        </div>

        <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Row Progress</p>
                <div className="flex gap-1 mt-1 font-mono text-[10px] items-center">
                    {ANIMATION_ROWS.map((r, i) => (
                        <div 
                          key={r.state} 
                          className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                            rows[r.state] 
                              ? rows[r.state].isValid ? 'bg-amber-500 text-white' : 'bg-red-500 text-white animate-pulse'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                          title={r.label + (rows[r.state]?.error ? `: ${rows[r.state].error}` : '')}
                        >
                          {i + 1}
                        </div>
                    ))}
                </div>
            </div>
            <button 
                onClick={handleAssembleAtlas}
                disabled={Object.keys(rows).length === 0}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-30 transition-all shadow-lg shadow-gray-200"
            >
                Preview Atlas
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ... Configuration ... */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 lg:sticky lg:top-6">
            <div className="space-y-4">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                 Pet Identity
               </label>
               <input 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder:text-gray-300"
                 placeholder="Character Name"
               />
               <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Visual description (e.g. A neon blue jelly blob with tiny wings...)"
                className="w-full h-28 p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none resize-none text-sm placeholder:text-gray-300"
              />
            </div>

            {/* ... Styles ... */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Production Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                      selectedStyle === style
                        ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                        : "bg-white border-gray-100 text-gray-400 hover:border-amber-200"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Select Frame Row
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {ANIMATION_ROWS.map(({ state, label, icon: Icon }) => (
                  <button
                    key={state}
                    onClick={() => setActiveState(state)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      activeState === state
                        ? "bg-amber-500 border-amber-500 text-white shadow-md"
                        : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-amber-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                        <Icon size={14} className={activeState === state ? "text-amber-100" : "text-gray-300"} />
                        <span className="text-xs font-bold">{label}</span>
                    </div>
                    {rows[state] && (
                        <div className={`p-1 rounded-full ${activeState === state ? 'bg-amber-400' : 'bg-amber-50'}`}>
                            <Check size={10} className={activeState === state ? "text-white" : "text-amber-500"} />
                        </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {activeState === 'running-left' && rows['running-right'] && !rows['running-left'] && (
              <button
                onClick={handleMirrorRunningLeft}
                className="w-full py-2 bg-amber-50 text-amber-700 font-bold rounded-xl border border-amber-200 flex items-center justify-center gap-2 hover:bg-amber-100 transition-all text-xs"
              >
                <Repeat size={14} />
                Mirror from Running Right?
              </button>
            )}

            <button
              onClick={handleGenerateRow}
              disabled={!description || isGenerating}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg border border-gray-800 flex items-center justify-center gap-3 hover:bg-black disabled:bg-gray-50 disabled:text-gray-300 transition-all active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Drawing Row...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {rows[activeState] ? "Redraw Row" : `Generate ${activeState}`}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview and Review */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
             <div className="border-b border-gray-100 p-6 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                      <ActiveIcon size={20} />
                   </div>
                   <div>
                      <h2 className="text-lg font-bold text-gray-900 capitalize">{activeState.replace(/-/g, ' ')} row</h2>
                      <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{PET_CONFIG.width}x{PET_CONFIG.height} Alignment Grid</p>
                   </div>
                </div>
                {activeRow && (
                    <button 
                        onClick={() => {
                            const n = {...rows};
                            delete n[activeState];
                            setRows(n);
                        }}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Clear current row"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
             </div>

             <div className="p-10 aspect-video bg-[#0f172a] flex items-center justify-center relative group overflow-hidden">
                {/* Visual context grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: `${PET_CONFIG.width/2}px ${PET_CONFIG.height/2}px` }} />

                <PetPreviewPlayer 
                  frames={activeRow?.frames || []}
                  className="w-72 h-72 shadow-2xl bg-transparent relative z-10"
                />
                
                {activeRow && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 pointer-events-none"
                    >
                        <div className="flex gap-4 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${activeRow.isValid ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeRow.isValid ? 'text-white' : 'text-red-300'}`}>
                                    {activeRow.isValid ? 'Centroid OK' : 'Centroid Error'}
                                </span>
                            </div>
                            <div className="w-[1px] h-3 bg-white/10" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">{PET_CONFIG.count} Frames</span>
                            </div>
                        </div>
                        {activeRow.error && (
                            <div className="bg-red-500/90 text-white text-[9px] px-3 py-1 rounded text-center font-bold">
                                {activeRow.error}
                            </div>
                        )}
                    </motion.div>
                )}

                {!activeRow && !isGenerating && (
                    <div className="text-center space-y-4 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-white/20">
                            <Play size={24} />
                        </div>
                        <p className="text-xs text-white/30 font-medium">Click "Generate" to start producing this animation row.</p>
                    </div>
                )}
             </div>
          </div>

          {/* ... Assembly ... */}
          <AnimatePresence>
            {compositeUrl && (
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl border-2 border-amber-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden"
                >
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                <Box size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Project Bundle Export</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Final spritesheet (1536x1872) and pet.json metadata generated.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDownloadPackage}
                            className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl active:scale-95"
                        >
                            <Download size={18} />
                            Download ZIP Package
                        </button>
                    </div>

                    <div className="p-8 bg-gray-50/50">
                        <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-inner overflow-auto max-h-[500px] flex justify-center scrollbar-hide">
                            <img 
                                src={compositeUrl} 
                                className="max-w-none w-[768px] pixelated shadow-xl" 
                                style={{ imageRendering: 'pixelated' }} 
                            />
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

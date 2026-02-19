
import React, { useState, useEffect } from 'react';
import { Exercise } from '../types';
import { generateExerciseImage } from '../services/geminiService';

interface ExerciseCardProps {
  exercise: Exercise;
  onContinue: () => void;
  timerValue?: number;
  isTimerActive?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onContinue, timerValue, isTimerActive }) => {
  const [imageUrl, setImageUrl] = useState<string>(exercise.staticImageUrls[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    // Reset state for new exercise
    setImageUrl(exercise.staticImageUrls[0]);
    setIsGenerating(false);
    setImageFailed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [exercise.id, exercise.staticImageUrls]);

  const handleImageError = async () => {
    if (imageFailed) return; // Prevent infinite loops
    
    console.warn(`Source image for ${exercise.name} unavailable. Attempting AI recovery...`);
    setIsGenerating(true);
    
    try {
      // Specifically asking for 1:1 aspect ratio to match the 1024x1024 style
      const prompt = `Professional fitness illustration of a person performing ${exercise.name}. Cinematic lighting, athletic gym background, orange/red high-contrast aesthetic, detailed muscle definition, square 1:1 aspect ratio, 4k resolution.`;
      const generated = await generateExerciseImage(prompt, '1K');
      
      if (generated) {
        setImageUrl(generated);
        setIsGenerating(false);
      } else {
        throw new Error("AI Fallback failed");
      }
    } catch (err) {
      console.error("All visual syncs failed. Defaulting to name-only view.");
      setImageFailed(true);
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-4xl mx-auto overflow-hidden rounded-[3rem] bg-neutral-900/20 border border-white/5 shadow-2xl">
      {/* THE BAR: Elite Performance Accent */}
      <div className="h-4 w-full bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_4px_20px_rgba(249,115,22,0.4)]"></div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Branding & Status Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-5xl md:text-6xl font-black italic uppercase text-white leading-none tracking-tighter">
              {exercise.name}
            </h2>
            <div className="inline-block mt-3 bg-orange-600 text-white font-black px-6 py-1.5 rounded-full text-xs uppercase tracking-[0.2em]">
              {exercise.reps}
            </div>
          </div>

          {isTimerActive ? (
            <div className="flex flex-col items-center justify-center bg-white text-black px-10 py-4 rounded-3xl min-w-[160px] shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
              <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.3em] opacity-40 leading-none mb-1">Live Pulse</span>
              <span className="relative z-10 text-5xl font-black italic leading-none">{timerValue}s</span>
            </div>
          ) : (
            <button
              onClick={onContinue}
              className="w-full md:w-auto bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-tighter hover:bg-orange-500 hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95 text-2xl"
            >
              Done
            </button>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        {isTimerActive && (
          <div className="w-full h-2.5 bg-black rounded-full overflow-hidden shadow-inner border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(249,115,22,0.5)]"
              style={{ width: `${(timerValue! / exercise.duration!) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Square Hero Visual Display (Optimized for 1024x1024) */}
        <div className="relative aspect-square w-full max-h-[70vh] mx-auto overflow-hidden rounded-[2.5rem] bg-black border border-white/10 shadow-2xl group flex items-center justify-center">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
              <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-sm animate-pulse italic">Syncing Performance Data...</span>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="w-full h-1 bg-orange-500/50 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ) : imageFailed ? (
            /* Name-only fallback view */
            <div className="flex items-center justify-center p-12 text-center">
              <span className="text-7xl md:text-[8rem] font-black italic uppercase text-white/5 tracking-tighter select-none break-words">
                {exercise.name}
              </span>
            </div>
          ) : (
            <img 
              src={imageUrl} 
              alt={exercise.name} 
              onError={handleImageError}
              className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-110"
              style={{ filter: 'contrast(1.05) brightness(0.95)' }}
            />
          )}
          
          {/* Visual Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50"></div>
          <div className="absolute bottom-6 left-8 flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#dc2626]"></div>
             <span className="text-white/70 font-black italic uppercase text-[10px] tracking-[0.4em]">Active Performance Stream</span>
          </div>
          
          {/* Decorative Corner Elements */}
          <div className="absolute top-6 right-8 text-white/20 font-mono text-[10px] uppercase tracking-widest hidden md:block">
            RES_1024x1024 // SCAN_ACTIVE
          </div>
        </div>

        {/* Performance Instructions */}
        <div className="bg-neutral-900/40 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 backdrop-blur-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/5 blur-[120px] rounded-full pointer-events-none"></div>
          <h3 className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] mb-4 md:mb-6 flex items-center gap-3">
            <span className="w-4 h-0.5 bg-orange-500"></span>
            Pro Level Coaching
          </h3>
          <p className="text-gray-100 text-xl md:text-2xl leading-snug font-bold italic tracking-tight">
            "{exercise.description}"
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10vh); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ExerciseCard;

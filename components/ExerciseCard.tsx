
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadVisual = async () => {
      const localPath = exercise.staticImageUrls[0];
      
      // We try to fetch the local image. If it fails (404), we fall back to Gemini.
      try {
        const response = await fetch(localPath, { method: 'HEAD' });
        if (response.ok) {
          setImageUrl(localPath);
        } else {
          throw new Error('Local image not found');
        }
      } catch (error) {
        // Local file not found, use Gemini to generate a high-quality replacement
        setIsGenerating(true);
        try {
          const prompt = `Professional fitness illustration of a person performing ${exercise.name}. Cinematic lighting, athletic gym background, orange/red high-contrast aesthetic, detailed muscle definition, 4k resolution.`;
          const generated = await generateExerciseImage(prompt, '1K');
          setImageUrl(generated);
        } catch (genError) {
          console.error("Gemini failed, using placeholder:", genError);
          setImageUrl(`https://placehold.co/1200x675/111/f97316?text=${exercise.name.replace(/\s+/g, '+')}`);
        } finally {
          setIsGenerating(false);
        }
      }
    };

    setImageUrl(null);
    loadVisual();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [exercise.id]);

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-4xl mx-auto overflow-hidden rounded-[3rem] bg-neutral-900/20 border border-white/5 shadow-2xl">
      {/* Active Session Status Bar */}
      <div className="h-4 w-full bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_4px_20px_rgba(249,115,22,0.4)]"></div>

      <div className="p-8 space-y-8">
        {/* Header Branding & Timer */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-6xl font-black italic uppercase text-white leading-tight tracking-tighter">
              {exercise.name}
            </h2>
            <div className="inline-block mt-2 bg-orange-600 text-white font-black px-6 py-2 rounded-full text-sm uppercase tracking-[0.2em]">
              {exercise.reps}
            </div>
          </div>

          {isTimerActive ? (
            <div className="flex flex-col items-center justify-center bg-white text-black px-10 py-4 rounded-3xl min-w-[160px] shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
              <span className="relative z-10 text-xs font-black uppercase tracking-widest opacity-50">Heart Rate</span>
              <span className="relative z-10 text-5xl font-black italic">{timerValue}s</span>
            </div>
          ) : (
            <button
              onClick={onContinue}
              className="w-full md:w-auto bg-white text-black font-black px-16 py-5 rounded-2xl uppercase tracking-tighter hover:bg-orange-500 hover:text-white transition-all shadow-xl hover:scale-105 active:scale-95 text-2xl"
            >
              Set Complete
            </button>
          )}
        </div>

        {/* Progress Tracker Bar */}
        {isTimerActive && (
          <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-1000 ease-linear"
              style={{ width: `${(timerValue! / exercise.duration!) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Cinematic Exercise Visual */}
        <div className="relative aspect-video md:aspect-[16/9] w-full overflow-hidden rounded-[2.5rem] bg-black border border-white/10 shadow-2xl group">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
              <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-sm animate-pulse italic">Optimizing Visuals...</span>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="w-full h-1 bg-orange-500/50 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ) : (
            <img 
              src={imageUrl || ''} 
              alt={exercise.name} 
              className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110"
              style={{ filter: 'contrast(1.1) brightness(0.95)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
          <div className="absolute bottom-6 left-8 flex items-center gap-3">
             <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
             <span className="text-white/60 font-black italic uppercase text-[10px] tracking-[0.5em]">Live Training View</span>
          </div>
        </div>

        {/* Pro Coaching Instructions */}
        <div className="bg-neutral-900/60 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full pointer-events-none"></div>
          <h3 className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] mb-6 flex items-center gap-3">
            <span className="w-3 h-0.5 bg-orange-500"></span>
            Performance Coaching
          </h3>
          <p className="text-gray-100 text-2xl leading-relaxed font-bold italic tracking-tight">
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

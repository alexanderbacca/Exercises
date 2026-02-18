
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import { EXERCISES } from './constants';
import { AudioService } from './services/audio';
import ExerciseCard from './components/ExerciseCard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.START);
  const [pulseBefore, setPulseBefore] = useState<number>(0);
  const [pulseAfter, setPulseAfter] = useState<number>(0);
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(15);
  const [prepCountdown, setPrepCountdown] = useState<number>(3);

  // Prep Countdown timer logic (3 seconds)
  useEffect(() => {
    let timer: any;
    if ([AppState.PULSE_BEFORE_PREP, AppState.EXERCISE_PREP, AppState.PULSE_AFTER_PREP].includes(state) && prepCountdown > 0) {
      timer = setInterval(() => {
        setPrepCountdown((prev) => prev - 1);
        AudioService.playBeep(440, 0.1); // Preparation beeps
      }, 1000);
    } else if (prepCountdown === 0) {
      if (state === AppState.PULSE_BEFORE_PREP) {
        AudioService.playBeep(880, 0.5); // Start signal
        setCountdown(15);
        setState(AppState.PULSE_BEFORE_COUNTDOWN);
      } else if (state === AppState.PULSE_AFTER_PREP) {
        AudioService.playBeep(880, 0.5); // Start signal
        setCountdown(15);
        setState(AppState.PULSE_AFTER_COUNTDOWN);
      } else if (state === AppState.EXERCISE_PREP) {
        AudioService.playBeep(880, 0.5); // Start signal
        const ex = EXERCISES[currentExerciseIndex];
        setCountdown(ex.duration || 0);
        setState(AppState.EXERCISE_TIMER);
      }
    }
    return () => clearInterval(timer);
  }, [state, prepCountdown, currentExerciseIndex]);

  // Main Countdown timer logic (Variable duration)
  useEffect(() => {
    let timer: any;
    const isMainCountdown = [
      AppState.PULSE_BEFORE_COUNTDOWN, 
      AppState.PULSE_AFTER_COUNTDOWN, 
      AppState.EXERCISE_TIMER
    ].includes(state);

    if (isMainCountdown && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
        // Beep on last 3 seconds of any countdown
        if (countdown <= 3 && countdown > 0) AudioService.playBeep(440, 0.1);
      }, 1000);
    } else if (isMainCountdown && countdown === 0) {
      AudioService.playBeep(880, 0.5); // End signal
      if (state === AppState.PULSE_BEFORE_COUNTDOWN) {
        setState(AppState.PULSE_BEFORE_INPUT);
      } else if (state === AppState.PULSE_AFTER_COUNTDOWN) {
        setState(AppState.PULSE_AFTER_INPUT);
      } else if (state === AppState.EXERCISE_TIMER) {
        // Exercise time finished
        setState(AppState.EXERCISE_LOOP);
      }
    }
    return () => clearInterval(timer);
  }, [state, countdown]);

  const startInitialPulse = () => {
    setPrepCountdown(3);
    setState(AppState.PULSE_BEFORE_PREP);
  };

  const submitPulseBefore = (val: number) => {
    if (!val) return;
    setPulseBefore(val);
    startExerciseSequence(0);
  };

  const startExerciseSequence = (index: number) => {
    setCurrentExerciseIndex(index);
    const ex = EXERCISES[index];
    if (ex.duration) {
      setPrepCountdown(3);
      setState(AppState.EXERCISE_PREP);
    } else {
      setState(AppState.EXERCISE_LOOP);
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < EXERCISES.length - 1) {
      startExerciseSequence(currentExerciseIndex + 1);
    } else {
      setState(AppState.SESSION_CHECK);
    }
  };

  const handleSessionDecision = (repeat: boolean) => {
    if (repeat && sessionCount < 3) {
      setSessionCount(sessionCount + 1);
      startExerciseSequence(0);
    } else {
      setPrepCountdown(3);
      setState(AppState.PULSE_AFTER_PREP);
    }
  };

  const submitPulseAfter = (val: number) => {
    if (!val) return;
    setPulseAfter(val);
    setState(AppState.FINAL_SUMMARY);
  };

  const saveData = () => {
    const today = new Date().toISOString().split('T')[0];
    const sessionStr = `${sessionCount} Session${sessionCount > 1 ? 's' : ''}`;
    const baseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeM3r6WtXCYD7nzH6RMCfXAriTnWT9fXWh-1JQPWZjHvyCOcg/viewform?usp=pp_url";
    const params = new URLSearchParams({
      'entry.1646637161': today,
      'entry.514818379': pulseBefore.toString(),
      'entry.1947971010': pulseAfter.toString(),
      'entry.185983801': sessionStr
    });
    window.open(`${baseUrl}&${params.toString()}`, '_blank');
  };

  const getPrepMessage = () => {
    if (state === AppState.EXERCISE_PREP) {
      return `Preparing ${EXERCISES[currentExerciseIndex].name}...`;
    }
    return 'Preparing Bio-Scan...';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl rotate-3 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-xl italic leading-none">P</span>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            <span className="text-orange-500">PULSE</span>
            <span className="text-red-600">POWER</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-black bg-orange-500/10 text-orange-500 px-4 py-2 rounded-xl border border-orange-500/20 uppercase tracking-widest shadow-inner">
            Cycle {sessionCount}/3
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 w-full">
        {state === AppState.START && (
          <div className="text-center space-y-10 animate-in fade-in zoom-in duration-1000 max-w-2xl">
            <div className="space-y-4">
               <h2 className="text-7xl md:text-9xl font-black italic uppercase leading-[0.85] text-gradient tracking-tighter">
                UNLEASH <br/> THE BEAST
              </h2>
              <p className="text-gray-400 text-lg md:text-2xl font-medium tracking-tight px-6">
                Dynamic tracking and peak performance monitoring.
              </p>
            </div>
            
            <button
              onClick={startInitialPulse}
              className="group relative inline-flex flex-col items-center justify-center gap-2"
            >
              <div className="absolute inset-0 bg-orange-600 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white text-black font-black text-3xl py-8 px-16 rounded-[2.5rem] uppercase italic tracking-tighter transition-all shadow-[0_20px_50px_rgba(249,115,22,0.3)] group-hover:scale-105 group-active:scale-95 group-hover:bg-orange-500 group-hover:text-white">
                Measure Pulse
              </div>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mt-4 opacity-50 group-hover:opacity-100 transition-opacity">Initialize Session</span>
            </button>
          </div>
        )}

        {[AppState.PULSE_BEFORE_PREP, AppState.EXERCISE_PREP, AppState.PULSE_AFTER_PREP].includes(state) && (
          <div className="text-center space-y-12 animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-black italic uppercase text-orange-500 tracking-tighter">GET READY</h2>
            <div className="text-[12rem] md:text-[16rem] font-black italic text-white leading-none animate-pulse">
              {prepCountdown}
            </div>
            <p className="text-xl text-gray-400 font-black uppercase tracking-[0.3em] italic">{getPrepMessage()}</p>
          </div>
        )}

        {(state === AppState.PULSE_BEFORE_COUNTDOWN || state === AppState.PULSE_AFTER_COUNTDOWN) && (
          <div className="text-center space-y-16 animate-in fade-in duration-500">
            <h2 className="text-5xl font-black italic uppercase text-red-600 tracking-tighter">DON'T MOVE</h2>
            <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto flex items-center justify-center group">
              <div className="absolute inset-0 border-[20px] border-white/5 rounded-full"></div>
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="40"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-orange-500 transition-all duration-1000 ease-linear"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (countdown / 15)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="relative flex flex-col items-center">
                <span className="text-[10rem] md:text-[14rem] font-black italic text-white leading-none drop-shadow-2xl">{countdown}</span>
                <span className="text-xs font-black text-orange-500 uppercase tracking-[0.5em] -mt-4 opacity-50">Seconds Left</span>
              </div>
            </div>
            <p className="text-2xl text-gray-400 font-black uppercase tracking-[0.2em] italic animate-pulse">Scanning Bio-Data...</p>
          </div>
        )}

        {(state === AppState.PULSE_BEFORE_INPUT || state === AppState.PULSE_AFTER_INPUT) && (
          <div className="bg-[#111] p-10 md:p-16 rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] w-full max-w-xl animate-in slide-in-from-bottom-12 duration-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <h2 className="text-5xl font-black italic uppercase text-white mb-4 tracking-tighter">DATA ENTRY</h2>
            <p className="text-orange-500 font-black mb-10 uppercase tracking-widest text-sm">Enter heart beats detected in 15s</p>
            
            <div className="relative group mb-10">
              <input
                type="number"
                placeholder="00"
                className="w-full bg-black border-2 border-white/5 text-9xl font-black italic text-white p-8 rounded-[2rem] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all outline-none placeholder:text-neutral-900 text-center"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (!isNaN(val)) state === AppState.PULSE_BEFORE_INPUT ? submitPulseBefore(val) : submitPulseAfter(val);
                  }
                }}
              />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-orange-500 font-black text-2xl italic opacity-30 group-focus-within:opacity-100 transition-opacity">BPM</div>
            </div>

            <button
              onClick={() => {
                const val = parseInt((document.querySelector('input') as HTMLInputElement).value);
                if (!isNaN(val)) state === AppState.PULSE_BEFORE_INPUT ? submitPulseBefore(val) : submitPulseAfter(val);
              }}
              className="w-full bg-gradient-to-br from-orange-500 to-red-600 text-white font-black py-6 rounded-2xl uppercase text-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all tracking-tight"
            >
              Log Pulse
            </button>
          </div>
        )}

        {state === AppState.EXERCISE_LOOP && (
          <ExerciseCard
            exercise={EXERCISES[currentExerciseIndex]}
            onContinue={nextExercise}
          />
        )}

        {state === AppState.EXERCISE_TIMER && (
          <ExerciseCard
            exercise={EXERCISES[currentExerciseIndex]}
            onContinue={() => {}} // Disabled during timer
            timerValue={countdown}
            isTimerActive={true}
          />
        )}

        {state === AppState.SESSION_CHECK && (
          <div className="text-center space-y-12 p-12 md:p-20 bg-[#111] rounded-[4rem] border border-white/5 max-w-3xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full"></div>
            
            <div className="space-y-4">
               <h2 className="text-7xl md:text-8xl font-black italic uppercase text-white leading-[0.8] tracking-tighter">VOLTAGE <br/>CHECK</h2>
               <p className="text-2xl text-gray-400 font-medium uppercase tracking-widest">Push for Session {sessionCount + 1}?</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <button
                onClick={() => handleSessionDecision(true)}
                disabled={sessionCount >= 3}
                className={`flex-1 py-8 px-10 rounded-[2.5rem] font-black text-3xl uppercase italic tracking-tighter transition-all ${sessionCount >= 3 ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed opacity-50' : 'bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 shadow-[0_15px_40px_rgba(249,115,22,0.3)]'}`}
              >
                ONE MORE
              </button>
              <button
                onClick={() => handleSessionDecision(false)}
                className="flex-1 bg-white text-black py-8 px-10 rounded-[2.5rem] font-black text-3xl uppercase italic tracking-tighter hover:bg-neutral-200 transition-all hover:scale-105 shadow-xl"
              >
                ENOUGH
              </button>
            </div>
          </div>
        )}

        {state === AppState.FINAL_SUMMARY && (
          <div className="text-center space-y-12 w-full animate-in fade-in zoom-in duration-1000 max-w-4xl">
             <div className="space-y-4">
                <h2 className="text-8xl md:text-[10rem] font-black italic uppercase text-gradient leading-[0.8] tracking-tighter">ELITE <br/>LEVEL</h2>
                <p className="text-orange-500 font-black uppercase tracking-[0.4em] text-sm">Session Data Synchronized</p>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Baseline', value: pulseBefore, color: 'text-white' },
                { label: 'Post-Ex', value: pulseAfter, color: 'text-red-600' },
                { label: 'Rounds', value: sessionCount, color: 'text-orange-500' }
              ].map((item, idx) => (
                <div key={idx} className="bg-neutral-900/40 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl group hover:border-white/20 transition-all">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">{item.label}</p>
                  <p className={`text-7xl font-black italic ${item.color} group-hover:scale-110 transition-transform`}>{item.value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={saveData}
              className="w-full bg-white text-black font-black text-4xl py-10 rounded-[3rem] uppercase italic tracking-tighter shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:bg-orange-500 hover:text-white transition-all transform hover:-translate-y-3 active:scale-95 group overflow-hidden relative"
            >
              <span className="relative z-10">UPLOAD PERFORMANCE</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        )}
      </main>

      <footer className="p-8 text-center border-t border-white/5 bg-black/50 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-neutral-700 hover:text-orange-500 transition-colors">
          Pro Physical Tracking &copy; MMXXVI // By Alexander Bacca with Gemini 3.0
        </p>
      </footer>
    </div>
  );
};

export default App;

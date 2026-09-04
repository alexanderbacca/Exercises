import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import { EXERCISES } from './constants';
import { AudioService } from './services/audio';
import ExerciseCard from './components/ExerciseCard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.START);
  const [pulseBefore, setPulseBefore] = useState<number>(0);
  const [pulseAfter, setPulseAfter] = useState<number>(0);
  const [pulseRecovery, setPulseRecovery] = useState<number>(0);
  const [isRecovery, setIsRecovery] = useState<boolean>(false);
  const [recoveryCountdown, setRecoveryCountdown] = useState<number>(60);
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(15);
  const [prepCountdown, setPrepCountdown] = useState<number>(3);
  const [altitude, setAltitude] = useState<number>(() => {
    const saved = Number(localStorage.getItem('ppt_altitude'));
    return saved > 0 ? saved : 2500;
  });
  const [customAltitude, setCustomAltitude] = useState<string>('');
  const [altitudeReturnState, setAltitudeReturnState] = useState<AppState>(AppState.START);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ppt_submissions') || '[]');
    } catch {
      return [];
    }
  });

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
        setCountdown(30);
        setState(AppState.PULSE_BEFORE_COUNTDOWN);
      } else if (state === AppState.PULSE_AFTER_PREP) {
        AudioService.playBeep(880, 0.5); // Start signal
        setCountdown(30);
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

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Speech synthesis not available on this device
    }
  };

  // Recovery wait timer logic (60 seconds) with voice guidance
  useEffect(() => {
    let timer: any;
    if (state === AppState.RECOVERY_WAIT && recoveryCountdown > 0) {
      if (recoveryCountdown === 60) speak('Rest for one minute');
      else if (recoveryCountdown === 30) speak('Thirty seconds');
      else if (recoveryCountdown === 10) speak('Get ready');
      timer = setInterval(() => {
        setRecoveryCountdown((prev) => prev - 1);
      }, 1000);
    } else if (state === AppState.RECOVERY_WAIT && recoveryCountdown === 0) {
      AudioService.playBeep(880, 1.5); // Long beep: rest minute is over
    }
    return () => clearInterval(timer);
  }, [state, recoveryCountdown]);

  // Voice announcement: say the exercise name and repetitions
  useEffect(() => {
    const ex = EXERCISES[currentExerciseIndex];
    if (state === AppState.EXERCISE_PREP || (state === AppState.EXERCISE_LOOP && !ex.duration)) {
      speak(`${ex.name}. ${ex.reps.replace('-', ' to ')}`);
    }
  }, [state, currentExerciseIndex]);

  const startInitialPulse = () => {
    setWorkoutStartedAt(Date.now());
    setTotalSeconds(0);
    setCustomAltitude('');
    setAltitudeReturnState(AppState.PULSE_BEFORE_PREP);
    setState(AppState.ALTITUDE_SELECT);
  };

  const openAltitudeSelector = () => {
    setCustomAltitude('');
    setAltitudeReturnState(state);
    setState(AppState.ALTITUDE_SELECT);
  };

  const chooseAltitude = (meters: number) => {
    const value = Math.round(meters);
    if (!value || value < 0 || value > 9000) return;
    setAltitude(value);
    localStorage.setItem('ppt_altitude', value.toString());
    if (altitudeReturnState === AppState.PULSE_BEFORE_PREP) {
      setPrepCountdown(3);
    }
    setState(altitudeReturnState);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getElapsedSeconds = () => workoutStartedAt ? Math.max(0, Math.round((Date.now() - workoutStartedAt) / 1000)) : totalSeconds;

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
    if (isRecovery) {
      // Second pass: this input is the 1-minute recovery pulse
      setPulseRecovery(val);
      setIsRecovery(false);
      setState(AppState.FINAL_SUMMARY);
      return;
    }
    setPulseAfter(val);
    setTotalSeconds(getElapsedSeconds());
    setRecoveryCountdown(60);
    setState(AppState.RECOVERY_WAIT);
  };

  const startRecoveryMeasurement = () => {
    setIsRecovery(true);
    setPrepCountdown(3);
    setState(AppState.PULSE_AFTER_PREP); // Reuses the normal 3s prep → 30s scan → input flow
  };

  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeM3r6WtXCYD7nzH6RMCfXAriTnWT9fXWh-1JQPWZjHvyCOcg/formResponse';

  const sendToGoogleForm = async (rec: any) => {
    const params = new URLSearchParams({
      'entry.1646637161': rec.date,
      'entry.1753122030': rec.altitude.toString(),
      'entry.1184196909': rec.durationMin.toFixed(1),
      'entry.514818379': rec.pulseBefore.toString(),
      'entry.1947971010': rec.pulseAfter.toString(),
      'entry.856426932': rec.pulseRecovery != null ? rec.pulseRecovery.toString() : '',
      'entry.185983801': rec.sessions
    });
    // Silent background submit: Google Forms saves the data but hides the response (no-cors)
    await fetch(FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
  };

  const persistSubmissions = (list: any[]) => {
    const trimmed = list.slice(0, 5); // Keep only the last 5 records
    localStorage.setItem('ppt_submissions', JSON.stringify(trimmed));
    setSubmissions(trimmed);
  };

  const saveData = async () => {
    if (isSending) return;
    setIsSending(true);
    const rec: any = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      altitude,
      totalSeconds,
      durationMin: Number((totalSeconds / 60).toFixed(1)),
      pulseBefore,
      pulseAfter,
      pulseRecovery,
      sessions: `${sessionCount} Session${sessionCount > 1 ? 's' : ''}`,
      status: 'pending',
      sending: false
    };
    try {
      await sendToGoogleForm(rec);
      rec.status = 'sent';
    } catch (e) {
      rec.status = 'pending'; // No internet or Google unreachable: kept locally for retry
    }
    persistSubmissions([rec, ...submissions]);
    setIsSending(false);
    setState(AppState.DATA_SENT);
  };

  const resendSubmission = async (id: number) => {
    const list = [...submissions];
    const rec = list.find((r: any) => r.id === id);
    if (!rec || rec.sending) return;
    rec.sending = true;
    setSubmissions([...list]);
    try {
      await sendToGoogleForm(rec);
      rec.status = 'sent';
    } catch (e) {
      rec.status = 'pending';
    }
    rec.sending = false;
    persistSubmissions(list);
  };

  const handleExit = () => {
    // Browsers only let a page close its window if it was opened by a script or
    // launched from a home-screen shortcut. If blocked, return to the start screen.
    window.open('', '_self');
    window.close();
    setTimeout(() => {
      setSessionCount(1);
      setPulseBefore(0);
      setPulseAfter(0);
      setPulseRecovery(0);
      setIsRecovery(false);
      setState(AppState.START);
    }, 400);
  };

  const skipTimer = () => {
    // Jump to the end of any countdown (prep, pulse scan, exercise timer, or rest)
    AudioService.playBeep(880, 0.15);
    if ([AppState.PULSE_BEFORE_PREP, AppState.EXERCISE_PREP, AppState.PULSE_AFTER_PREP].includes(state)) {
      setPrepCountdown(0);
    } else if (state === AppState.RECOVERY_WAIT) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      setRecoveryCountdown(0);
    } else {
      setCountdown(0);
    }
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
          <button
            onClick={openAltitudeSelector}
            className="text-[11px] font-black bg-white/5 text-white/70 px-4 py-2 rounded-xl border border-white/10 uppercase tracking-widest hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 transition-all"
            title="Change training altitude"
          >
            {altitude} m
          </button>
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

        {state === AppState.ALTITUDE_SELECT && (
          <div className="w-full max-w-2xl bg-[#111] p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-12 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="text-center mb-10">
              <p className="text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] mb-4">Training conditions</p>
              <h2 className="text-5xl md:text-6xl font-black italic uppercase text-white tracking-tighter leading-none">Where are you<br/>training?</h2>
              <p className="text-gray-400 mt-5 font-medium">Altitude helps you compare your pulse data fairly.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => chooseAltitude(2500)}
                className={`w-full p-6 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${altitude === 2500 ? 'bg-orange-500 border-orange-400 text-white shadow-[0_15px_40px_rgba(249,115,22,0.25)]' : 'bg-black/40 border-white/10 hover:border-orange-500/50 text-white'}`}
              >
                <span className="block text-3xl font-black italic uppercase tracking-tighter">Pasto</span>
                <span className="block mt-1 text-sm font-black uppercase tracking-[0.2em] opacity-70">2500 m</span>
              </button>
              <button
                onClick={() => chooseAltitude(1500)}
                className={`w-full p-6 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${altitude === 1500 ? 'bg-orange-500 border-orange-400 text-white shadow-[0_15px_40px_rgba(249,115,22,0.25)]' : 'bg-black/40 border-white/10 hover:border-orange-500/50 text-white'}`}
              >
                <span className="block text-3xl font-black italic uppercase tracking-tighter">Sotomayor</span>
                <span className="block mt-1 text-sm font-black uppercase tracking-[0.2em] opacity-70">1500 m</span>
              </button>

              <div className="bg-black/40 border border-white/10 rounded-3xl p-5">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">Other altitude</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="9000"
                    placeholder="Meters"
                    value={customAltitude}
                    onChange={(e) => setCustomAltitude(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') chooseAltitude(Number(customAltitude));
                    }}
                    className="min-w-0 flex-1 bg-neutral-900 border-2 border-white/5 text-white font-black text-xl p-4 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all outline-none"
                  />
                  <button
                    onClick={() => chooseAltitude(Number(customAltitude))}
                    disabled={!customAltitude || Number(customAltitude) < 0 || Number(customAltitude) > 9000}
                    className="bg-white text-black font-black uppercase italic px-6 rounded-2xl hover:bg-orange-500 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
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
                  strokeDashoffset={251.2 * (countdown / 30)}
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
            <p className="text-orange-500 font-black mb-2 uppercase tracking-widest text-sm">Enter heart beats detected in 30s</p>
            <p className="text-gray-500 font-bold mb-10 text-sm">Tip: beats × 2 = your BPM</p>

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

        {state === AppState.RECOVERY_WAIT && (
          <div className="text-center space-y-16 animate-in fade-in duration-500">
            <h2 className="text-5xl font-black italic uppercase text-orange-500 tracking-tighter">RECOVERY</h2>
            {recoveryCountdown > 0 ? (
              <>
                <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 border-[20px] border-white/5 rounded-full"></div>
                  <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-orange-500 transition-all duration-1000 ease-linear"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (recoveryCountdown / 60)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="relative flex flex-col items-center">
                    <span className="text-[10rem] md:text-[14rem] font-black italic text-white leading-none drop-shadow-2xl">{recoveryCountdown}</span>
                    <span className="text-xs font-black text-orange-500 uppercase tracking-[0.5em] -mt-4 opacity-50">Seconds Rest</span>
                  </div>
                </div>
                <p className="text-2xl text-gray-400 font-black uppercase tracking-[0.2em] italic animate-pulse">Rest and breathe...</p>
              </>
            ) : (
              <button
                onClick={startRecoveryMeasurement}
                className="group relative inline-flex flex-col items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-orange-600 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-white text-black font-black text-3xl py-8 px-16 rounded-[2.5rem] uppercase italic tracking-tighter transition-all shadow-[0_20px_50px_rgba(249,115,22,0.3)] group-hover:scale-105 group-active:scale-95 group-hover:bg-orange-500 group-hover:text-white animate-pulse">
                  Measure Recovery Pulse
                </div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mt-4 opacity-50 group-hover:opacity-100 transition-opacity">1-Minute Recovery</span>
              </button>
            )}
          </div>
        )}

        {state === AppState.FINAL_SUMMARY && (
          <div className="text-center space-y-12 w-full animate-in fade-in zoom-in duration-1000 max-w-4xl">
             <div className="space-y-4">
                <h2 className="text-8xl md:text-[10rem] font-black italic uppercase text-gradient leading-[0.8] tracking-tighter">ELITE <br/>LEVEL</h2>
                <p className="text-orange-500 font-black uppercase tracking-[0.4em] text-sm">Session Data Synchronized</p>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {([
                { label: 'Baseline', value: pulseBefore, color: 'text-white' },
                { label: 'Post-Ex', value: pulseAfter, color: 'text-red-600' },
                { label: 'Recovery', value: pulseRecovery, color: 'text-green-500', sub: pulseRecovery - pulseAfter },
                { label: 'Rounds', value: sessionCount, color: 'text-orange-500' },
                { label: 'Total Time', value: formatDuration(totalSeconds), color: 'text-orange-500' }
              ] as { label: string; value: React.ReactNode; color: string; sub?: number }[]).map((item, idx) => (
                <div key={idx} className="bg-neutral-900/40 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl group hover:border-white/20 transition-all">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">{item.label}</p>
                  <p className={`text-7xl font-black italic ${item.color} group-hover:scale-110 transition-transform`}>{item.value}</p>
                  {item.sub !== undefined && (
                    <p className="text-sm font-black text-gray-500 mt-2">{item.sub > 0 ? '+' : ''}{item.sub}</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveData}
              disabled={isSending}
              className="w-full bg-white text-black font-black text-4xl py-10 rounded-[3rem] uppercase italic tracking-tighter shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:bg-orange-500 hover:text-white transition-all transform hover:-translate-y-3 active:scale-95 group overflow-hidden relative disabled:opacity-50"
            >
              <span className="relative z-10">{isSending ? 'Sending...' : 'Upload Performance'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        )}

        {state === AppState.DATA_SENT && (
          <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(249,115,22,0.4)]">
                <span className="text-6xl font-black italic text-white">✓</span>
              </div>
              <h2 className="text-6xl md:text-7xl font-black italic uppercase text-gradient tracking-tighter">Data Sent</h2>
              <p className="text-gray-400 text-lg font-medium">Your performance was sent to Google Sheets in the background, no extra windows.</p>
            </div>

            <div className="bg-neutral-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6">Last 5 submissions on this device</p>
              {submissions.length === 0 ? (
                <p className="text-gray-500 text-center font-bold italic">No records yet</p>
              ) : (
                <div className="space-y-4">
                  {submissions.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-4 bg-black/40 border border-white/5 rounded-2xl px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-white font-black italic truncate">{r.date} · {r.sessions}</p>
                        <p className="text-xs text-gray-400 font-bold">Pulse {r.pulseBefore} → {r.pulseAfter}{r.pulseRecovery != null ? ` → ${r.pulseRecovery}` : ''} <span className="text-orange-500/80">· {r.altitude || '?'} m · ⏱ {typeof r.durationMin === 'number' ? r.durationMin.toFixed(1) : '?'} min</span></p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${r.status === 'sent' ? 'text-green-500' : 'text-orange-500'}`}>
                          {r.status === 'sent' ? 'Sent' : 'Pending'}
                        </span>
                        <button
                          onClick={() => resendSubmission(r.id)}
                          disabled={r.sending}
                          className="bg-white/10 hover:bg-orange-500 text-white font-black uppercase text-xs tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                        >
                          {r.sending ? '...' : 'Send again'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white text-black font-black text-2xl py-6 rounded-[2rem] uppercase italic tracking-tighter hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-xl"
              >
                New Session
              </button>
              <button
                onClick={handleExit}
                className="w-full bg-neutral-900 border-2 border-white/10 text-white/60 font-black text-lg py-5 rounded-[2rem] uppercase italic tracking-tighter hover:border-red-600 hover:text-red-500 transition-all active:scale-95"
              >
                Exit and Close
              </button>
            </div>
          </div>
        )}
      </main>

      {([AppState.PULSE_BEFORE_PREP, AppState.PULSE_AFTER_PREP, AppState.EXERCISE_PREP, AppState.PULSE_BEFORE_COUNTDOWN, AppState.PULSE_AFTER_COUNTDOWN, AppState.EXERCISE_TIMER].includes(state) || (state === AppState.RECOVERY_WAIT && recoveryCountdown > 0)) && (
        <button
          onClick={skipTimer}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/80 border-2 border-white/25 text-white/80 font-black italic uppercase tracking-[0.25em] text-sm px-10 py-4 rounded-2xl backdrop-blur-md hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-95 shadow-2xl"
        >
          Skip »
        </button>
      )}

      <footer className="p-8 text-center border-t border-white/5 bg-black/50 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-neutral-700 hover:text-orange-500 transition-colors">
          Pro Physical Tracking &copy; MMXXVI // By Alexander Bacca with Gemini 3.0
        </p>
      </footer>
    </div>
  );
};

export default App;

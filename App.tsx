import React, { useState, useEffect, useRef } from 'react';
import { ExerciseCard } from './components/ExerciseCard';
import ApiKeyChecker from './components/ApiKeyChecker';
import { exercises } from './constants';
import { SubmissionData, Exercise } from './types';
import { AudioService } from './services/audio';

// Google Forms endpoint
const GOOGLE_FORMS_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeM3r6WtXCYD7nzH6RMCfXAriTnWT9fXWh-1JQPWZjHvyCOcg/formResponse';

interface HistoryEntry {
  date: string;
  pulseBefore: number;
  pulseAfter: number;
  recoveryPulse: number;
  altitude: number;
  durationMin: number;
}

// Type guard: only finite numbers are safe for SVG math
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

// Defensive normalization of ppt_history: corrupted or missing data never crashes the app
const sanitizeHistory = (raw: unknown): HistoryEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      date: typeof entry.date === 'string' ? entry.date : '',
      pulseBefore: Number(entry.pulseBefore),
      pulseAfter: Number(entry.pulseAfter),
      recoveryPulse: Number(entry.recoveryPulse),
      altitude: Number(entry.altitude),
      durationMin: Number(entry.durationMin),
    }))
    .filter(
      (entry) =>
        isFiniteNumber(entry.pulseBefore) &&
        isFiniteNumber(entry.pulseAfter) &&
        isFiniteNumber(entry.recoveryPulse) &&
        isFiniteNumber(entry.altitude) &&
        isFiniteNumber(entry.durationMin)
    );
};

// Format a date safely; invalid dates render as a dash instead of "Invalid Date"
const formatDateSafe = (date: string, options: Intl.DateTimeFormatOptions): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '\u2014' : parsed.toLocaleDateString('en-US', options);
};
// Reuse the existing AudioService for click and successful-save feedback
const playClickSound = () => AudioService.playBeep(700, 0.08);
const playSuccessSound = () => AudioService.playBeep(1047, 0.35);

const App: React.FC = () => {
  const [screen, setScreen] = useState<'START' | 'LOCATION' | 'EXERCISE'>('START');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [pulseBefore, setPulseBefore] = useState<number | null>(null);
  const [pulseAfter, setPulseAfter] = useState<number | null>(null);
  const [recoveryPulse, setRecoveryPulse] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pulseInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount (defensive: corrupted or missing ppt_history never crashes the app)
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('ppt_history');
      if (savedHistory) {
        setHistory(sanitizeHistory(JSON.parse(savedHistory)));
      }
    } catch (e) {
      console.error('Failed to parse history:', e);
      setHistory([]);
    }
  }, []);

  // Get location on app start
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAltitude(position.coords.altitude || 0);
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setScreen('EXERCISE');
        },
        (error) => {
          console.error('Error getting location:', error);
          setScreen('EXERCISE');
        }
      );
    } else {
      setScreen('EXERCISE');
    }
  };

  // Save data to Google Forms and localStorage
  const saveData = async () => {
    if (!pulseBefore || !pulseAfter || !recoveryPulse || !selectedExercise) return;

    const submissionData: SubmissionData = {
      exercise: selectedExercise.name,
      pulseBefore,
      pulseAfter,
      recoveryPulse,
      altitude,
      durationMin,
      timestamp: new Date().toISOString(),
      location: location || { lat: 0, lng: 0 },
    };

    // Keep existing ppt_submissions functionality
    const existingSubmissions = JSON.parse(localStorage.getItem('ppt_submissions') || '[]');
    existingSubmissions.push(submissionData);
    if (existingSubmissions.length > 5) {
      existingSubmissions.shift();
    }
    localStorage.setItem('ppt_submissions', JSON.stringify(existingSubmissions));

    // NEW: Add to full history
    const historyEntry: HistoryEntry = {
      date: new Date().toISOString(),
      pulseBefore,
      pulseAfter,
      recoveryPulse,
      altitude,
      durationMin,
    };

    const updatedHistory = [...history, historyEntry];
    setHistory(updatedHistory);
    localStorage.setItem('ppt_history', JSON.stringify(updatedHistory));

    // Send to Google Forms (silent)
    try {
      const formData = new FormData();
      formData.append('entry.1184196909', submissionData.pulseBefore.toString());
      formData.append('entry.514818379', submissionData.pulseAfter.toString());
      formData.append('entry.856426932', submissionData.recoveryPulse.toString());
      formData.append('entry.1753122030', submissionData.altitude.toString());
      formData.append('entry.1947971010', submissionData.durationMin.toString());
      formData.append('entry.1646637161', submissionData.timestamp);
      formData.append('entry.185983801', '1 Session');

      await fetch(GOOGLE_FORMS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
    } catch (error) {
      console.error('Failed to send to Google Forms:', error);
    }

    playSuccessSound();
    resetState();
    setScreen('START');
  };

  const resetState = () => {
    setPulseBefore(null);
    setPulseAfter(null);
    setRecoveryPulse(null);
    setSelectedExercise(null);
    setDurationMin(0);
  };

  const handleExerciseComplete = (exercise: Exercise, duration: number) => {
    setSelectedExercise(exercise);
    setDurationMin(duration);
    setScreen('LOCATION');
  };

  // Render progress chart
  const renderProgressChart = () => {
    // Only sessions with usable numeric pulses can be drawn
    const validHistory = history.filter(
      (s) => isFiniteNumber(s.pulseBefore) && isFiniteNumber(s.pulseAfter)
    );

    if (validHistory.length === 0) {
      return (
        <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
          <p className="text-orange-400 font-semibold text-lg">Your evolution starts with the first session</p>
          <p className="text-gray-400 text-sm mt-2">Track your progress one session at a time.</p>
        </div>
      );
    }

    const last15Sessions = validHistory.slice(-15);
    const width = 320;
    const height = 160;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Every pulse here is finite; the +/-5 padding guarantees a non-zero
    // range even when all sessions share identical values
    const allPulses = last15Sessions.flatMap(s => [s.pulseBefore, s.pulseAfter]);
    const minPulse = Math.min(...allPulses) - 5;
    const maxPulse = Math.max(...allPulses) + 5;

    // One session is centered; two or more are spaced evenly
    const getX = (index: number) =>
      last15Sessions.length === 1
        ? padding + chartWidth / 2
        : padding + (index / (last15Sessions.length - 1)) * chartWidth;
    const getY = (pulse: number) => {
      const y = padding + chartHeight - ((pulse - minPulse) / (maxPulse - minPulse)) * chartHeight;
      // Never emit NaN or Infinity into the SVG
      return Number.isFinite(y) ? y : padding + chartHeight / 2;
    };

    const beforePoints = last15Sessions.map((s, i) => `${getX(i)},${getY(s.pulseBefore)}`).join(' ');
    const afterPoints = last15Sessions.map((s, i) => `${getX(i)},${getY(s.pulseAfter)}`).join(' ');

    // Stats: total length of ppt_history and lowest valid pulseAfter with its date
    const totalSessions = history.length;
    const validAfter = history.filter((s) => isFiniteNumber(s.pulseAfter));
    const bestSession = validAfter.length > 0
      ? validAfter.reduce((best, current) =>
          current.pulseAfter < best.pulseAfter ? current : best, validAfter[0]
        )
      : null;
    const bestDate = bestSession
      ? formatDateSafe(bestSession.date, {
          month: 'short',
          day: 'numeric',
          year: '2-digit'
        })
      : '';

    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Pulse Evolution</h3>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-400">Before</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-gray-400">After</span>
            </div>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 1, 2, 3].map(i => (
            <line
              key={i}
              x1={padding}
              y1={padding + (i / 3) * chartHeight}
              x2={width - padding}
              y2={padding + (i / 3) * chartHeight}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          {/* Pulse Before line (orange) */}
          <polyline
            points={beforePoints}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pulse After line (red) */}
          <polyline
            points={afterPoints}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {last15Sessions.map((s, i) => (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getY(s.pulseBefore)}
                r="4"
                fill="#f97316"
                stroke="#1f2937"
                strokeWidth="2"
              />
              <circle
                cx={getX(i)}
                cy={getY(s.pulseAfter)}
                r="4"
                fill="#dc2626"
                stroke="#1f2937"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* X-axis labels (dates) */}
          {last15Sessions.map((s, i) => {
            if (i % Math.ceil(last15Sessions.length / 5) === 0 || i === last15Sessions.length - 1) {
              const date = formatDateSafe(s.date, { month: 'numeric', day: 'numeric' });
              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-xs"
                  fill="#9ca3af"
                  fontSize="10"
                >
                  {date}
                </text>
              );
            }
            return null;
          })}

          {/* Y-axis labels */}
          {[0, 1, 2, 3].map(i => {
            const pulse = Math.round(maxPulse - (i / 3) * (maxPulse - minPulse));
            return (
              <text
                key={i}
                x={padding - 5}
                y={padding + (i / 3) * chartHeight + 4}
                textAnchor="end"
                className="text-xs"
                fill="#9ca3af"
                fontSize="10"
              >
                {pulse}
              </text>
            );
          })}
        </svg>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 text-xs">Total Sessions</p>
            <p className="text-white font-bold text-lg">{totalSessions}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-xs">Best Pulse After</p>
            <p className="text-white font-bold text-lg">
              {bestSession ? (
                <>{bestSession.pulseAfter} <span className="text-gray-500 text-sm">({bestDate})</span></>
              ) : (
                '\u2014'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <ApiKeyChecker onValidated={() => {}} />

      {screen === 'START' && (
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-orange-500 mb-2">UNLEASH THE BEAST</h1>
            <p className="text-gray-400">Track your fitness evolution</p>
          </div>

          <button
            onClick={() => {
              playClickSound();
              setScreen('LOCATION');
            }}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105"
          >
            Measure Pulse
          </button>

          {/* Progress Chart */}
          {renderProgressChart()}
        </div>
      )}

      {screen === 'LOCATION' && (
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Getting Location...</h2>
            <p className="text-gray-400">Please allow location access to track your altitude</p>
          </div>
        </div>
      )}

      {screen === 'EXERCISE' && (
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <button
              onClick={() => {
                playClickSound();
                setScreen('START');
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Start
            </button>
          </div>

          <div className="space-y-4">
            {exercises.map((exercise, index) => (
              <ExerciseCard
                key={index}
                exercise={exercise}
                onComplete={handleExerciseComplete}
                pulseBefore={pulseBefore}
                setPulseBefore={setPulseBefore}
                pulseAfter={pulseAfter}
                setPulseAfter={setPulseAfter}
                recoveryPulse={recoveryPulse}
                setRecoveryPulse={setRecoveryPulse}
                altitude={altitude}
                durationMin={durationMin}
                onSave={saveData}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

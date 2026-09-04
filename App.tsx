import React, { useState, useEffect, useRef } from 'react';
import { ExerciseCard } from './components/ExerciseCard';
import { ApiKeyChecker } from './components/ApiKeyChecker';
import { exercises } from './constants';
import { SubmissionData, Exercise } from './types';
import { playSuccessSound, playClickSound } from './services/audio';

// Google Forms endpoint
const GOOGLE_FORMS_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';

interface HistoryEntry {
  date: string;
  pulseBefore: number;
  pulseAfter: number;
  recoveryPulse: number;
  altitude: number;
  durationMin: number;
}

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

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ppt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
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
      formData.append('entry.exercise', submissionData.exercise);
      formData.append('entry.pulseBefore', submissionData.pulseBefore.toString());
      formData.append('entry.pulseAfter', submissionData.pulseAfter.toString());
      formData.append('entry.recoveryPulse', submissionData.recoveryPulse.toString());
      formData.append('entry.altitude', submissionData.altitude.toString());
      formData.append('entry.durationMin', submissionData.durationMin.toString());
      formData.append('entry.timestamp', submissionData.timestamp);

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
    if (history.length === 0) {
      return (
        <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
          <p className="text-orange-400 font-semibold text-lg">Your evolution starts with the first session</p>
          <p className="text-gray-400 text-sm mt-2">Track your pulse recovery over time</p>
        </div>
      );
    }

    const last15Sessions = history.slice(-15);
    const width = 320;
    const height = 160;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const allPulses = last15Sessions.flatMap(s => [s.pulseBefore, s.pulseAfter]);
    const minPulse = Math.min(...allPulses) - 5;
    const maxPulse = Math.max(...allPulses) + 5;

    const getX = (index: number) => padding + (index / (last15Sessions.length - 1 || 1)) * chartWidth;
    const getY = (pulse: number) => padding + chartHeight - ((pulse - minPulse) / (maxPulse - minPulse)) * chartHeight;

    const beforePoints = last15Sessions.map((s, i) => `${getX(i)},${getY(s.pulseBefore)}`).join(' ');
    const afterPoints = last15Sessions.map((s, i) => `${getX(i)},${getY(s.pulseAfter)}`).join(' ');

    // Calculate stats
    const totalSessions = history.length;
    const bestSession = history.reduce((best, current) => 
      current.pulseAfter < best.pulseAfter ? current : best, history[0]
    );
    const bestDate = new Date(bestSession.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });

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
              const date = new Date(s.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
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
            <p className="text-white font-bold text-lg">{bestSession.pulseAfter} <span className="text-gray-500 text-sm">({bestDate})</span></p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <ApiKeyChecker />

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

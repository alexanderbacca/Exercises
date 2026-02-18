
export enum AppState {
  START = 'START',
  PULSE_BEFORE_PREP = 'PULSE_BEFORE_PREP',
  PULSE_BEFORE_COUNTDOWN = 'PULSE_BEFORE_COUNTDOWN',
  PULSE_BEFORE_INPUT = 'PULSE_BEFORE_INPUT',
  EXERCISE_LOOP = 'EXERCISE_LOOP',
  EXERCISE_PREP = 'EXERCISE_PREP',
  EXERCISE_TIMER = 'EXERCISE_TIMER',
  SESSION_CHECK = 'SESSION_CHECK',
  PULSE_AFTER_PREP = 'PULSE_AFTER_PREP',
  PULSE_AFTER_COUNTDOWN = 'PULSE_AFTER_COUNTDOWN',
  PULSE_AFTER_INPUT = 'PULSE_AFTER_INPUT',
  FINAL_SUMMARY = 'FINAL_SUMMARY'
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  reps: string;
  staticImageUrls: string[];
  duration?: number; // Duration in seconds for timed exercises
}

export interface WorkoutSession {
  pulseBefore: number;
  pulseAfter: number;
  sessionCount: number;
  date: string;
}

// Added ImageSize type for Gemini image generation config
export type ImageSize = '1K' | '2K' | '4K';

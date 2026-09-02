
import { Exercise } from './types';

const GITHUB_BASE = 'https://raw.githubusercontent.com/alexanderbacca/Exercises/main';

export const EXERCISES: Exercise[] = [
  {
    id: 'squats',
    name: 'Squats',
    description: '12-15 reps. Focus on deep, controlled form for muscle gain in legs/glutes. Variation: Add a jump at the top for endurance once easy.',
    reps: '12-15 Reps',
    staticImageUrls: [`${GITHUB_BASE}/Squats.webp`]
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: '12 reps. Standard; if too easy, slow the descent for more time under tension.',
    reps: '12 Reps',
    staticImageUrls: [`${GITHUB_BASE}/Push-ups.webp`]
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    description: '30 seconds. Run in place vigorously; aim for 30 per side.',
    reps: '30 Seconds',
    duration: 30,
    staticImageUrls: [`${GITHUB_BASE}/Mountain%20climber.webp`]
  },
  {
    id: 'reverse-dips',
    name: 'Reverse Dips',
    description: '12 reps. Use a sturdy chair; great for triceps.',
    reps: '12 Reps',
    staticImageUrls: [`${GITHUB_BASE}/Reverse%20Dips.webp`]
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    description: '30 seconds. Run in place vigorously; aim for 20-30 per side.',
    reps: '30 Seconds',
    duration: 30,
    staticImageUrls: [`${GITHUB_BASE}/High%20Knees.webp`]
  },
  {
    id: 'planks',
    name: 'Planks',
    description: '45 seconds. Engage core fully; builds spinal stability.',
    reps: '45 Seconds',
    duration: 45,
    staticImageUrls: [`${GITHUB_BASE}/Planks.webp`]
  },
  {
    id: 'crunches',
    name: 'Crunches (Abdominales)',
    description: '15 reps. Focus on quality over speed.',
    reps: '15 Reps',
    staticImageUrls: [`${GITHUB_BASE}/Crunches.webp`]
  },
  {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: '12 reps per side. Twist fully for obliques.',
    reps: '12 Reps/Side',
    staticImageUrls: [`${GITHUB_BASE}/Bicycle%20Crunches.webp`]
  },
  {
    id: 'elevated-pushups',
    name: 'Elevated Leg Push-ups',
    description: '10-12 reps. Keep feet on a low step or chair; targets chest and shoulders.',
    reps: '10-12 Reps',
    staticImageUrls: [`${GITHUB_BASE}/Elevated%20Leg%20Push-ups.webp`]
  }
];

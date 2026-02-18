
import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  {
    id: 'squats',
    name: 'Squats',
    description: '12-15 reps. Focus on deep, controlled form for muscle gain in legs/glutes. Variation: Add a jump at the top for endurance once easy.',
    reps: '12-15 Reps',
    staticImageUrls: ['squats.jpg']
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: '12 reps. Standard; if too easy, slow the descent for more time under tension.',
    reps: '12 Reps',
    staticImageUrls: ['push-ups.jpg']
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    description: '30 seconds. Run in place vigorously; aim for 30 per side.',
    reps: '30 Seconds',
    duration: 30,
    staticImageUrls: ['mountain-climber.jpg']
  },
  {
    id: 'reverse-dips',
    name: 'Reverse Dips',
    description: '12 reps. Use a sturdy chair; great for triceps.',
    reps: '12 Reps',
    staticImageUrls: ['reverse-dips.jpg']
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    description: '30 seconds. Run in place vigorously; aim for 20-30 per side.',
    reps: '30 Seconds',
    duration: 30,
    staticImageUrls: ['high-knees.jpg']
  },
  {
    id: 'planks',
    name: 'Planks',
    description: '45 seconds. Engage core fully; builds spinal stability.',
    reps: '45 Seconds',
    duration: 45,
    staticImageUrls: ['planks.jpg']
  },
  {
    id: 'crunches',
    name: 'Crunches (Abdominales)',
    description: '15 reps. Focus on quality over speed.',
    reps: '15 Reps',
    staticImageUrls: ['crunches.jpg']
  },
  {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: '12 reps per side. Twist fully for obliques.',
    reps: '12 Reps/Side',
    staticImageUrls: ['bicycle-crunches.jpg']
  },
  {
    id: 'elevated-pushups',
    name: 'Elevated Leg Push-ups',
    description: '10-12 reps. Keep feet on a low step or chair; targets chest and shoulders.',
    reps: '10-12 Reps',
    staticImageUrls: ['elevated-pushups.jpg']
  }
];

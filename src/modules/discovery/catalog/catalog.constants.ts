import { GoalTag } from '@prisma/client';

/**
 * Goal-based quick filters rendered as chips on Home.
 * Kept server-side so copy/ordering can change without an app release.
 */
export const GOAL_TAGS: Array<{
  key: GoalTag;
  label: string;
  icon: string;
  description: string;
}> = [
  { key: GoalTag.HIGH_PROTEIN, label: 'High Protein', icon: 'dumbbell', description: '25g+ protein per serving' },
  { key: GoalTag.LOW_CALORIE, label: 'Low Calorie', icon: 'leaf', description: 'Under 400 kcal' },
  { key: GoalTag.WEIGHT_LOSS, label: 'Weight Loss', icon: 'trending-down', description: 'Calorie-controlled, high fibre' },
  { key: GoalTag.MUSCLE_GAIN, label: 'Muscle Gain', icon: 'flame', description: 'Protein-dense, calorie-surplus' },
  { key: GoalTag.HEALTHY_LIFESTYLE, label: 'Healthy Lifestyle', icon: 'heart', description: 'Balanced everyday meals' },
];

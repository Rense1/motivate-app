import { Milestone } from './types'

/**
 * Derive milestone rank from its position in the list.
 * Last = rank 5 (gold), second-to-last = rank 4 (silver), etc.
 */
export function getMilestoneRank(index: number, total: number): number {
  const fromEnd = total - 1 - index
  if (fromEnd === 0) return 5 // gold  – final goal
  if (fromEnd === 1) return 4 // silver
  if (fromEnd === 2) return 3 // bronze
  if (fromEnd === 3) return 2 // blue
  if (fromEnd === 4) return 1 // green
  return 0                     // no colour
}

/**
 * A milestone is locked when any earlier non-achieved milestone still exists.
 * The first non-achieved milestone is the "current" one and is NOT locked.
 */
export function isMilestoneLocked(
  index: number,
  milestones: Pick<Milestone, 'is_achieved'>[],
): boolean {
  const firstUnachieved = milestones.findIndex(m => !m.is_achieved)
  if (firstUnachieved === -1) return false // all achieved
  return index > firstUnachieved
}

/**
 * Weighted progress calculation.
 *
 * weights = [1, 1, 1.5, 2, 2.5, 3]  (index = rank 0–5)
 *
 * P = (sum(weights[0..L-1]) + weights[L] * s/N) / sum(all weights) * 100
 *
 * @param L  Current rank (0–5)
 * @param s  Steps completed within current rank
 * @param N  Total steps within current rank
 */
export function calcProgress(L: number, s: number, N: number): number {
  const weights = [1, 1, 1.5, 2, 2.5, 3]
  const totalWeight = weights.reduce((a, b) => a + b, 0) // 11

  if (L === 5 && s >= N && N > 0) return 100
  if (L === 0) return 0

  const completedWeight = weights.slice(0, L).reduce((a, b) => a + b, 0)
  const currentProgress = N > 0 && s > 0 ? weights[L] * (s / N) : 0

  return Math.min(100, ((completedWeight + currentProgress) / totalWeight) * 100)
}

/** Rank display metadata */
export const RANK_META: Record<number, { label: string; border: string; glow: string; color: string }> = {
  0: { label: '',         border: 'none',                  glow: 'rgba(185,28,28,0.30)',    color: '#ef4444' },
  1: { label: 'GREEN',    border: '3px solid #22c55e',     glow: 'rgba(34,197,94,0.30)',    color: '#22c55e' },
  2: { label: 'BLUE',     border: '3px solid #3b82f6',     glow: 'rgba(59,130,246,0.30)',   color: '#3b82f6' },
  3: { label: 'BRONZE',   border: '3px solid #b45309',     glow: 'rgba(180,83,9,0.30)',     color: '#b45309' },
  4: { label: 'SILVER',   border: '3px solid #94a3b8',     glow: 'rgba(148,163,184,0.35)',  color: '#94a3b8' },
  5: { label: '最終目標', border: '3px solid #eab308',     glow: 'rgba(234,179,8,0.40)',    color: '#eab308' },
}

/** Solid card background per rank (no image) */
export const RANK_BG: Record<number, string> = {
  0: '#991b1b',
  1: '#15803d',
  2: '#1d4ed8',
  3: '#92400e',
  4: '#334155',
  5: '#78350f',
}

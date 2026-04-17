import { describe, it, expect } from 'vitest'

/**
 * Pure logic tests for goal creation rules.
 * Database interactions are tested via integration tests (Supabase local or staging).
 */

describe('goal creation - free plan limit', () => {
  function canCreateGoal(isPremium: boolean, existingGoalCount: number): boolean {
    if (isPremium) return true
    return existingGoalCount < 2
  }

  it('free user can create first goal', () => {
    expect(canCreateGoal(false, 0)).toBe(true)
  })

  it('free user can create second goal', () => {
    expect(canCreateGoal(false, 1)).toBe(true)
  })

  it('free user cannot create third goal', () => {
    expect(canCreateGoal(false, 2)).toBe(false)
  })

  it('premium user can create unlimited goals', () => {
    expect(canCreateGoal(true, 0)).toBe(true)
    expect(canCreateGoal(true, 2)).toBe(true)
    expect(canCreateGoal(true, 10)).toBe(true)
  })
})

describe('goal creation - milestone ordering', () => {
  function buildMilestoneInserts(titles: string[], deadlines: string[], goalId: string) {
    const valid = titles
      .map((t, i) => ({ title: t.trim(), deadline: deadlines[i] || null }))
      .filter(m => m.title)
    return valid.map((ms, i) => ({
      goal_id: goalId,
      title: ms.title,
      order_index: i,
      deadline: ms.deadline,
    }))
  }

  it('filters out empty milestone titles', () => {
    const result = buildMilestoneInserts(['step 1', '', 'step 3'], ['', '', ''], 'goal-1')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('step 1')
    expect(result[1].title).toBe('step 3')
  })

  it('assigns sequential order_index after filtering', () => {
    const result = buildMilestoneInserts(['a', 'b', 'c'], ['', '', ''], 'goal-1')
    expect(result.map(r => r.order_index)).toEqual([0, 1, 2])
  })

  it('trims whitespace from milestone titles', () => {
    const result = buildMilestoneInserts(['  step 1  '], [''], 'goal-1')
    expect(result[0].title).toBe('step 1')
  })

  it('uses null for missing deadlines', () => {
    const result = buildMilestoneInserts(['step 1'], [''], 'goal-1')
    expect(result[0].deadline).toBeNull()
  })

  it('preserves deadline when provided', () => {
    const result = buildMilestoneInserts(['step 1'], ['2026-05-01'], 'goal-1')
    expect(result[0].deadline).toBe('2026-05-01')
  })
})

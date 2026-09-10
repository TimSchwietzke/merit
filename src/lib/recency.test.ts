import { describe, expect, it } from 'vitest'

import { coldest, daysSinceWorked, glow } from '@/lib/recency'
import type { ExerciseRef } from '@/features/training/useWorkout'
import type { LoggedSet, SessionSets } from '@/lib/training'

const TODAY = '2026-09-10'

const exercise = (id: string, primary: string[], secondary: string[] = []): ExerciseRef => ({
  id,
  nameEn: id,
  nameDe: id,
  muscleGroup: 'chest',
  equipment: 'barbell',
  primaryMuscles: primary,
  secondaryMuscles: secondary,
})

const set = (exerciseId: string, done = true): LoggedSet => ({
  id: Math.random().toString(36),
  exerciseId,
  setNumber: 1,
  reps: 8,
  weightKg: 60,
  rir: null,
  done,
})

const CATALOGUE = new Map<string, ExerciseRef>([
  ['bench', exercise('bench', ['chest'], ['triceps'])],
  ['squat', exercise('squat', ['quadriceps'])],
])

describe('daysSinceWorked', () => {
  it('reports the most recent day each region was worked', () => {
    const history: SessionSets[] = [
      { date: '2026-09-03', sets: [set('bench')] },
      { date: '2026-09-08', sets: [set('squat')] },
    ]
    const days = daysSinceWorked(history, CATALOGUE, TODAY)
    expect(days.get('chest')).toBe(7)
    expect(days.get('quadriceps')).toBe(2)
  })

  it('counts secondary muscles, because the body does', () => {
    const days = daysSinceWorked([{ date: TODAY, sets: [set('bench')] }], CATALOGUE, TODAY)
    expect(days.get('triceps')).toBe(0)
  })

  it('ignores planned sets that were never performed', () => {
    const days = daysSinceWorked([{ date: TODAY, sets: [set('bench', false)] }], CATALOGUE, TODAY)
    expect(days.size).toBe(0)
  })

  it('keeps the most recent of several days', () => {
    const history: SessionSets[] = [
      { date: '2026-09-01', sets: [set('bench')] },
      { date: '2026-09-09', sets: [set('bench')] },
    ]
    expect(daysSinceWorked(history, CATALOGUE, TODAY).get('chest')).toBe(1)
  })

  it('skips a set whose exercise is not in the window', () => {
    expect(daysSinceWorked([{ date: TODAY, sets: [set('gone')] }], CATALOGUE, TODAY).size).toBe(0)
  })
})

describe('glow', () => {
  it('is full today and cold after a week', () => {
    expect(glow(0)).toBe(1)
    expect(glow(7)).toBe(0)
    expect(glow(30)).toBe(0)
  })

  it('fades evenly in between rather than in buckets', () => {
    expect(glow(2)).toBeCloseTo(5 / 7)
    expect(glow(5)).toBeCloseTo(2 / 7)
  })

  it('treats never-trained as cold rather than as an error', () => {
    expect(glow(undefined)).toBe(0)
  })
})

describe('coldest', () => {
  const REGIONS = ['chest', 'quadriceps', 'triceps']

  it('names the region trained longest ago', () => {
    const days = new Map([['chest', 2], ['quadriceps', 9], ['triceps', 1]])
    expect(coldest(days, REGIONS)).toEqual({ region: 'quadriceps', days: 9 })
  })

  it('puts a region with nothing at all above every region with a number', () => {
    // Somebody who has never trained legs is exactly who the line is for.
    const days = new Map([['chest', 30], ['triceps', 1]])
    expect(coldest(days, REGIONS)).toEqual({ region: 'quadriceps', days: null })
  })

  it('is null when there are no regions to report on', () => {
    expect(coldest(new Map(), [])).toBeNull()
  })
})

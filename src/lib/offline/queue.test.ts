import { describe, expect, it } from 'vitest'

import { collapse, pendingSetIds, type Pending } from '@/lib/offline/queue'

const insert = (seq: number, id: string): Pending => ({
  seq,
  kind: 'set',
  id,
  workoutId: 'w1',
  exerciseId: 'x1',
  setNumber: 1,
  reps: 8,
  weightKg: 60,
  rir: null,
  done: false,
})

const patch = (seq: number, id: string, reps: number, done = true): Pending => ({
  seq,
  kind: 'setPatch',
  id,
  values: { reps, weightKg: 62.5, rir: 1, done },
})

describe('collapse', () => {
  it('leaves a queue the server has to hear in full alone', () => {
    const queue = [patch(1, 's1', 8), { seq: 2, kind: 'setDelete', id: 's2' } as Pending]
    expect(collapse(queue)).toEqual(queue)
  })

  it('drops a set that was added and deleted before either was sent', () => {
    const queue = [insert(1, 's1'), insert(2, 's2'), { seq: 3, kind: 'setDelete' as const, id: 's1' }]
    expect(collapse(queue)).toEqual([insert(2, 's2')])
  })

  it('drops the patches of a set that was then deleted', () => {
    const queue = [insert(1, 's1'), patch(2, 's1', 10), { seq: 3, kind: 'setDelete' as const, id: 's1' }]
    expect(collapse(queue)).toEqual([])
  })

  it('folds a patch into the insert still waiting in front of it', () => {
    const collapsed = collapse([insert(1, 's1'), patch(2, 's1', 10)])
    expect(collapsed).toEqual([
      { ...insert(1, 's1'), reps: 10, weightKg: 62.5, rir: 1, done: true },
    ])
  })

  it('keeps a patch against a set the server already has', () => {
    const queue = [patch(1, 's1', 10)]
    expect(collapse(queue)).toEqual(queue)
  })

  it('does not change the queue it was given', () => {
    const queue = [insert(1, 's1'), patch(2, 's1', 10)]
    const before = JSON.stringify(queue)
    collapse(queue)
    expect(JSON.stringify(queue)).toBe(before)
  })

  it('keeps the workout in front of the sets that hang off it', () => {
    const queue: Pending[] = [
      { seq: 1, kind: 'workout', id: 'w1', date: '2026-09-11', routineId: null },
      insert(2, 's1'),
    ]
    expect(collapse(queue).map((entry) => entry.kind)).toEqual(['workout', 'set'])
  })
})

describe('pendingSetIds', () => {
  it('names every set with work still waiting', () => {
    const ids = pendingSetIds([
      { seq: 1, kind: 'workout', id: 'w1', date: '2026-09-11', routineId: null },
      insert(2, 's1'),
      patch(3, 's2', 8),
      { seq: 4, kind: 'setDelete', id: 's3' },
    ])
    expect([...ids].sort()).toEqual(['s1', 's2', 's3'])
  })
})

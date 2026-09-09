import { describe, expect, it } from 'vitest'

import {
  ACTIVITY_FACTORS,
  ageOn,
  calculateEnergy,
  calculateMacros,
  goalOn,
  maintenanceEnergy,
  missingInputs,
  progress,
  restingEnergy,
  type BodyInputs,
  type Goal,
} from '@/lib/goals'

const body: BodyInputs = {
  weightKg: 82,
  heightCm: 181,
  birthDate: '1995-06-15',
  sex: 'male',
  activityLevel: 'moderate',
  direction: 'lose',
}

describe('ageOn', () => {
  it('counts whole years', () => {
    expect(ageOn('1995-06-15', '2026-06-15')).toBe(31)
    expect(ageOn('1995-06-15', '2026-09-09')).toBe(31)
  })

  it('does not count a birthday that has not happened yet', () => {
    expect(ageOn('1995-06-15', '2026-06-14')).toBe(30)
    expect(ageOn('1995-12-31', '2026-01-01')).toBe(30)
  })
})

describe('restingEnergy', () => {
  it('is Mifflin–St Jeor', () => {
    // 10×82 + 6.25×181 − 5×31 + 5 = 1801.25
    expect(restingEnergy(body, '2026-09-09')).toBeCloseTo(1801.25, 6)
  })

  it('subtracts 161 for women rather than adding 5', () => {
    const male = restingEnergy(body, '2026-09-09')
    const female = restingEnergy({ ...body, sex: 'female' }, '2026-09-09')
    expect(male - female).toBe(166)
  })

  it('falls as age rises', () => {
    const older = restingEnergy({ ...body, birthDate: '1975-06-15' }, '2026-09-09')
    expect(older).toBeLessThan(restingEnergy(body, '2026-09-09'))
  })
})

describe('maintenanceEnergy', () => {
  it('multiplies resting by the activity factor', () => {
    const resting = restingEnergy(body, '2026-09-09')
    expect(maintenanceEnergy(body, '2026-09-09')).toBeCloseTo(resting * 1.55, 6)
  })

  it('rises with every step up the activity scale', () => {
    const values = (['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map(
      (activityLevel) => maintenanceEnergy({ ...body, activityLevel }, '2026-09-09'),
    )
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(ACTIVITY_FACTORS.sedentary).toBeLessThan(ACTIVITY_FACTORS.very_active)
  })
})

describe('calculateEnergy', () => {
  it('shifts maintenance by 15% in the direction chosen', () => {
    const { maintenance, target } = calculateEnergy(body, '2026-09-09')
    expect(target).toBeCloseTo(maintenance * 0.85, 6)
    expect(calculateEnergy({ ...body, direction: 'gain' }, '2026-09-09').target).toBeCloseTo(
      maintenance * 1.15,
      6,
    )
  })

  it('leaves maintenance alone when the direction is to maintain', () => {
    const { maintenance, target } = calculateEnergy({ ...body, direction: 'maintain' }, '2026-09-09')
    expect(target).toBe(maintenance)
  })

  it('returns its working, not just the answer', () => {
    // The target rests on an equation and a coarse multiplier. A number with no
    // maintenance beside it is one the user has to take on trust.
    const result = calculateEnergy(body, '2026-09-09')
    expect(result.resting).toBeGreaterThan(0)
    expect(result.maintenance).toBeGreaterThan(result.resting)
  })
})

describe('missingInputs', () => {
  it('names what the calculation still needs', () => {
    expect(missingInputs(body)).toEqual([])
    expect(missingInputs({ ...body, heightCm: undefined })).toEqual(['heightCm'])
    expect(missingInputs({})).toHaveLength(6)
  })

  it('treats a null from the profile as missing, not as zero', () => {
    expect(missingInputs({ ...body, birthDate: undefined })).toEqual(['birthDate'])
  })
})

describe('goalOn', () => {
  const goal = (validFrom: string, kcal: number): Goal => ({
    mode: 'manual',
    validFrom,
    kcal,
    proteinG: 150,
    fatG: 70,
    carbsG: 200,
  })

  const history = [goal('2026-01-01', 2000), goal('2026-06-01', 2400), goal('2026-09-01', 2200)]

  it('is the most recent target that had already started', () => {
    expect(goalOn(history, '2026-09-09')?.kcal).toBe(2200)
    expect(goalOn(history, '2026-07-01')?.kcal).toBe(2400)
    expect(goalOn(history, '2026-01-01')?.kcal).toBe(2000)
  })

  it('does not let a later target rewrite what an earlier day was measured against', () => {
    // The whole reason targets are a history rather than one editable row.
    expect(goalOn(history, '2026-03-15')?.kcal).toBe(2000)
  })

  it('is null before the first target existed', () => {
    expect(goalOn(history, '2025-12-31')).toBeNull()
    expect(goalOn([], '2026-09-09')).toBeNull()
  })

  it('does not need sorted input', () => {
    expect(goalOn([...history].reverse(), '2026-07-01')?.kcal).toBe(2400)
  })
})

describe('progress', () => {
  it('reports how much is left as a negative overshoot', () => {
    const { over, fraction, overshoot } = progress(1420, 2100)
    expect(over).toBe(-680)
    expect(fraction).toBeCloseTo(0.676, 3)
    expect(overshoot).toBe(0)
  })

  it('separates the overshoot instead of clamping it away', () => {
    // §10.9: past the target the bar keeps filling in danger from the target
    // mark rightwards, so the overshoot has to survive as its own figure.
    const { over, fraction, overshoot } = progress(2380, 2100)
    expect(over).toBe(280)
    expect(fraction).toBe(1)
    expect(overshoot).toBeCloseTo(280 / 2100, 6)
  })

  it('is empty rather than infinite when there is no target', () => {
    expect(progress(1500, 0)).toEqual({ over: 0, fraction: 0, overshoot: 0 })
  })
})

describe('calculateMacros', () => {
  const split = { kcal: 2400, weightKg: 80, proteinPerKg: 1.8, fatShare: 0.3 }

  it('scales protein by body weight and fat by the energy share', () => {
    const { proteinG, fatG } = calculateMacros(split)
    expect(proteinG).toBe(144)
    // 30% of 2400 kcal is 720, at 9 kcal per gram.
    expect(fatG).toBeCloseTo(80, 10)
  })

  it('gives the rest of the day to carbohydrate, and the three add back up', () => {
    const { proteinG, fatG, carbsG } = calculateMacros(split)
    const energy = proteinG * 4 + fatG * 9 + carbsG * 4
    expect(energy).toBeCloseTo(split.kcal, 6)
  })

  it('never returns a negative gram figure', () => {
    // A high protein-per-kilogram against a low target spends the whole day
    // before any carbohydrate is reached. Zero is a target; −40 g is not.
    const { carbsG } = calculateMacros({ ...split, kcal: 900, proteinPerKg: 2.5 })
    expect(carbsG).toBe(0)
  })

  it('moves the split when either knob moves', () => {
    const leaner = calculateMacros({ ...split, fatShare: 0.2 })
    expect(leaner.fatG).toBeLessThan(calculateMacros(split).fatG)
    expect(leaner.carbsG).toBeGreaterThan(calculateMacros(split).carbsG)

    const stronger = calculateMacros({ ...split, proteinPerKg: 2.2 })
    expect(stronger.proteinG).toBeGreaterThan(calculateMacros(split).proteinG)
  })
})

import { describe, expect, it } from 'vitest'

import { firstUnanswered, resumeAt, type Answers } from '@/lib/onboarding'

const NOTHING: Answers = {
  displayName: null,
  weightKg: null,
  heightCm: null,
  birthDate: null,
  sex: null,
  activityLevel: null,
  direction: null,
  hasTarget: false,
}

const EVERYTHING: Answers = {
  displayName: 'Tim',
  weightKg: 82.4,
  heightCm: 181,
  birthDate: '1995-06-15',
  sex: 'male',
  activityLevel: 'moderate',
  direction: 'lose',
  hasTarget: true,
}

describe('firstUnanswered', () => {
  it('starts at the name when nothing has been entered', () => {
    expect(firstUnanswered(NOTHING)).toBe('name')
  })

  it('is null once everything has been', () => {
    expect(firstUnanswered(EVERYTHING)).toBeNull()
  })

  it('keeps asking a step until every field on it has a value', () => {
    expect(firstUnanswered({ ...EVERYTHING, heightCm: null })).toBe('body')
    expect(firstUnanswered({ ...EVERYTHING, sex: null })).toBe('about')
    expect(firstUnanswered({ ...EVERYTHING, activityLevel: null })).toBe('goal')
    expect(firstUnanswered({ ...EVERYTHING, hasTarget: false })).toBe('target')
  })

  it('returns the earliest gap, not the last', () => {
    expect(firstUnanswered({ ...NOTHING, displayName: 'Tim', birthDate: '1995-06-15' })).toBe('body')
  })
})

describe('resumeAt', () => {
  it('opens with the introduction for an account that has entered nothing', () => {
    expect(resumeAt(NOTHING, false)).toEqual({ intro: true, step: 'name' })
  })

  it('picks up where a half-finished setup stopped, without the introduction', () => {
    expect(resumeAt({ ...NOTHING, displayName: 'Tim' }, false)).toEqual({
      intro: false,
      step: 'body',
    })
  })

  it('runs from the top when it is started again on purpose', () => {
    expect(resumeAt(EVERYTHING, true)).toEqual({ intro: true, step: 'name' })
  })

  it('lands on the last step when there is nothing left to ask', () => {
    expect(resumeAt(EVERYTHING, false)).toEqual({ intro: false, step: 'target' })
  })
})

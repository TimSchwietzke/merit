import { describe, expect, it } from 'vitest'

import { rankByName, searchWords } from '@/lib/search-rank'

const names = (foods: { name: string }[]) => foods.map((food) => food.name)

describe('searchWords', () => {
  it('splits on whitespace and lowercases', () => {
    expect(searchWords('  Skyr   NATUR ')).toEqual(['skyr', 'natur'])
  })
})

describe('rankByName', () => {
  it('puts the food that is the term above foods that merely mention it', () => {
    const foods = [{ name: 'Pasta sauce' }, { name: 'Antipasti' }, { name: 'Pasta' }, { name: 'Vollkorn Pasta' }]
    expect(names(rankByName(foods, 'pasta'))).toEqual(['Pasta', 'Pasta sauce', 'Vollkorn Pasta', 'Antipasti'])
  })

  it('sinks a match that is only in the brand below every match in the name', () => {
    const foods = [{ name: 'Compote', brand: 'Skyr' }, { name: 'Natur Skyr', brand: 'Milbona' }]
    expect(names(rankByName(foods, 'skyr'))).toEqual(['Natur Skyr', 'Compote'])
  })

  it('needs every word, in any order', () => {
    const foods = [{ name: 'Skyr Vanille' }, { name: 'Natur Skyr' }, { name: 'Skyr natur 0,2 %' }]
    expect(names(rankByName(foods, 'skyr natur'))).toEqual(['Skyr natur 0,2 %', 'Natur Skyr', 'Skyr Vanille'])
  })

  it('ignores case', () => {
    const foods = [{ name: 'Haferflocken zart' }, { name: 'HAFERFLOCKEN' }]
    expect(names(rankByName(foods, 'haferflocken'))).toEqual(['HAFERFLOCKEN', 'Haferflocken zart'])
  })

  it('keeps the incoming order between equals', () => {
    const foods = [{ name: 'Pasta', id: 1 }, { name: 'pasta', id: 2 }]
    expect(rankByName(foods, 'pasta').map((food) => food.id)).toEqual([1, 2])
  })
})

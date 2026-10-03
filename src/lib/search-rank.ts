/** The words of a search term, the way every search in merit reads them. */
export function searchWords(term: string): string[] {
  return term.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Order search results by how well the *name* answers the term.
 *
 * The sources do not: the catalogue comes back alphabetical, and Open Food
 * Facts scores a brand called "Pasta" as highly as a packet of pasta. So, best
 * first: the name is the term, the name starts with it, every word starts a
 * word of the name, every word is somewhere in the name, and last whatever
 * matched elsewhere (the brand). Equals keep the order they arrived in.
 */
export function rankByName<T extends { name: string }>(foods: T[], term: string): T[] {
  const phrase = term.trim().toLowerCase()
  const words = searchWords(term)

  const tier = (name: string) => {
    const lower = name.trim().toLowerCase()
    if (lower === phrase) return 0
    if (lower.startsWith(phrase)) return 1
    const nameWords = lower.split(/[^\p{L}\p{N}]+/u)
    if (words.every((word) => nameWords.some((part) => part.startsWith(word)))) return 2
    if (words.every((word) => lower.includes(word))) return 3
    return 4
  }

  return foods
    .map((food, index) => ({ food, index, tier: tier(food.name) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map(({ food }) => food)
}

/**
 * The legal texts, and the one place they live.
 *
 * **These are not written here and must not be.** A privacy notice and an
 * imprint are legal documents, and the version that holds up is the one a
 * maintained German generator produces — e-recht24, Dr. Schwenke's
 * Datenschutz-Generator, or an equivalent — because those are kept in step with
 * the law by people qualified to read it. Prose invented in a repository looks
 * like the real thing and is not.
 *
 * So this module is a slot. Paste the generated text in, one paragraph per
 * entry, and the pages render it. `docs/LEGAL-INPUTS.md` holds the answers the
 * generator will ask for — every one of them established by auditing what the
 * app actually does, which is the part a generator cannot know and the part
 * this repository can get right.
 *
 * Until then both pages say plainly that they are unfinished, because a legal
 * page that is quietly wrong is worse than one that is visibly absent.
 */

/** One block of a document: an optional heading and its paragraphs. */
export interface Block {
  heading?: string
  paragraphs: string[]
  /** Rendered as a bulleted list under the paragraphs. */
  items?: string[]
}

export interface Document {
  /** ISO date the text was generated. Bumping it re-asks for consent. */
  version: string
  de: Block[]
  en: Block[]
}

export const PRIVACY: Document = {
  version: '',
  de: [],
  en: [],
}

export const IMPRINT: Document = {
  version: '',
  de: [],
  en: [],
}

/** Whether a document still has nothing in it. */
export const isEmpty = (document: Document): boolean =>
  document.version === '' || document.de.length === 0 || document.en.length === 0

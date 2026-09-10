import { PRIVACY } from '@/features/legal/documents'

/**
 * The version of the privacy notice a consent is recorded against.
 *
 * It is the generated document's own date, so bumping it is the same act as
 * pasting a new text in — there is no second place to remember. Everybody is
 * asked again when it changes, which is the point: consent to an older notice
 * describes a different processing.
 *
 * Empty while no text has been supplied, which the consent gate treats as "not
 * ready to ask" rather than as a version.
 */
export const PRIVACY_VERSION = PRIVACY.version

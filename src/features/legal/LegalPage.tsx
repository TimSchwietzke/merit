import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { isEmpty, type Document as LegalDocument } from '@/features/legal/documents'

/**
 * The frame both legal documents render in.
 *
 * Long-form, so `text-prose` at 16px and a measure capped near 72ch (§4.3,
 * §5.3), these are the only screens in the app somebody reads rather than
 * scans, and the interface's 15px density is wrong for that.
 *
 * Nothing here is behind authentication. A privacy notice only a signed-in user
 * can read is not published, and an imprint has to be `leicht erkennbar,
 * unmittelbar erreichbar und ständig verfügbar`, which a login wall is not.
 */
export function LegalPage({
  title,
  document,
  children,
}: {
  title: string
  document: LegalDocument
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const missing = isEmpty(document)

  return (
    <article className="mx-auto w-full max-w-[72ch] pb-16">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>

      {missing ? (
        // §10.8's unfinished state, on the two pages where being quietly wrong
        // is the entire problem. It says what is absent rather than showing an
        // empty page that looks finished.
        <div className="mt-6 border-l-2 border-danger py-1 pl-4">
          <p className="max-w-[62ch] font-mono text-2xs text-danger">
            {t('pages.legal.missing')}
          </p>
        </div>
      ) : (
        <p className="mt-2 font-mono text-2xs text-ink-faint">
          {t('pages.legal.updated', {
            date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
              new Date(document.version),
            ),
          })}
        </p>
      )}

      <div className="mt-9 flex flex-col gap-9">{children}</div>

      <Link
        to="/account"
        className="mt-12 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('nav.account')}
      </Link>
    </article>
  )
}

/**
 * A generated document, rendered in the reader's language.
 *
 * Plain text only, headings, paragraphs and lists. What a generator produces
 * is prose, and giving it a markup language to be parsed would mean a parser
 * standing between a legal text and the person reading it.
 */
export function Document({ document }: { document: LegalDocument }) {
  const { i18n } = useTranslation()
  const blocks = i18n.language === 'de' ? document.de : document.en

  return (
    <>
      {blocks.map((block, index) => (
        <section key={index} className="flex flex-col gap-3">
          {block.heading ? (
            <h2 className="text-lg font-semibold tracking-tight text-ink">{block.heading}</h2>
          ) : null}

          {block.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} className="text-prose leading-[1.7] text-ink-muted">
              {paragraph}
            </p>
          ))}

          {block.items ? (
            <ul className="flex list-disc flex-col gap-2 pl-5 text-prose leading-[1.7] text-ink-muted marker:text-ink-faint">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  )
}

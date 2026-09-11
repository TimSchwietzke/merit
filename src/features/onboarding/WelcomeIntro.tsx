import { Apple, Dumbbell, Scale } from 'lucide-react'
import { useRef, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/ui/button'

/**
 * The four panels that say what merit is, before it asks for anything.
 *
 * One domain per panel, each wearing that domain's hue through `data-domain`
 * (tokens.css) rather than a colour written in here. The first panel has no
 * domain and stays moss, because it is about the app rather than one part of
 * it.
 *
 * Swiping is the browser's: a scroll-snap strip, which gives a real swipe on
 * touch, a trackpad gesture on a laptop, arrow keys, and a scrollbar, none of
 * which a gesture handler in here would get right. The buttons scroll the same
 * strip, so both ways of moving stay in step by construction. Under
 * `prefers-reduced-motion` the smooth scroll is already off globally.
 */
const PANELS: {
  key: 'merit' | 'food' | 'training' | 'weight'
  domain?: 'nutrition' | 'training' | 'weight'
  Icon?: ComponentType<{ size?: number; strokeWidth?: number }>
}[] = [
  { key: 'merit' },
  { key: 'food', domain: 'nutrition', Icon: Apple },
  { key: 'training', domain: 'training', Icon: Dumbbell },
  { key: 'weight', domain: 'weight', Icon: Scale },
]

export function WelcomeIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const strip = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState(0)
  const last = panel === PANELS.length - 1

  const go = (index: number) => {
    const el = strip.current
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div
        ref={strip}
        // `scroll-smooth` is on the buttons' account; a swipe never reads it.
        onScroll={(event) =>
          setPanel(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))
        }
        role="group"
        aria-label={t('pages.welcome.intro.panel', { n: panel + 1, total: PANELS.length })}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
      >
        {PANELS.map(({ key, domain, Icon }) => (
          <section
            key={key}
            data-domain={domain}
            className="flex w-full shrink-0 snap-center flex-col justify-center px-6 py-10"
          >
            <div className="mx-auto flex w-full max-w-[400px] flex-col items-start gap-5">
              {Icon ? (
                <span
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent"
                >
                  <Icon size={22} strokeWidth={1.5} />
                </span>
              ) : (
                <Wordmark className="text-2xl" />
              )}

              <p className="font-mono text-2xs text-ink-faint">
                {t(`pages.welcome.intro.${key}.label`)}
              </p>
              <h2 className="max-w-[20ch] font-serif text-2xl leading-snug tracking-tight text-balance">
                {t(`pages.welcome.intro.${key}.line`)}
              </h2>
              <p className="max-w-[36ch] text-prose leading-[1.7] text-ink-muted">
                {t(`pages.welcome.intro.${key}.body`)}
              </p>
            </div>
          </section>
        ))}
      </div>

      <footer className="mx-auto w-full max-w-[400px] px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {/* Where you are in four panels, and nothing to press: the button
            below and the swipe itself both move the strip, so a dot would be a
            third control for the same job, and one that cannot be given a
            44px target (§5.2) without the four of them overlapping. */}
        <div aria-hidden className="mb-6 flex justify-center gap-2">
          {PANELS.map(({ key }, index) => (
            <span
              key={key}
              className={`block size-1.5 rounded-full transition-colors [transition-duration:140ms] ${
                index === panel ? 'bg-ink' : 'bg-line-strong'
              }`}
            />
          ))}
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => (last ? onDone() : go(panel + 1))}
        >
          {t(last ? 'pages.welcome.intro.start' : 'pages.welcome.intro.next')}
        </Button>

        <button
          type="button"
          onClick={onDone}
          className="mt-3 min-h-11 w-full text-center font-mono text-2xs text-ink-faint hover:text-ink"
        >
          {t('pages.welcome.intro.skip')}
        </button>
      </footer>
    </main>
  )
}

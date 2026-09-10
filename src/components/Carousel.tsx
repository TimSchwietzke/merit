import type { ReactNode } from 'react'
import { useRef, useState } from 'react'

/**
 * Cards you swipe through, one mostly-filling the screen with the next
 * peeking.
 *
 * Native scroll snapping, no library and no JavaScript driving the motion:
 * `overflow-x-auto` with `snap-x snap-mandatory` on the track and `snap-center`
 * on each card is the whole mechanism. It is momentum-scrolled by the browser,
 * so it feels like the platform because it *is* the platform — a hand-written
 * drag would fight the compositor and lose on the phone this runs on.
 *
 * The dots are a readout, never a control: on a phone you swipe, and a row of
 * 8px targets under something you already swipe is four failed taps. They are
 * `aria-hidden`, and the cards remain a plain list to a screen reader, which is
 * the right shape — a carousel is a way of showing a list, not a kind of thing.
 *
 * The scroll position is read on scroll rather than tracked: whichever card is
 * nearest the centre is the current one, which stays true if somebody drags
 * halfway and lets go.
 */
export function Carousel({ label, children }: { label: string; children: ReactNode[] }) {
  const track = useRef<HTMLUListElement>(null)
  const [current, setCurrent] = useState(0)

  return (
    <section aria-label={label}>
      <ul
        ref={track}
        onScroll={() => {
          const el = track.current
          if (!el) return
          const cards = [...el.children] as HTMLElement[]
          const middle = el.scrollLeft + el.clientWidth / 2
          let nearest = 0
          let best = Infinity
          cards.forEach((card, index) => {
            const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle)
            if (distance < best) {
              best = distance
              nearest = index
            }
          })
          setCurrent(nearest)
        }}
        // The negative margin and the matching padding let a card sit centred
        // in the viewport while the page keeps its gutters: without them the
        // first card is inset and the last one cannot reach the middle.
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4
                   pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, index) => (
          <li key={index} className="w-[86%] shrink-0 snap-center md:w-[320px]">
            {child}
          </li>
        ))}
      </ul>

      {children.length > 1 ? (
        <div aria-hidden className="mt-3 flex justify-center gap-1.5">
          {children.map((_, index) => (
            <span
              key={index}
              className={`h-1 rounded-full transition-all [transition-duration:200ms] ${
                index === current ? 'w-4 bg-accent' : 'w-1 bg-line-strong'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

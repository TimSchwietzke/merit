import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'

import { Sheet } from '@/components/ui/sheet'

/**
 * The facets, behind one control (DESIGN.md §10.11).
 *
 * Fourteen chips at the 44px floor is four wrapped rows and a quarter of a
 * 375px screen spent before the first result. This gives that space back for
 * one tap — on the condition §10.11 attaches to it: **the active count is on
 * the button**, so the state is still readable without opening anything. A
 * filter control that hides how many filters are on is the `select` that
 * section rejected wearing an icon.
 */
export function FilterButton({ active, children }: { active: number; children: ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={active > 0 ? t('common.filtersOpen', { count: active }) : t('common.filters')}
        className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3.5
                    font-mono text-2xs transition-colors [transition-duration:140ms]
                    active:[transition-duration:0ms]
                    ${
                      active > 0
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line text-ink-muted active:bg-surface-2'
                    }`}
      >
        <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
        {t('common.filters')}
        {active > 0 ? <span className="tabular-nums">{active}</span> : null}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('common.filters')}
        closeLabel={t('common.close')}
      >
        {children}
      </Sheet>
    </>
  )
}

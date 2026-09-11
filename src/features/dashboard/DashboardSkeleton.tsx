import { useTranslation } from 'react-i18next'

import { Loading, Skeleton } from '@/components/Skeleton'

/**
 * The dashboard's shape before its numbers arrive.
 *
 * It mirrors the real layout block for block, a date, a body, the asymmetric
 * grid, the sentence, because a placeholder that does not match the thing it
 * stands in for moves the page twice instead of not at all.
 */
export function DashboardSkeleton() {
  const { t } = useTranslation()

  return (
    <Loading label={t('common.loading')} className="flex flex-col">
      <Skeleton className="h-3 w-8" />
      <Skeleton className="mt-2 h-10 w-40" />

      {/* The body's own footprint: two figures side by side, 288px tall. */}
      <div className="mt-6 flex h-72 justify-center gap-1">
        <Skeleton className="h-full w-[38%] rounded-lg" />
        <Skeleton className="h-full w-[38%] rounded-lg" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Skeleton className="row-span-2 h-56 rounded-lg" />
        <Skeleton className="h-[104px] rounded-lg" />
        <Skeleton className="h-[104px] rounded-lg" />
        <Skeleton className="col-span-2 h-24 rounded-lg" />
      </div>

      <Skeleton className="mt-8 h-6 w-3/4" />
    </Loading>
  )
}

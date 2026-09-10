import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { ScreenTitle } from '@/components/ScreenTitle'

/**
 * Cardio has a tab before it has a screen (GOAL.md §2.2).
 *
 * The four tabs are the four things this app is for, and leaving one out until
 * its feature lands would move every other tab twice — once when it is added
 * and once in everybody's thumb memory. The place is real, the content is
 * honestly marked as not built, and the domain already owns its colour so the
 * screen looks like where it will be rather than like a mistake.
 */
export default function CardioPage() {
  const { t } = useTranslation()

  return (
    <>
      <ScreenTitle>{t('nav.cardio')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.cardio.planned')}</NotBuiltYet>
    </>
  )
}

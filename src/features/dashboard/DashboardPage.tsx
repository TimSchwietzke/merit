import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { ScreenTitle } from '@/components/ScreenTitle'

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <>
      <ScreenTitle>{t('nav.dashboard')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.dashboard.planned')}</NotBuiltYet>
    </>
  )
}

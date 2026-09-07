import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { PageHeader } from '@/components/PageHeader'

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.dashboard.title')} />
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.dashboard.planned')}</NotBuiltYet>
    </>
  )
}

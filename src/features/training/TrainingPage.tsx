import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { PageHeader } from '@/components/PageHeader'

export default function TrainingPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.training.title')} />
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.training.planned')}</NotBuiltYet>
    </>
  )
}

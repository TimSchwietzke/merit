import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { PageHeader } from '@/components/PageHeader'

export default function FoodPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.food.title')} />
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.food.planned')}</NotBuiltYet>
    </>
  )
}

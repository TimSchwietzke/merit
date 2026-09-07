import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { ScreenTitle } from '@/components/ScreenTitle'

export default function FoodPage() {
  const { t } = useTranslation()

  return (
    <>
      <ScreenTitle>{t('nav.food')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.food.planned')}</NotBuiltYet>
    </>
  )
}

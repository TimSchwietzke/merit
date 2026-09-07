import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { ScreenTitle } from '@/components/ScreenTitle'

export default function TrainingPage() {
  const { t } = useTranslation()

  return (
    <>
      <ScreenTitle>{t('nav.training')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.training.planned')}</NotBuiltYet>
    </>
  )
}

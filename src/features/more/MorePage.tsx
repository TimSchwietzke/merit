import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { PageHeader } from '@/components/PageHeader'

export default function MorePage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.more.title')} />
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.more.planned')}</NotBuiltYet>
    </>
  )
}

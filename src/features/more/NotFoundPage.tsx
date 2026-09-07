import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.notFound.title')} lead={t('pages.notFound.body')} />
      <Link
        to="/"
        className="font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        {t('pages.notFound.back')} →
      </Link>
    </>
  )
}

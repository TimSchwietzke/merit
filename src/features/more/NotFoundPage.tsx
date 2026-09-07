import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t('pages.notFound.title')} lead={t('pages.notFound.body')} />
      {/* `inline-flex min-h-11` rather than padding: §5.2 says the hit area
          grows, not the design. The text and its underline stay exactly where
          they were; the box around them reaches 44px. */}
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-mono text-2xs text-accent
                   underline decoration-1 underline-offset-2"
      >
        {t('pages.notFound.back')} →
      </Link>
    </>
  )
}

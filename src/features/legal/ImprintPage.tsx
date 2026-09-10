import { useTranslation } from 'react-i18next'

import { Document, LegalPage } from '@/features/legal/LegalPage'
import { IMPRINT } from '@/features/legal/documents'

/**
 * The imprint, § 5 DDG.
 *
 * merit is private and makes no money, and a *purely* private site is exempt —
 * but the exemption is read narrowly, `geschäftsmäßig` covers sustained activity
 * with or without profit, and this is also a portfolio piece, which is a
 * professional purpose. Having one that is not required costs nothing; the
 * reverse costs an Abmahnung.
 *
 * The text comes from `documents.ts` and is not written in this repository.
 */
export default function ImprintPage() {
  const { t } = useTranslation()

  return (
    <LegalPage title={t('pages.legal.imprint.title')} document={IMPRINT}>
      <Document document={IMPRINT} />
    </LegalPage>
  )
}

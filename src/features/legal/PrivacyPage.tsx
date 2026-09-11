import { useTranslation } from 'react-i18next'

import { Document, LegalPage } from '@/features/legal/LegalPage'
import { PRIVACY } from '@/features/legal/documents'

/**
 * The privacy notice, Art. 13 GDPR.
 *
 * The text comes from `documents.ts` and is not written in this repository:
 * see the note there. This file is the route and the rendering, which are the
 * parts that belong in code.
 */
export default function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <LegalPage title={t('pages.legal.privacy.title')} document={PRIVACY}>
      <Document document={PRIVACY} />
    </LegalPage>
  )
}

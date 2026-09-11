import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenTitle } from '@/components/ScreenTitle'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { buildExport, download } from '@/features/account/export'
import { forgetDevice } from '@/lib/offline/db'
import { supabase } from '@/lib/supabase'

/**
 * Articles 15, 17 and 20, as two buttons.
 *
 * A screen of its own under the account rather than a support address, because
 * the rights are the user's and a right somebody has to ask for is a right with
 * a gatekeeper. Both act immediately and neither needs anybody to be watching.
 *
 * Also why it is not a row on the account list beside `appearance`: the second
 * button deletes everything, and a destructive action one thumb-width from a
 * language toggle gets hit by accident (DESIGN.md §10.1).
 */
export default function DataPage() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null)
  const [failed, setFailed] = useState<'export' | 'delete' | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function exportData() {
    setBusy('export')
    setFailed(null)
    const file = await buildExport()
    setBusy(null)
    if (!file) {
      setFailed('export')
      return
    }
    download(file, `merit-${file.exportedAt.slice(0, 10)}.json`)
  }

  async function deleteAccount() {
    setBusy('delete')
    setFailed(null)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setBusy(null)
      setFailed('delete')
      return
    }
    // The row is gone; the session in this tab is not. Signing out clears it
    // and RequireAuth sends them to the sign-in screen.
    await forgetDevice()
    await supabase.auth.signOut()
  }

  return (
    <>
      <ScreenTitle>{t('nav.data')}</ScreenTitle>
      <div className="mt-8 flex flex-col gap-6">
        <div>
          <Button variant="quiet" pending={busy === 'export'} onClick={() => void exportData()}>
            {busy === 'export' ? t('pages.account.data.exporting') : t('pages.account.data.export')}
          </Button>
          {failed === 'export' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('pages.account.data.exportFailed')}
            </p>
          ) : null}
        </div>

        <div>
          <Button
            variant="quiet"
            className="text-danger hover:border-danger"
            pending={busy === 'delete'}
            onClick={() => setConfirming(true)}
          >
            {busy === 'delete' ? t('pages.account.data.deleting') : t('pages.account.data.delete')}
          </Button>
          <p className="mt-2 max-w-[62ch] font-mono text-2xs text-ink-faint">
            {t('pages.account.data.deleteHint')}
          </p>
          {failed === 'delete' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('pages.account.data.deleteFailed')}
            </p>
          ) : null}
        </div>
      </div>

      <Confirm
        open={confirming}
        onOpenChange={(open) => !open && setConfirming(false)}
        question={t('pages.account.data.deleteConfirm')}
        confirmLabel={t('pages.account.data.deleteConfirmLabel')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void deleteAccount()}
      />
    </>
  )
}

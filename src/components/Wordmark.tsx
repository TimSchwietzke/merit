import { useTranslation } from 'react-i18next'

/**
 * `merit`, lowercase, everywhere it renders (DESIGN.md §4.4). Sans, text-lg,
 * weight 600 (§4.2, §4.3) — one component so the sidebar and the sign-in screen
 * cannot drift into two different treatments of the same name.
 *
 * The only places the name is capitalised are the manifest, the <title> and
 * legal text, where it is a proper noun in someone else's sentence rather than
 * a piece of this interface.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={`text-lg font-semibold tracking-tight ${className}`}>{t('app.name')}</span>
  )
}

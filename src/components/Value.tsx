/** A number with its unit. Tabular so it does not jitter as it changes. */
export function Value({
  n,
  unit,
  size = 'base',
}: {
  n: string
  unit?: string
  size?: 'base' | 'lg' | 'xl'
}) {
  const cls = { base: 'text-base', lg: 'text-lg', xl: 'text-3xl' }[size]
  return (
    <span className="font-mono tabular-nums">
      <span className={`${cls} text-ink`}>{n}</span>
      {unit ? <span className="ml-1 text-2xs text-ink-faint">{unit}</span> : null}
    </span>
  )
}

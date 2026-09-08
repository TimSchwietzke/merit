import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasValidCheckDigit } from '@/lib/barcode'

/**
 * The scanner viewport (DESIGN.md §10.10): the camera feed in a `surface-2`
 * frame, one centred reticle in `line-strong`, one mono line of instruction.
 * No overlay animation and no scanning laser.
 *
 * Decoding is ZXing rather than the platform's `BarcodeDetector`. The native
 * API is not in Safari, and Merit is used on iPhones — so the native path was
 * a decoder that worked for nobody who actually uses this app, plus a second
 * code path neither of us could test. One decoder, everywhere.
 *
 * It still falls through to typing the number **in place** rather than on
 * another screen: a phone can refuse camera access, and a barcode can be
 * scuffed past reading.
 */

/** The 1D symbologies on food packaging. Narrowing them speeds up every frame. */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]

type CameraState = 'starting' | 'running' | 'denied'

export function BarcodeScanner({ onCode, busy }: { onCode: (code: string) => void; busy: boolean }) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = useState<CameraState>('starting')
  // Bumped to ask for the camera again after a refusal, which needs a fresh
  // user gesture on iOS.
  const [attempt, setAttempt] = useState(0)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | null>(null)

  // The callback is read through a ref so a re-render never restarts the camera.
  const onCodeRef = useRef(onCode)
  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    let controls: IScannerControls | null = null
    let stopped = false

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 })

    async function start() {
      try {
        controls = await reader.decodeFromConstraints(
          // The camera on the back of the phone, which is the one pointing at
          // the packet. `ideal` rather than `exact`: a laptop has one camera
          // and `exact` fails outright there.
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current as HTMLVideoElement,
          (result) => {
            if (stopped || !result) return
            // A misread is far more likely than a code with a valid check
            // digit, so this is the filter that keeps a wrong product off the
            // screen.
            const code = result.getText()
            if (hasValidCheckDigit(code)) onCodeRef.current(code)
          },
        )
        if (stopped) controls.stop()
        else setCamera('running')
      } catch {
        // No permission, no camera, or an insecure origin. All of them mean
        // the same thing to the person holding the phone.
        if (!stopped) setCamera('denied')
      }
    }

    void start()

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [attempt])

  const retry = useCallback(() => {
    setCamera('starting')
    setAttempt((n) => n + 1)
  }, [])

  function submitTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = typed.trim()
    if (!hasValidCheckDigit(code)) {
      setTypedError(t('pages.food.scan.barcodeInvalid'))
      return
    }
    setTypedError(null)
    onCode(code)
  }

  return (
    <div className="flex flex-col gap-6">
      {camera === 'denied' ? (
        <div>
          <p className="text-sm text-ink-muted">{t('pages.food.scan.denied')}</p>
          <Button variant="quiet" className="mt-3" onClick={retry}>
            {t('pages.food.scan.retry')}
          </Button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          <video
            ref={videoRef}
            // Both are load-bearing on iOS: without `playsinline` Safari takes
            // the video fullscreen, and an unmuted stream will not autoplay.
            playsInline
            muted
            aria-label={t('pages.food.scan.viewport')}
            className="aspect-[4/3] w-full object-cover"
          />
          {/* One reticle, drawn in line-strong. Nothing sweeps across it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 rounded-sm border-2 border-line-strong"
          />
        </div>
      )}

      {camera !== 'denied' ? (
        <p className="font-mono text-2xs text-ink-faint">
          {t(
            busy
              ? 'pages.food.scan.looking'
              : camera === 'starting'
                ? 'pages.food.scan.starting'
                : 'pages.food.scan.instruction',
          )}
        </p>
      ) : null}

      {/* In place, not on another screen (§10.10). */}
      <form onSubmit={submitTyped} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="barcode">{t('pages.food.scan.barcode')}</Label>
        <div className="flex gap-2">
          <Input
            id="barcode"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="font-mono tabular-nums"
            aria-invalid={typedError ? true : undefined}
          />
          <Button type="submit" variant="quiet" pending={busy}>
            {t('pages.food.scan.look')}
          </Button>
        </div>
        {typedError ? (
          <p role="alert" className="text-sm text-danger">
            {typedError}
          </p>
        ) : null}
      </form>
    </div>
  )
}

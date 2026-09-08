import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasValidCheckDigit } from '@/lib/barcode'

/**
 * The scanner viewport (DESIGN.md §10.10): the camera feed in a `surface-2`
 * frame, one centred reticle in `line-strong`, one mono line of instruction.
 * No overlay animation and no scanning laser.
 *
 * It falls through to typing the number **in place** rather than on another
 * screen — which is also the only path on a browser without `BarcodeDetector`
 * (Safari, Firefox), and on a phone where camera permission was refused. The
 * state says which of those it is rather than showing a dead black rectangle.
 *
 * `BarcodeDetector` is the platform's own decoder, so no library is shipped for
 * this. Where it is missing the typed field is the whole feature; if the people
 * actually testing Merit are on iPhones, a decoder like `@zxing/browser` goes
 * in here behind the same interface.
 */

interface DetectedBarcode {
  rawValue: string
}

interface Detector {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}

type DetectorConstructor = new (options?: { formats?: string[] }) => Detector

/** The 1D symbologies on food packaging. QR and the 2D formats are not. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']

const detectorSupported = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window

type CameraState = 'starting' | 'running' | 'unsupported' | 'denied'

export function BarcodeScanner({ onCode, busy }: { onCode: (code: string) => void; busy: boolean }) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  // Read once per mount: whether the browser has a decoder does not change
  // while the screen is open, and it decides whether the camera starts at all.
  const [supported] = useState(detectorSupported)
  const [camera, setCamera] = useState<CameraState>(supported ? 'starting' : 'unsupported')
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | null>(null)

  // The scan callback is read through a ref so restarting the camera is not one
  // of the things a re-render can do.
  const onCodeRef = useRef(onCode)
  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    if (!supported) return

    let stream: MediaStream | null = null
    let frame = 0
    let stopped = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // The camera on the back of the phone, which is the one pointing at
          // the packet.
          video: { facingMode: { ideal: 'environment' } },
        })
        if (stopped) return

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCamera('running')

        const Ctor = (window as unknown as { BarcodeDetector: DetectorConstructor }).BarcodeDetector
        const detector = new Ctor({ formats: FORMATS })

        // Polled rather than run per frame: decoding at 60fps heats a phone up
        // for no extra hit rate.
        const tick = async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) return
          try {
            const codes = await detector.detect(videoRef.current)
            const hit = codes.find((code) => hasValidCheckDigit(code.rawValue))
            if (hit && !stopped) onCodeRef.current(hit.rawValue)
          } catch {
            // A frame that cannot be decoded is the normal case, not an error.
          }
        }

        frame = window.setInterval(() => void tick(), 250)
      } catch {
        if (!stopped) setCamera('denied')
      }
    }

    void start()

    return () => {
      stopped = true
      window.clearInterval(frame)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [supported])

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
      {camera === 'unsupported' || camera === 'denied' ? (
        <p className="font-mono text-2xs text-ink-faint">
          {t(camera === 'denied' ? 'pages.food.scan.denied' : 'pages.food.scan.unsupported')}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          <video
            ref={videoRef}
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

      {camera === 'starting' || camera === 'running' ? (
        <p className="font-mono text-2xs text-ink-faint">
          {t(busy ? 'pages.food.scan.looking' : 'pages.food.scan.instruction')}
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

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Flashlight, FlashlightOff } from 'lucide-react'

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

/**
 * The camera Merit asks for. 1280x720 rather than whatever the phone defaults
 * to: a barcode is thin parallel lines, and at 640x480 the bars on a small
 * package fall below one pixel each and stop being readable at arm's length.
 * All `ideal`, so a device that cannot manage it degrades instead of failing.
 */
const VIDEO: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1280 },
  height: { ideal: 720 },
}

/** The 1D symbologies on food packaging. Narrowing them speeds up every frame. */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]

type CameraState = 'starting' | 'running' | 'denied'

/**
 * The torch, where the camera has one.
 *
 * `torch` is not in the TypeScript DOM types and not in every browser — it is
 * still a draft — so it is read off the track's own capabilities and the button
 * only exists where the answer is yes. A toggle that does nothing is worse than
 * no toggle: in a dark aisle it reads as the app being broken rather than as
 * the phone not offering it.
 */
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type TorchConstraint = MediaTrackConstraintSet & { torch?: boolean }

function hasTorch(track: MediaStreamTrack | null): boolean {
  const capabilities = (track?.getCapabilities?.() ?? {}) as TorchCapabilities
  return capabilities.torch === true
}

export function BarcodeScanner({ onCode, busy }: { onCode: (code: string) => void; busy: boolean }) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = useState<CameraState>('starting')
  // Bumped to ask for the camera again after a refusal, which needs a fresh
  // user gesture on iOS.
  const [attempt, setAttempt] = useState(0)
  const [torch, setTorch] = useState<'unavailable' | 'off' | 'on'>('unavailable')
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | null>(null)

  // Merit opens the camera itself and hands ZXing the element, rather than
  // letting `decodeFromConstraints` open it. The stream is then ours to hold:
  // the torch lives on its track, and reading the track back off the video
  // element does not survive ZXing stopping a previous scanner and clearing
  // `srcObject` out from under it.
  const trackRef = useRef<MediaStreamTrack | null>(null)

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
    // Without this the 1D readers only sample a few horizontal lines through
    // the middle of the frame, so a barcode that is slightly high, low or
    // tilted never reads — which looks exactly like a camera that is not
    // scanning at all. It costs frames; a phone held over a packet has them.
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 })

    let stream: MediaStream | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO })
        if (stopped) return

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        trackRef.current = stream.getVideoTracks()[0] ?? null
        // Safari will not start a stream it was merely handed, and a paused
        // video decodes nothing while showing a picture — which is the exact
        // shape of "the camera works but it never scans".
        video.playsInline = true
        video.muted = true
        await video.play()

        controls = await reader.decodeFromVideoElement(
          video,
          (result) => {
            if (stopped || !result) return
            // No check-digit filter here. ZXing's 1D readers validate the
            // checksum themselves before returning a result, so this would only
            // ever reject something they had already accepted — and it does:
            // a UPC-E check digit is computed over the expanded twelve-digit
            // form, not over the eight digits that come back, so every UPC-E
            // read was being dropped in silence. The typed field keeps the
            // check, where nothing else is validating.
            onCodeRef.current(result.getText())
          },
        )
        if (stopped) {
          controls.stop()
          return
        }
        setCamera('running')
        if (hasTorch(trackRef.current)) setTorch('off')
      } catch {
        // No permission, no camera, or an insecure origin. All of them mean
        // the same thing to the person holding the phone.
        if (!stopped) setCamera('denied')
      }
    }

    void start()

    return () => {
      stopped = true
      setTorch('unavailable')
      controls?.stop()
      // Ours to open, so ours to close. Without this the camera light on the
      // phone stays on after leaving the screen.
      stream?.getTracks().forEach((track) => track.stop())
      trackRef.current = null
    }
  }, [attempt])

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current
    if (!track) return
    const next = torch !== 'on'
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraint] })
      setTorch(next ? 'on' : 'off')
    } catch {
      // The capability was advertised and the constraint was refused anyway.
      // Drop the control rather than leaving a button that lies.
      setTorch('unavailable')
    }
  }, [torch])

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
        // The instruction line, and the torch beside it rather than floating
        // over the feed: §10.10 wants the viewport carrying a reticle and
        // nothing else.
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 font-mono text-2xs text-ink-faint">
            {t(
              busy
                ? 'pages.food.scan.looking'
                : camera === 'starting'
                  ? 'pages.food.scan.starting'
                  : 'pages.food.scan.instruction',
            )}
          </p>

          {torch === 'unavailable' ? null : (
            <Button
              variant="bare"
              size="icon"
              // The label says what the tap will do, and `aria-pressed` says
              // which way the toggle currently sits.
              aria-label={t(torch === 'on' ? 'pages.food.scan.torchOff' : 'pages.food.scan.torchOn')}
              aria-pressed={torch === 'on'}
              className={torch === 'on' ? 'text-accent' : undefined}
              onClick={() => void toggleTorch()}
            >
              {torch === 'on' ? <Flashlight /> : <FlashlightOff />}
            </Button>
          )}
        </div>
      ) : null}

      {/* In place, not on another screen (§10.10) — but plainly the other way
          of doing this, not the button that works the camera. Without the rule
          and the word on it, a field with a button beside it sitting under a
          viewport reads as "press here to scan". */}
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-2xs text-ink-faint">{t('pages.food.scan.or')}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

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
          {/* Disabled while empty: pressing it then answered "that is not a
              barcode", which is a strange thing to say about nothing. */}
          <Button type="submit" variant="quiet" pending={busy} disabled={typed.trim() === ''}>
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

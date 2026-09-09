import { writeFileSync } from 'node:fs'

/**
 * An EAN-13 rendered into a raw video file, so Chromium can be handed it as a
 * fake camera (`--use-file-for-fake-video-capture`).
 *
 * This exists because the synthetic camera Chromium generates on its own is a
 * rolling colour pattern: it proves the video element is live and nothing else.
 * The one question worth asking of the scanner is whether a barcode held in
 * front of it turns into a logged food, and that needs a barcode in the frame.
 *
 * ZXing ships no EAN writer — only the 2D ones — so the symbol is encoded here.
 * It is a table lookup: 95 modules, `101` and `101` at the ends, `01010` down
 * the middle, and the parity of the first six digits encoding the digit the
 * symbol does not draw.
 */

const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011']
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111']
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100']

/** Which of the first six digits use G rather than L, per leading digit. */
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL']

/** The 95-module bar pattern for a 13-digit code, as '0' and '1'. */
export function encodeEan13(code: string): string {
  if (!/^\d{13}$/.test(code)) throw new Error(`not an EAN-13: ${code}`)
  const digits = [...code].map(Number)
  const parity = PARITY[digits[0]]

  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity[index] === 'L' ? L : G)[digit])
    .join('')
  const right = digits.slice(7).map((digit) => R[digit]).join('')

  return `101${left}01010${right}101`
}

const WIDTH = 640
const HEIGHT = 480

/**
 * A YUV4MPEG2 file of one still frame repeated. I420: a full-size luma plane
 * and two quarter-size chroma planes held at neutral, which is grey — the
 * symbol lives entirely in luma, which is what a barcode reader looks at.
 */
export function writeBarcodeVideo(path: string, code: string, frames = 50): void {
  const pattern = encodeEan13(code)
  const scale = 4
  const barsWide = pattern.length * scale
  const barsTall = 200
  const originX = Math.floor((WIDTH - barsWide) / 2)
  const originY = Math.floor((HEIGHT - barsTall) / 2)

  // Paper white rather than 255: a real camera never sees a pure white page,
  // and the binarizer is happier with something it has to threshold.
  const luma = new Uint8Array(WIDTH * HEIGHT).fill(220)
  for (let x = 0; x < barsWide; x += 1) {
    if (pattern[Math.floor(x / scale)] !== '1') continue
    for (let y = 0; y < barsTall; y += 1) {
      luma[(originY + y) * WIDTH + originX + x] = 20
    }
  }

  const chroma = new Uint8Array((WIDTH / 2) * (HEIGHT / 2)).fill(128)
  const frame = Buffer.concat([
    Buffer.from('FRAME\n'),
    Buffer.from(luma),
    Buffer.from(chroma),
    Buffer.from(chroma),
  ])

  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F25:1 Ip A1:1 C420jpeg\n`),
      ...Array<Buffer>(frames).fill(frame),
    ]),
  )
}

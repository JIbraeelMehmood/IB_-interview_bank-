/** Generate the PWA icons from the SVG mark, with no image dependencies. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const OUT = 'public/icons'
mkdirSync(OUT, { recursive: true })

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Write an RGBA PNG. `draw(x, y)` returns [r, g, b, a]. */
function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
      raw[p++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BRAND = [0x1d, 0x5c, 0x48]
const CARD = [0xff, 0xff, 0xff]
const HL = [0xf4, 0xd8, 0x3d]

/** Rounded-rect test in unit space. */
const inRounded = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1e-9
}

/** `maskable` insets the art so a circle mask cannot clip it. */
function draw({ maskable }) {
  return (px, py, size) => {
    const u = (v) => (v / size) * 100
    const s = maskable ? 0.72 : 0.94 // art scale
    const off = (100 - 100 * s) / 2
    const X = u(px) / s - off
    const Y = u(py) / s - off
    const W = 100

    // Background: brand, full bleed for maskable, rounded for others.
    if (maskable) return [...BRAND, 255]
    if (!inRounded(u(px), u(py), 0, 0, W, W, 22)) return [0, 0, 0, 0]

    // Card body.
    if (inRounded(X, Y, 22, 32, 78, 80, 6)) {
      // Highlight corner.
      if (inRounded(X, Y, 74, 18, 86, 30, 5)) return [...HL, 255]
      // Handle.
      if (inRounded(X, Y, 34, 22, 66, 36, 7)) return [...CARD, 255]
      // Text lines.
      if (Y > 46 && Y < 51 && X > 34 && X < 66) return [...BRAND, 255]
      if (Y > 58 && Y < 63 && X > 34 && X < 54) return [...BRAND, 255]
      return [...CARD, 255]
    }
    return [...BRAND, 255]
  }
}

for (const size of [192, 512]) {
  writeFileSync(`${OUT}/icon-${size}.png`, png(size, draw({ maskable: false })))
  console.log(`icon-${size}.png`)
}
writeFileSync(`${OUT}/maskable-512.png`, png(512, draw({ maskable: true })))
console.log('maskable-512.png')

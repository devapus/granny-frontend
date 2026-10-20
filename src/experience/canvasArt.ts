import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { initials, preview } from '../lib/format'
import type { PublicTribute } from '../lib/api/schemas'

/** Generated art for the 3D scene: wood grain, placeholder portrait, plaque faces, wall labels. */

const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
const SANS = '"Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif'

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return { canvas, ctx }
}

export function canvasTexture(canvas: HTMLCanvasElement) {
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Resolves when web fonts are ready (or immediately when the API is missing). */
export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('600 40px "Cormorant Garamond"'),
      document.fonts.load('500 20px "Source Sans 3"'),
    ])
    await document.fonts.ready
  } catch {
    /* fall back to system fonts */
  }
}

// ------------------------------------------------------------------ wood

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)))
  const r = c((n >> 16) & 255)
  const g = c((n >> 8) & 255)
  const b = c(n & 255)
  return `rgb(${r},${g},${b})`
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function makeWoodTexture(base: string, planks = 6, seed = 7): Texture {
  const { canvas, ctx } = makeCanvas(512, 512)
  const rnd = seeded(seed)
  const pw = 512 / planks
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = shade(base, (rnd() - 0.5) * 26)
    ctx.fillRect(i * pw, 0, pw, 512)
    // grain
    for (let g = 0; g < 26; g++) {
      ctx.strokeStyle = shade(base, (rnd() - 0.5) * 46)
      ctx.globalAlpha = 0.18 + rnd() * 0.18
      ctx.lineWidth = 0.6 + rnd() * 1.2
      const x = i * pw + rnd() * pw
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + (rnd() - 0.5) * 8, 170, x + (rnd() - 0.5) * 8, 340, x + (rnd() - 0.5) * 6, 512)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(40,28,16,0.35)'
    ctx.fillRect(i * pw, 0, 1.5, 512)
  }
  const tex = canvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

// ------------------------------------------------------------------ text helpers

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) {
        lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/[\s,.;:!?-]+$/, '')}…`
        return lines
      }
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function coverDraw(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height
  const r = w / h
  let sw = img.width
  let sh = img.height
  let sx = 0
  let sy = 0
  if (ir > r) {
    sw = img.height * r
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / r
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// ------------------------------------------------------------------ portrait placeholder

export function drawPortraitPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, name: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#efe5d0')
  g.addColorStop(0.6, '#e5d8bd')
  g.addColorStop(1, '#d3c2a0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, w * 0.62)
  glow.addColorStop(0, 'rgba(251,246,234,0.95)')
  glow.addColorStop(1, 'rgba(251,246,234,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(185,167,129,0.4)'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.83)
  ctx.bezierCurveTo(w * 0.18, h * 0.76, w * 0.5, h * 0.78, w * 0.7, h * 0.79)
  ctx.bezierCurveTo(w * 0.85, h * 0.8, w * 0.95, h * 0.76, w, h * 0.74)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fill()
  ctx.fillStyle = 'rgba(143,123,87,0.3)'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.9)
  ctx.bezierCurveTo(w * 0.2, h * 0.86, w * 0.5, h * 0.88, w * 0.7, h * 0.89)
  ctx.lineTo(w, h * 0.88)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.fill()

  // sprig
  ctx.strokeStyle = 'rgba(124,106,71,0.75)'
  ctx.lineWidth = w * 0.006
  ctx.beginPath()
  ctx.moveTo(w * 0.78, h * 0.9)
  ctx.quadraticCurveTo(w * 0.73, h * 0.68, w * 0.8, h * 0.52)
  ctx.stroke()
  ctx.fillStyle = 'rgba(167,163,127,0.6)'
  for (let i = 0; i < 4; i++) {
    const y = h * (0.84 - i * 0.075)
    const x = w * (0.76 + i * 0.008)
    const dir = i % 2 === 0 ? -1 : 1
    ctx.beginPath()
    ctx.ellipse(x + dir * w * 0.04, y, w * 0.045, w * 0.017, dir * -0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // cameo
  const cx = w / 2
  const cy = h * 0.45
  const r = w * 0.185
  ctx.fillStyle = 'rgba(251,246,234,0.75)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c4aa78'
  ctx.lineWidth = w * 0.004
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.89, 0, Math.PI * 2)
  ctx.globalAlpha = 0.6
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#5e4630'
  ctx.font = `600 ${w * 0.13}px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials(name), cx, cy + w * 0.008)
}

export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  name: string,
  image: (CanvasImageSource & { width: number; height: number }) | null,
) {
  if (image) coverDraw(ctx, image, 0, 0, w, h)
  else drawPortraitPlaceholder(ctx, w, h, name)
}

// ------------------------------------------------------------------ plaque

export const PLAQUE_W = 560
export const PLAQUE_H = 760

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Plaque face: photo (or monogram placeholder), name, relationship, preview, "Read more". */
export function drawPlaque(
  ctx: CanvasRenderingContext2D,
  tribute: PublicTribute | null,
  photo: (CanvasImageSource & { width: number; height: number }) | null,
  emptyText = 'Be the first to leave a tribute',
) {
  const w = PLAQUE_W
  const h = PLAQUE_H
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#fbf7ee')
  bg.addColorStop(1, '#f1e9d8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#c4aa78'
  ctx.lineWidth = 3
  ctx.strokeRect(14, 14, w - 28, h - 28)
  ctx.lineWidth = 1
  ctx.strokeRect(22, 22, w - 44, h - 44)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  if (!tribute) {
    ctx.fillStyle = '#6b4f2c'
    ctx.font = `italic 500 40px ${SERIF}`
    const lines = wrapLines(ctx, emptyText, w - 140, 4)
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 - 30 + i * 52))
    return
  }

  // photo
  const pw = 250
  const px = (w - pw) / 2
  const py = 58
  ctx.save()
  roundRect(ctx, px, py, pw, pw, 125)
  ctx.clip()
  if (photo) {
    coverDraw(ctx, photo, px, py, pw, pw)
  } else {
    const pg = ctx.createLinearGradient(px, py, px, py + pw)
    pg.addColorStop(0, '#eadfc6')
    pg.addColorStop(1, '#d4c3a1')
    ctx.fillStyle = pg
    ctx.fillRect(px, py, pw, pw)
    ctx.fillStyle = '#5e4630'
    ctx.font = `600 96px ${SERIF}`
    ctx.textBaseline = 'middle'
    ctx.fillText(initials(tribute.fullName), w / 2, py + pw / 2 + 4)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  ctx.strokeStyle = '#c4aa78'
  ctx.lineWidth = 3
  roundRect(ctx, px, py, pw, pw, 125)
  ctx.stroke()

  // name
  ctx.fillStyle = '#3a2b1d'
  ctx.font = `700 46px ${SERIF}`
  const nameLines = wrapLines(ctx, tribute.fullName, w - 110, 2)
  let y = py + pw + 62
  nameLines.forEach((l) => {
    ctx.fillText(l, w / 2, y)
    y += 48
  })

  // relationship
  ctx.fillStyle = '#6b4f2c'
  ctx.font = `600 20px ${SANS}`
  const rel = tribute.relationshipLabel.toUpperCase()
  const relLine = wrapLines(ctx, rel, w - 120, 1)[0] ?? ''
  ctx.fillText(relLine.split('').join('\u200A'), w / 2, y - 14)

  // rule
  y += 8
  ctx.strokeStyle = '#c4aa78'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(w / 2 - 60, y)
  ctx.lineTo(w / 2 + 60, y)
  ctx.stroke()
  y += 38

  // preview
  ctx.fillStyle = '#463a2e'
  ctx.font = `400 25px ${SANS}`
  ctx.textAlign = 'center'
  const maxPreviewLines = Math.max(2, Math.floor((h - y - 120) / 36))
  const lines = wrapLines(ctx, `“${preview(tribute.tributeText, 220)}”`, w - 120, maxPreviewLines)
  lines.forEach((l, i) => ctx.fillText(l, w / 2, y + i * 36))

  // read more pill
  const bw = 210
  const bh = 52
  const bx = (w - bw) / 2
  const by = h - 112
  ctx.fillStyle = '#5e4630'
  roundRect(ctx, bx, by, bw, bh, 26)
  ctx.fill()
  ctx.fillStyle = '#fbf8f2'
  ctx.font = `600 22px ${SANS}`
  ctx.textBaseline = 'middle'
  ctx.fillText('Read more  →', w / 2, by + bh / 2 + 1)
}

// ------------------------------------------------------------------ labels

export const LABEL_W = 1024
export const LABEL_H = 256

export function drawWallLabel(ctx: CanvasRenderingContext2D, title: string, subtitle: string) {
  ctx.clearRect(0, 0, LABEL_W, LABEL_H)
  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H)
  g.addColorStop(0, '#6a4f33')
  g.addColorStop(1, '#4e3823')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LABEL_W, LABEL_H)
  ctx.strokeStyle = '#d9c28f'
  ctx.lineWidth = 3
  ctx.strokeRect(12, 12, LABEL_W - 24, LABEL_H - 24)
  ctx.fillStyle = '#f3e7c9'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 98px ${SERIF}`
  const t = wrapLines(ctx, title, LABEL_W - 120, 1)[0] ?? ''
  ctx.fillText(t, LABEL_W / 2, 140)
  ctx.fillStyle = '#d9c28f'
  ctx.font = `600 30px ${SANS}`
  ctx.fillText(subtitle.toUpperCase().split('').join('\u200A'), LABEL_W / 2, 200)
}

export function loadImage(url: string, signal: { cancelled: boolean }): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(signal.cancelled ? null : img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

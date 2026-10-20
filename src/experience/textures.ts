import { useEffect, useState } from 'react'
import type { Texture } from 'three'
import type { PublicTribute } from '../lib/api/schemas'
import { tributePhoto } from '../lib/format'
import {
  LABEL_H,
  LABEL_W,
  PLAQUE_H,
  PLAQUE_W,
  canvasTexture,
  drawPlaque,
  drawPortrait,
  drawWallLabel,
  fontsReady,
  loadImage,
  makeCanvas,
  makeWoodTexture,
} from './canvasArt'

// ------------------------------------------------------------------ shared wood textures
const woodCache = new Map<string, Texture>()

/** Cached procedural wood. Call `disposeSharedTextures()` when the scene unmounts. */
export function getWood(base: string, repeatX = 1, repeatY = 1, planks = 6, seed = 7): Texture {
  const key = `${base}|${repeatX}|${repeatY}|${planks}|${seed}`
  let tex = woodCache.get(key)
  if (!tex) {
    tex = makeWoodTexture(base, planks, seed)
    tex.repeat.set(repeatX, repeatY)
    woodCache.set(key, tex)
  }
  return tex
}

export function disposeSharedTextures() {
  woodCache.forEach((t) => t.dispose())
  woodCache.clear()
}

// ------------------------------------------------------------------ drawn textures
function useCanvasArt(w: number, h: number) {
  const [art] = useState(() => {
    const { canvas, ctx } = makeCanvas(w, h)
    return { canvas, ctx, tex: canvasTexture(canvas) }
  })
  // Textures are created by hand (not through JSX), so they must be disposed by hand.
  useEffect(() => () => art.tex.dispose(), [art])
  return art
}

/** Plaque face texture for a tribute (or an empty-wall invitation when `tribute` is null). */
export function usePlaqueTexture(tribute: PublicTribute | null) {
  const art = useCanvasArt(PLAQUE_W, PLAQUE_H)
  useEffect(() => {
    const flag = { cancelled: false }
    let photo: HTMLImageElement | null = null
    const redraw = () => {
      if (flag.cancelled) return
      drawPlaque(art.ctx, tribute, photo)
      art.tex.needsUpdate = true
    }
    redraw()
    void fontsReady().then(redraw)
    const url = tribute ? tributePhoto(tribute)?.url : null
    if (url) {
      void loadImage(url, flag).then((img) => {
        photo = img
        redraw()
      })
    }
    return () => {
      flag.cancelled = true
    }
  }, [tribute, art])
  return art.tex
}

/** Portrait texture: real photo when a URL loads, otherwise generated placeholder art. */
export function usePortraitTexture(name: string, url: string | null) {
  const art = useCanvasArt(768, 960)
  useEffect(() => {
    const flag = { cancelled: false }
    let img: HTMLImageElement | null = null
    const redraw = () => {
      if (flag.cancelled) return
      drawPortrait(art.ctx, 768, 960, name, img)
      art.tex.needsUpdate = true
    }
    redraw()
    void fontsReady().then(redraw)
    if (url) {
      void loadImage(url, flag).then((loaded) => {
        img = loaded
        redraw()
      })
    }
    return () => {
      flag.cancelled = true
    }
  }, [name, url, art])
  return art.tex
}

export function useLabelTexture(title: string, subtitle: string) {
  const art = useCanvasArt(LABEL_W, LABEL_H)
  useEffect(() => {
    let cancelled = false
    const redraw = () => {
      if (cancelled) return
      drawWallLabel(art.ctx, title, subtitle)
      art.tex.needsUpdate = true
    }
    redraw()
    void fontsReady().then(redraw)
    return () => {
      cancelled = true
    }
  }, [title, subtitle, art])
  return art.tex
}

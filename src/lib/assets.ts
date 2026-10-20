import { z } from 'zod'

/**
 * Optional family-supplied assets. Files go in `public/assets/` and are referenced by
 * `public/assets/manifest.json`. Every field is optional; missing/invalid files fall back to the
 * generated placeholder art. See `public/assets/README.md`.
 */
const manifestSchema = z.object({
  portrait: z.string().nullish(),
  portraitAlt: z.string().nullish(),
})
export type AssetManifest = z.infer<typeof manifestSchema>

const EMPTY: AssetManifest = {}

function assetUrl(file: string | null | undefined) {
  if (!file) return null
  if (/^https?:\/\//.test(file)) return file
  return `/assets/${file.replace(/^\/+/, '').replace(/^assets\//, '')}`
}

export async function loadAssetManifest(signal?: AbortSignal): Promise<AssetManifest> {
  try {
    const res = await fetch('/assets/manifest.json', { signal, cache: 'no-cache' })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return EMPTY
    const parsed = manifestSchema.safeParse(await res.json())
    if (!parsed.success) return EMPTY
    return {
      portrait: assetUrl(parsed.data.portrait),
      portraitAlt: parsed.data.portraitAlt,
    }
  } catch {
    return EMPTY
  }
}

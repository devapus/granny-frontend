import { useState } from 'react'
import { useAssetManifest, useConfig } from '../lib/queries'
import { PortraitArt } from './PortraitArt'

/** Portrait source priority: portrait set in admin config → public/assets/manifest.json → generated art. */
export function usePortraitSource() {
  const { data: config } = useConfig()
  const { data: manifest } = useAssetManifest()
  const name = config?.grandmotherDisplayName ?? 'Grandmother'
  const url = config?.portrait?.url || manifest?.portrait || null
  const alt =
    config?.portrait?.url && config.portrait.altText
      ? config.portrait.altText
      : (manifest?.portraitAlt ?? `Portrait of ${name}`)
  return { url, alt, name }
}

export function Portrait({ className = '' }: { className?: string }) {
  const { url, alt, name } = usePortraitSource()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const usable = url && url !== failedUrl
  return (
    <div className={`arch overflow-hidden border border-champagne-500/70 bg-ivory-200 shadow-lg ${className}`}>
      {usable ? (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <PortraitArt name={name} className="h-full w-full" />
      )}
    </div>
  )
}

import { Link } from 'react-router'
import { ArrowRight, Images, MessageSquareHeart, ScrollText } from 'lucide-react'
import { Portrait } from '../components/Portrait'
import { TributeCard } from '../components/TributeCard'
import { TributeReader } from '../components/TributeReader'
import { useTributeReader } from '../components/useTributeReader'
import { ErrorNotice } from '../components/ui/States'
import { useConfig } from '../lib/queries'

export default function HomePage() {
  const config = useConfig()
  const featured = config.data?.featuredMemories
  const reader = useTributeReader(featured)
  const name = config.data?.grandmotherDisplayName

  return (
    <>
      <section aria-labelledby="home-title" className="container-page grid items-center gap-12 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-24">
        <div className="rise-in">
          <p className="eyebrow mb-5">In loving memory{name ? ` of ${name}` : ''}</p>
          <h1 id="home-title" className="text-[length:var(--fs-3xl)]">
            {config.data?.memorialTitle ?? 'House of Memories'}
          </h1>
          <div className="mt-7 max-w-xl">
            {config.isPending ? (
              <div className="skeleton h-24" role="status" aria-label="Loading introduction" />
            ) : config.isError ? null : (
              <p className="prose-memorial font-serif text-[1.35rem] leading-relaxed italic">
                {config.data?.introductoryMessage}
              </p>
            )}
          </div>
          {config.isError && (
            <div className="mt-6 max-w-xl">
              <ErrorNotice
                title="The memorial details could not be loaded."
                error={config.error}
                onRetry={() => void config.refetch()}
              />
            </div>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/experience" className="btn btn-primary">
              Enter the house <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/tributes" className="btn btn-secondary">
              Read tributes
            </Link>
            <Link to="/gallery" className="btn btn-quiet">
              View the gallery
            </Link>
          </div>
          <p className="field-hint mt-5 max-w-md">
            The house is a gentle 3D walk-through. Prefer something simpler? Every tribute is also available as
            plain, accessible pages.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm rise-in" style={{ animationDelay: '120ms' }}>
          <Portrait className="aspect-[4/5]" />
        </div>
      </section>

      <section aria-labelledby="ways-title" className="container-page py-8">
        <h2 id="ways-title" className="sr-only">
          Ways to remember
        </h2>
        <ul className="grid gap-5 md:grid-cols-3">
          <li>
            <Link to="/tributes" className="card group block h-full p-7 no-underline transition-shadow hover:shadow-md">
              <ScrollText className="text-bronze-500" size={26} aria-hidden="true" />
              <span className="mt-4 block font-serif text-2xl text-wood-900">Read the tributes</span>
              <span className="mt-2 block text-ink-soft">
                Words from children, grandchildren, friends and neighbours, gathered by how they knew her.
              </span>
            </Link>
          </li>
          <li>
            <Link to="/gallery" className="card group block h-full p-7 no-underline transition-shadow hover:shadow-md">
              <Images className="text-bronze-500" size={26} aria-hidden="true" />
              <span className="mt-4 block font-serif text-2xl text-wood-900">Look through photographs</span>
              <span className="mt-2 block text-ink-soft">A quiet gallery of moments the family has chosen to share.</span>
            </Link>
          </li>
          <li>
            <Link to="/submit" className="card group block h-full p-7 no-underline transition-shadow hover:shadow-md">
              <MessageSquareHeart className="text-bronze-500" size={26} aria-hidden="true" />
              <span className="mt-4 block font-serif text-2xl text-wood-900">Leave a tribute</span>
              <span className="mt-2 block text-ink-soft">
                Share a memory, a story or a photograph. It will appear after the family has reviewed it.
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {featured && featured.length > 0 && (
        <section aria-labelledby="featured-title" className="container-page pt-16">
          <h2 id="featured-title" className="text-center text-3xl">
            Remembered fondly
          </h2>
          <div className="divider-ornament mx-auto my-6 max-w-xs" aria-hidden="true">
            ✦
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {featured.slice(0, 3).map((t) => (
              <li key={t.id}>
                <TributeCard tribute={t} onRead={reader.open} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <TributeReader tribute={reader.tribute} origin={reader.origin} onClose={reader.close} />
    </>
  )
}

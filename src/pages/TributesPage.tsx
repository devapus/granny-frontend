import { Link, useLocation, useSearchParams } from 'react-router'
import { TributeCard } from '../components/TributeCard'
import { TributeReader } from '../components/TributeReader'
import { useTributeReader } from '../components/useTributeReader'
import { EmptyState, ErrorNotice, LoadingBlock, PageHeading } from '../components/ui/States'
import { groupTributes } from '../lib/format'
import { useConfig, useTributes } from '../lib/queries'

export default function TributesPage() {
  const config = useConfig()
  const tributes = useTributes()
  const reader = useTributeReader(tributes.data)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const webglUnavailable = (location.state as { webglUnavailable?: boolean } | null)?.webglUnavailable

  const selected = params.get('category')
  const groups = groupTributes(tributes.data ?? [], config.data?.relationshipCategories ?? [])
  const visibleGroups = selected ? groups.filter((g) => g.category.id === selected) : groups

  const setCategory = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('category', id)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  return (
    <div className="container-page py-14 md:py-20">
      <PageHeading eyebrow="Tributes" title="Words from those who loved her">
        <p>Read the memories shared by family and friends, gathered by how they knew her.</p>
      </PageHeading>

      {webglUnavailable && (
        <p role="status" className="notice mx-auto mt-8 max-w-2xl">
          The 3D house isn’t available on this device, so we’ve brought you to the tributes in a simpler form.
        </p>
      )}

      {config.isError && (
        <div className="mx-auto mt-8 max-w-2xl">
          <ErrorNotice error={config.error} onRetry={() => void config.refetch()} />
        </div>
      )}

      {groups.length > 1 && (
        <nav aria-label="Browse tributes by category" className="mt-10 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-pressed={!selected}
            onClick={() => setCategory(null)}
            className={`btn btn-sm ${!selected ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.category.id}
              type="button"
              aria-pressed={selected === g.category.id}
              onClick={() => setCategory(g.category.id)}
              className={`btn btn-sm ${selected === g.category.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {g.category.name} <span className="opacity-70">({g.tributes.length})</span>
            </button>
          ))}
        </nav>
      )}

      <div className="mt-12">
        {tributes.isPending ? (
          <LoadingBlock label="Loading tributes" lines={4} />
        ) : tributes.isError ? (
          <ErrorNotice
            title="The tributes could not be loaded."
            error={tributes.error}
            onRetry={() => void tributes.refetch()}
          />
        ) : visibleGroups.length === 0 ? (
          <EmptyState title="No tributes yet">
            <p>
              The first memories are still being gathered.{' '}
              <Link to="/submit">Be the first to leave a tribute</Link>.
            </p>
          </EmptyState>
        ) : (
          <div className="space-y-16">
            {visibleGroups.map((g) => (
              <section key={g.category.id} aria-labelledby={`cat-${g.category.id}`}>
                <h2 id={`cat-${g.category.id}`} className="text-3xl">
                  {g.category.name}
                </h2>
                <div className="divider-ornament my-5" aria-hidden="true" />
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.tributes.map((t) => (
                    <li key={t.id}>
                      <TributeCard tribute={t} onRead={reader.open} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <TributeReader tribute={reader.tribute} origin={reader.origin} onClose={reader.close} />
    </div>
  )
}

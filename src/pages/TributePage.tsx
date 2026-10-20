import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { TributeBody } from '../components/TributeReader'
import { ErrorNotice, LoadingBlock } from '../components/ui/States'
import { isApiError } from '../lib/api/client'
import { useTribute } from '../lib/queries'

export default function TributePage() {
  const { id } = useParams()
  const tribute = useTribute(id ?? null)

  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <Link to="/tributes" className="btn btn-quiet btn-sm -ml-3 mb-6">
        <ArrowLeft size={16} aria-hidden="true" /> All tributes
      </Link>
      {tribute.isPending ? (
        <LoadingBlock label="Loading tribute" lines={5} />
      ) : tribute.isError ? (
        isApiError(tribute.error) && tribute.error.status === 404 ? (
          <div className="notice" role="alert">
            <p className="font-semibold">We couldn’t find that tribute.</p>
            <p className="mt-1">It may have been removed or is not yet published.</p>
          </div>
        ) : (
          <ErrorNotice title="This tribute could not be loaded." error={tribute.error} onRetry={() => void tribute.refetch()} />
        )
      ) : (
        <article className="card p-6 sm:p-12">
          <TributeBody tribute={tribute.data} />
        </article>
      )}
    </div>
  )
}

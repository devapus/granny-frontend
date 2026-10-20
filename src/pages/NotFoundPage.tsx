import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="container-page py-28 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-5xl">This room doesn’t exist</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">The page you were looking for may have moved.</p>
      <p className="mt-8">
        <Link to="/" className="btn btn-primary">
          Return home
        </Link>
      </p>
    </div>
  )
}

import { Link } from 'react-router'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-ivory-100/70">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <p className="font-serif text-xl text-wood-900">Kept with love, for the family.</p>
          <p className="field-hint mt-2">
            Every tribute is read and reviewed by the family before it appears here.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/tributes">Tributes</Link>
          <Link to="/gallery">Gallery</Link>
          <Link to="/submit">Leave a tribute</Link>
          <Link to="/experience">Enter the house</Link>
        </nav>
      </div>
      <div className="border-t border-line/70">
        <p className="container-page py-4 text-xs tracking-wide text-ink-mute">
          A memorial presented with care by{' '}
          <span className="font-semibold text-wood-700">Apus Industries Limited</span>.
        </p>
      </div>
    </footer>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import { useConfig } from '../../lib/queries'
import { Footer } from './Footer'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/tributes', label: 'Tributes' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/submit', label: 'Leave a tribute' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-full px-3.5 py-2 text-sm font-semibold no-underline transition-colors duration-[var(--duration-base)]',
    isActive ? 'bg-ivory-200 text-wood-900' : 'text-ink-soft hover:bg-ivory-100 hover:text-wood-900',
  ].join(' ')
}

export function PublicLayout() {
  const { data: config } = useConfig()
  const location = useLocation()
  // The mobile menu is "open for" a pathname, so navigating anywhere closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = openFor === location.pathname
  const setOpen = (fn: (o: boolean) => boolean) => setOpenFor(fn(open) ? location.pathname : null)

  // Reset scroll on route change (but not when only ?read= changes).
  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only-focusable btn btn-primary fixed top-3 left-3 z-[100]"
      >
        Skip to content
      </a>
      <header className="border-b border-line/70 bg-ivory-50/90">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold text-wood-900 no-underline hover:text-bronze-700">
            {config?.memorialTitle ?? 'House of Memories'}
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/experience" className="btn btn-primary btn-sm ml-3">
              Enter the house
            </Link>
          </nav>
          <button
            type="button"
            className="btn btn-quiet md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Primary mobile" className="container-page flex flex-col gap-1 pb-4 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/experience" className="btn btn-primary mt-2">
              Enter the house
            </Link>
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

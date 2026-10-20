import { createBrowserRouter, Link, useRouteError, type RouteObject } from 'react-router'
import { PublicLayout } from './components/layout/PublicLayout'
import GalleryPage from './pages/GalleryPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import SubmitPage from './pages/SubmitPage'
import TributePage from './pages/TributePage'
import TributesPage from './pages/TributesPage'

function RouteError() {
  const error = useRouteError()
  console.error(error)
  return (
    <div className="container-page py-28 text-center" role="alert">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">An unexpected error occurred. Please try again, or return to the home page.</p>
      <p className="mt-6">
        <Link to="/" className="btn btn-primary">
          Return home
        </Link>
      </p>
    </div>
  )
}

function RouteLoading() {
  return (
    <div className="grid min-h-screen place-items-center text-ink-soft" role="status">
      <p className="font-display text-2xl italic">Opening the door…</p>
    </div>
  )
}

/** Heavy routes (3D scene, admin) are code-split and only downloaded when visited. */
const adminPage = (loader: () => Promise<{ default: React.ComponentType }>): RouteObject['lazy'] =>
  async () => ({ Component: (await loader()).default })

const adminTributes = (status: 'pending' | 'approved' | 'rejected'): RouteObject['lazy'] =>
  async () => {
    const { default: AdminTributes } = await import('./pages/admin/AdminTributes')
    return { Component: () => <AdminTributes status={status} /> }
  }

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: PublicLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: HomePage },
      { path: 'tributes', Component: TributesPage },
      { path: 'tributes/:id', Component: TributePage },
      { path: 'gallery', Component: GalleryPage },
      { path: 'submit', Component: SubmitPage },
    ],
  },
  {
    path: '/experience',
    ErrorBoundary: RouteError,
    HydrateFallback: RouteLoading,
    lazy: adminPage(() => import('./experience/ExperienceRoute')),
  },
  { path: '/admin/login', ErrorBoundary: RouteError, HydrateFallback: RouteLoading, lazy: adminPage(() => import('./pages/admin/AdminLogin')) },
  {
    path: '/admin',
    ErrorBoundary: RouteError,
    HydrateFallback: RouteLoading,
    lazy: adminPage(() => import('./pages/admin/AdminLayout')),
    children: [
      { index: true, lazy: adminPage(() => import('./pages/admin/AdminOverview')) },
      { path: 'pending', lazy: adminTributes('pending') },
      { path: 'approved', lazy: adminTributes('approved') },
      { path: 'rejected', lazy: adminTributes('rejected') },
      { path: 'gallery', lazy: adminPage(() => import('./pages/admin/AdminGallery')) },
      { path: 'media', lazy: adminPage(() => import('./pages/admin/AdminMedia')) },
      { path: 'categories', lazy: adminPage(() => import('./pages/admin/AdminCategories')) },
      { path: 'config', lazy: adminPage(() => import('./pages/admin/AdminConfig')) },
      { path: 'audit', lazy: adminPage(() => import('./pages/admin/AdminAudit')) },
    ],
  },
  {
    path: '*',
    Component: PublicLayout,
    children: [{ path: '*', Component: NotFoundPage }],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)

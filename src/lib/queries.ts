import { QueryClient, queryOptions, useQuery } from '@tanstack/react-query'
import { isApiError } from './api/client'
import { getPublicConfig, getTribute, listAllTributes, listGallery } from './api/public'
import { loadAssetManifest } from './assets'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          // Don't hammer on client errors (401, 404, 422 …); retry transient failures briefly.
          if (isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 429) return false
          return count < 2
        },
      },
    },
  })
}

export const configQuery = () =>
  queryOptions({ queryKey: ['public', 'config'], queryFn: ({ signal }) => getPublicConfig(signal) })

export const tributesQuery = () =>
  queryOptions({ queryKey: ['public', 'tributes'], queryFn: ({ signal }) => listAllTributes(signal) })

export const tributeQuery = (id: string) =>
  queryOptions({ queryKey: ['public', 'tribute', id], queryFn: ({ signal }) => getTribute(id, signal) })

export const galleryQuery = () =>
  queryOptions({
    queryKey: ['public', 'gallery'],
    queryFn: async ({ signal }) => {
      const { data } = await listGallery({ limit: 100 }, signal)
      return data
    },
  })

export const assetManifestQuery = () =>
  queryOptions({
    queryKey: ['assets', 'manifest'],
    queryFn: ({ signal }) => loadAssetManifest(signal),
    staleTime: Infinity,
    retry: false,
  })

export const useConfig = () => useQuery(configQuery())
export const useTributes = () => useQuery(tributesQuery())
export const useTribute = (id: string | null) =>
  useQuery({ ...tributeQuery(id ?? ''), enabled: Boolean(id) })
export const useGallery = () => useQuery(galleryQuery())
export const useAssetManifest = () => useQuery(assetManifestQuery())

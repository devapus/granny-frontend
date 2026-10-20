import { z } from 'zod'
import { ApiError, request, requestData } from './client'
import {
  galleryItemSchema,
  publicConfigSchema,
  publicTributeSchema,
  submissionReceiptSchema,
  uploadUrlResponseSchema,
  type PublicTribute,
} from './schemas'

export const getPublicConfig = (signal?: AbortSignal) =>
  requestData('/public/config', { schema: publicConfigSchema, signal })

export const listTributes = (
  params: { page?: number; limit?: number; category?: string; featured?: boolean } = {},
  signal?: AbortSignal,
) =>
  request('/tributes', {
    schema: z.array(publicTributeSchema),
    query: { page: params.page, limit: params.limit, category: params.category, featured: params.featured },
    signal,
  })

/** Fetch every published tribute (the API caps pages at 50). Bounded to protect the browser. */
export async function listAllTributes(signal?: AbortSignal, maxPages = 40): Promise<PublicTribute[]> {
  const all: PublicTribute[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { data, meta } = await listTributes({ page, limit: 50 }, signal)
    all.push(...data)
    if (!meta || page >= meta.totalPages || data.length === 0) break
  }
  return all
}

export const getTribute = (id: string, signal?: AbortSignal) =>
  requestData(`/tributes/${encodeURIComponent(id)}`, { schema: publicTributeSchema, signal })

export const listGallery = (
  params: { page?: number; limit?: number; category?: string; mediaType?: string } = {},
  signal?: AbortSignal,
) => request('/gallery', { schema: z.array(galleryItemSchema), query: params, signal })

export interface TributeSubmissionBody {
  submissionId: string
  fullName: string
  email: string
  relationshipCategory: string
  customRelationship?: string
  tributeText: string
  contributorPhotoMediaId?: string | null
  grandmotherPhotoMediaId?: string | null
  photoDisplayPermission: boolean
  acknowledgment: true
}

/** `idempotencyKey` is generated once per form session and re-sent on retries. */
export const submitTribute = (body: TributeSubmissionBody, idempotencyKey: string) =>
  request('/tributes', {
    method: 'POST',
    schema: submissionReceiptSchema,
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  })

// ---------------------------------------------------------------- uploads

export type UploadCategory =
  | 'tribute_contributor'
  | 'tribute_grandmother'
  | 'gallery_family'
  | 'gallery_featured'
  | 'gallery_video'
  | 'other'

export interface UploadParams {
  file: File
  category: UploadCategory
  altText?: string
  caption?: string
  /** Use the authenticated admin endpoints (images + videos, CSRF protected). */
  admin?: boolean
  signal?: AbortSignal
}

async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return {}
  try {
    const bmp = await createImageBitmap(file)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return {}
  }
}

/**
 * Presigned-upload flow: POST upload-url → PUT bytes to storage → POST complete.
 * Throws `ApiError` with `isStorageUnavailable` when the backend answers 503 STORAGE_NOT_CONFIGURED.
 */
export async function uploadMedia({ file, category, altText, caption, admin, signal }: UploadParams): Promise<string> {
  const prefix = admin ? '/admin/media' : '/media'
  const target = await requestData(`${prefix}/upload-url`, {
    method: 'POST',
    schema: uploadUrlResponseSchema,
    body: { contentType: file.type, fileSize: file.size, category, altText: altText || undefined, caption: caption || undefined },
    signal,
  })

  let put: Response
  try {
    put = await fetch(target.upload.url, {
      method: target.upload.method || 'PUT',
      headers: target.upload.headers,
      body: file,
      credentials: 'omit',
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK_ERROR', 'The photo could not be uploaded. Please check your connection and try again.')
  }
  if (!put.ok) {
    throw new ApiError(put.status, 'UPLOAD_FAILED', 'The photo could not be uploaded. Please try again.')
  }

  const size = await imageSize(file)
  await request(`${prefix}/complete`, {
    method: 'POST',
    schema: z.unknown(),
    body: { mediaId: target.mediaId, completionToken: target.completionToken, ...size },
    signal,
  })
  return target.mediaId
}

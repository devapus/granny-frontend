import { z } from 'zod'
import { request, requestData } from './client'
import {
  adminConfigSchema,
  adminMediaSchema,
  adminSessionSchema,
  adminTributeSchema,
  auditEventSchema,
  adminCategorySchema,
  type AdminAcknowledgment,
  type TributeStatus,
} from './schemas'

// ---------------------------------------------------------------- auth
export const login = (email: string, password: string) =>
  requestData('/admin/auth/login', { method: 'POST', schema: adminSessionSchema, body: { email, password } })

export const logout = () =>
  requestData('/admin/auth/logout', { method: 'POST', schema: z.unknown() })

export const getMe = (signal?: AbortSignal) =>
  requestData('/admin/auth/me', { schema: adminSessionSchema, signal })

// ---------------------------------------------------------------- tributes
export interface AdminTributeQuery {
  status?: TributeStatus
  page?: number
  limit?: number
  q?: string
  category?: string
}

export const listAdminTributes = (query: AdminTributeQuery, signal?: AbortSignal) =>
  request('/admin/tributes', { schema: z.array(adminTributeSchema), query: { ...query }, signal })

export interface AdminTributePatch {
  fullName?: string
  tributeText?: string
  relationshipCategory?: string
  customRelationship?: string | null
  photoDisplayPermission?: boolean
  isFeatured?: boolean
  moderationNotes?: string
  displayOrder?: number
}

export const patchAdminTribute = (id: string, patch: AdminTributePatch) =>
  requestData(`/admin/tributes/${id}`, { method: 'PATCH', schema: adminTributeSchema, body: patch })

export const approveTribute = (id: string) =>
  requestData(`/admin/tributes/${id}/approve`, { method: 'POST', schema: adminTributeSchema })

export const rejectTribute = (id: string, reason?: string) =>
  requestData(`/admin/tributes/${id}/reject`, {
    method: 'POST',
    schema: adminTributeSchema,
    body: reason ? { reason } : {},
  })

export const removeTribute = (id: string) =>
  requestData(`/admin/tributes/${id}/remove`, { method: 'POST', schema: adminTributeSchema })

export const reorderTributes = (orderedIds: string[], category?: string) =>
  requestData('/admin/tributes/order', {
    method: 'PUT',
    schema: z.unknown(),
    body: { orderedIds, ...(category ? { category } : {}) },
  })

// ---------------------------------------------------------------- gallery & media
export const listAdminGallery = (query: { page?: number; limit?: number; category?: string; visibility?: string }) =>
  request('/admin/gallery', { schema: z.array(adminMediaSchema), query })

export interface GalleryCreateBody {
  mediaId: string
  altText: string
  caption?: string
  category?: 'gallery_family' | 'gallery_featured' | 'gallery_video'
  visibility?: 'public' | 'private'
  isFeatured?: boolean
}
export const createGalleryItem = (body: GalleryCreateBody) =>
  requestData('/admin/gallery', { method: 'POST', schema: adminMediaSchema, body })

export interface GalleryPatchBody {
  altText?: string
  caption?: string
  category?: 'gallery_family' | 'gallery_featured' | 'gallery_video'
  visibility?: 'public' | 'private'
  isFeatured?: boolean
  displayOrder?: number
}
export const patchGalleryItem = (id: string, body: GalleryPatchBody) =>
  requestData(`/admin/gallery/${id}`, { method: 'PATCH', schema: adminMediaSchema, body })

export const deleteGalleryItem = (id: string) =>
  requestData(`/admin/gallery/${id}`, { method: 'DELETE', schema: z.unknown() })

// ---------------------------------------------------------------- config
export const getAdminConfig = (signal?: AbortSignal) =>
  requestData('/admin/config', { schema: adminConfigSchema, signal })

export interface AdminConfigPatch {
  memorialTitle?: string
  grandmotherDisplayName?: string
  portraitMediaId?: string | null
  introductoryMessage?: string
  closingMessage?: string
  tributeSubmissionsOpen?: boolean
  gallery?: { enabled?: boolean; itemsPerPage?: number; allowVideos?: boolean; layout?: 'grid' | 'masonry' }
  featuredMemories?: string[]
  publicAcknowledgments?: AdminAcknowledgment[]
  privateSettings?: { notificationEmail?: string; moderationGuidelines?: string; internalNotes?: string }
}
export const patchAdminConfig = (patch: AdminConfigPatch) =>
  requestData('/admin/config', { method: 'PATCH', schema: adminConfigSchema, body: patch })

export const patchCategories = (categories: { id: string; name: string; order: number; visible: boolean }[]) =>
  requestData('/admin/categories', {
    method: 'PATCH',
    schema: z.object({ relationshipCategories: z.array(adminCategorySchema) }),
    body: { categories },
  })

// ---------------------------------------------------------------- audit
export const listAuditEvents = (query: { page?: number; limit?: number; action?: string; resourceType?: string }) =>
  request('/admin/audit-events', { schema: z.array(auditEventSchema), query })

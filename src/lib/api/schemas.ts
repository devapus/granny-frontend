import { z } from 'zod'

/**
 * Response schemas. They mirror the documented backend contract (../memorial-backend/openapi.yaml)
 * but are written independently — no backend source is imported.
 */

export const photoSchema = z
  .object({
    id: z.string(),
    url: z.string().nullable().optional(),
    altText: z.string().default(''),
    caption: z.string().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
  })
  .nullable()
export type Photo = z.infer<typeof photoSchema>

export const publicTributeSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  relationshipCategory: z.string(),
  relationshipLabel: z.string(),
  customRelationship: z.string().nullable().optional(),
  tributeText: z.string(),
  contributorPhoto: photoSchema.optional().default(null),
  grandmotherPhoto: photoSchema.optional().default(null),
  isFeatured: z.boolean().default(false),
  publishedAt: z.string().nullable().optional(),
})
export type PublicTribute = z.infer<typeof publicTributeSchema>

export const pageMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
})
export type PageMeta = z.infer<typeof pageMetaSchema>

export const relationshipCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().default(0),
})
export type RelationshipCategory = z.infer<typeof relationshipCategorySchema>

export const publicConfigSchema = z.object({
  memorialTitle: z.string(),
  grandmotherDisplayName: z.string(),
  portrait: photoSchema.optional().default(null),
  introductoryMessage: z.string(),
  closingMessage: z.string(),
  tributeSubmissionsOpen: z.boolean(),
  relationshipCategories: z.array(relationshipCategorySchema),
  gallery: z
    .object({
      enabled: z.boolean().default(true),
      itemsPerPage: z.number().default(24),
      allowVideos: z.boolean().default(true),
      layout: z.string().default('grid'),
    })
    .default({ enabled: true, itemsPerPage: 24, allowVideos: true, layout: 'grid' }),
  featuredMemories: z.array(publicTributeSchema).default([]),
  acknowledgments: z
    .array(z.object({ id: z.string(), name: z.string(), message: z.string().default('') }))
    .default([]),
  tributeLimits: z.object({ minLength: z.number(), maxLength: z.number() }),
})
export type PublicConfig = z.infer<typeof publicConfigSchema>

export const galleryItemSchema = z.object({
  id: z.string(),
  mediaType: z.enum(['image', 'video']),
  category: z.string(),
  url: z.string().nullable(),
  altText: z.string().default(''),
  caption: z.string().default(''),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  isFeatured: z.boolean().default(false),
})
export type GalleryItem = z.infer<typeof galleryItemSchema>

export const submissionReceiptSchema = z.object({
  id: z.string(),
  submissionId: z.string().optional(),
  status: z.string(),
  createdAt: z.string().optional(),
  message: z.string().optional(),
})
export type SubmissionReceipt = z.infer<typeof submissionReceiptSchema>

export const uploadUrlResponseSchema = z.object({
  mediaId: z.string(),
  upload: z.object({
    url: z.string(),
    method: z.string().default('PUT'),
    headers: z.record(z.string(), z.string()).default({}),
  }),
  expiresInSeconds: z.number().optional(),
  maxBytes: z.number().optional(),
  completionToken: z.string().optional(),
})
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>

export const csrfSchema = z.object({
  csrfToken: z.string(),
  headerName: z.string().default('x-csrf-token'),
})

// ---------------------------------------------------------------- admin

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

export const adminSessionSchema = z.object({ admin: adminUserSchema })

export const adminMediaSchema = z.object({
  id: z.string(),
  mediaType: z.enum(['image', 'video']),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  altText: z.string().default(''),
  caption: z.string().default(''),
  visibility: z.string().default('private'),
  moderationStatus: z.string().optional(),
  category: z.string(),
  uploadStatus: z.string().optional(),
  displayOrder: z.number().default(0),
  isFeatured: z.boolean().default(false),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
})
export type AdminMedia = z.infer<typeof adminMediaSchema>

export const tributeStatusSchema = z.enum(['pending', 'approved', 'rejected', 'removed'])
export type TributeStatus = z.infer<typeof tributeStatusSchema>

export const adminTributeSchema = z.object({
  id: z.string(),
  submissionId: z.string().nullable().optional(),
  fullName: z.string(),
  email: z.string(),
  relationshipCategory: z.string(),
  customRelationship: z.string().nullable().optional(),
  tributeText: z.string(),
  contributorPhoto: adminMediaSchema.nullable().optional(),
  grandmotherPhoto: adminMediaSchema.nullable().optional(),
  photoDisplayPermission: z.boolean().default(false),
  status: tributeStatusSchema,
  displayOrder: z.number().default(0),
  isFeatured: z.boolean().default(false),
  moderationNotes: z.string().default(''),
  approvedAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
})
export type AdminTribute = z.infer<typeof adminTributeSchema>

export const adminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().default(0),
  visible: z.boolean().default(true),
})
export type AdminCategory = z.infer<typeof adminCategorySchema>

export const adminAcknowledgmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  message: z.string().default(''),
  order: z.number().default(0),
  visible: z.boolean().default(true),
})
export type AdminAcknowledgment = z.infer<typeof adminAcknowledgmentSchema>

export const adminConfigSchema = z.object({
  memorialTitle: z.string(),
  grandmotherDisplayName: z.string(),
  portraitMediaId: z.string().nullable().optional(),
  introductoryMessage: z.string(),
  closingMessage: z.string(),
  tributeSubmissionsOpen: z.boolean(),
  relationshipCategories: z.array(adminCategorySchema),
  gallery: z.object({
    enabled: z.boolean(),
    itemsPerPage: z.number(),
    allowVideos: z.boolean(),
    layout: z.string(),
  }),
  featuredMemories: z.array(z.string()).default([]),
  publicAcknowledgments: z.array(adminAcknowledgmentSchema).default([]),
  privateSettings: z
    .object({
      notificationEmail: z.string().default(''),
      moderationGuidelines: z.string().default(''),
      internalNotes: z.string().default(''),
    })
    .default({ notificationEmail: '', moderationGuidelines: '', internalNotes: '' }),
  updatedAt: z.string().optional(),
})
export type AdminConfig = z.infer<typeof adminConfigSchema>

export const auditEventSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable().optional(),
  summary: z.string(),
  correlationId: z.string().optional(),
  createdAt: z.string(),
})
export type AuditEvent = z.infer<typeof auditEventSchema>

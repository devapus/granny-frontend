import { z } from 'zod'

/** Client-side limits that mirror the backend (name 120, custom relationship 100). */
export const FULL_NAME_MAX = 120
export const CUSTOM_RELATIONSHIP_MAX = 100
export const CATEGORY_REQUIRING_CUSTOM_TEXT = 'other'

export const DEFAULT_LIMITS = { minLength: 20, maxLength: 5000 }

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
/** Soft client-side guard; the server enforces its own per-upload `maxBytes`. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

export function buildTributeSchema(limits: { minLength: number; maxLength: number }, categoryIds: string[]) {
  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(1, 'Please tell us your name.')
        .max(FULL_NAME_MAX, `Your name must be at most ${FULL_NAME_MAX} characters.`),
      email: z
        .string()
        .trim()
        .min(1, 'Please enter your email address.')
        .max(254, 'That email address is too long.')
        .pipe(z.email('Please enter a valid email address.')),
      relationshipCategory: z
        .string()
        .min(1, 'Please choose how you knew her.')
        .refine((v) => categoryIds.length === 0 || categoryIds.includes(v), 'Please choose how you knew her.'),
      customRelationship: z
        .string()
        .trim()
        .max(CUSTOM_RELATIONSHIP_MAX, `Must be at most ${CUSTOM_RELATIONSHIP_MAX} characters.`),
      tributeText: z
        .string()
        .trim()
        .min(limits.minLength, `Please write at least ${limits.minLength} characters.`)
        .max(limits.maxLength, `Please keep your tribute under ${limits.maxLength} characters.`),
      photoDisplayPermission: z.boolean(),
      acknowledgment: z.boolean().refine((v) => v === true, 'Please confirm to continue.'),
    })
    .superRefine((v, ctx) => {
      if (v.relationshipCategory === CATEGORY_REQUIRING_CUSTOM_TEXT && v.customRelationship.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['customRelationship'],
          message: 'Please tell us how you knew her.',
        })
      }
    })
}

export type TributeFormValues = z.infer<ReturnType<typeof buildTributeSchema>>
export type TributeFormErrors = Partial<Record<keyof TributeFormValues, string>>

export function validateTribute(
  values: unknown,
  limits: { minLength: number; maxLength: number },
  categoryIds: string[],
) {
  const result = buildTributeSchema(limits, categoryIds).safeParse(values)
  if (result.success) return { ok: true as const, data: result.data, errors: {} as TributeFormErrors }
  const errors: TributeFormErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof TributeFormValues | undefined
    if (key && !errors[key]) errors[key] = issue.message
  }
  return { ok: false as const, errors }
}

export function validatePhoto(file: File): string | null {
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return 'Please choose a JPEG, PNG, WebP or AVIF image.'
  }
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is larger than 10 MB. Please choose a smaller one.'
  return null
}

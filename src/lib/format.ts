import type { PublicTribute, RelationshipCategory } from './api/schemas'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function preview(text: string, max = 180) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export interface TributeGroup {
  category: RelationshipCategory
  tributes: PublicTribute[]
}

/**
 * Group tributes by the configured category order. Categories without tributes are omitted;
 * tributes whose category is unknown/hidden are appended in a trailing "More memories" group.
 */
export function groupTributes(tributes: PublicTribute[], categories: RelationshipCategory[]): TributeGroup[] {
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  const known = new Set(sorted.map((c) => c.id))
  const groups: TributeGroup[] = sorted
    .map((category) => ({ category, tributes: tributes.filter((t) => t.relationshipCategory === category.id) }))
    .filter((g) => g.tributes.length > 0)
  const rest = tributes.filter((t) => !known.has(t.relationshipCategory))
  if (rest.length > 0) {
    groups.push({ category: { id: '__more', name: 'More memories', order: 9999 }, tributes: rest })
  }
  return groups
}

export function tributePhoto(t: PublicTribute) {
  return t.contributorPhoto?.url ? t.contributorPhoto : t.grandmotherPhoto?.url ? t.grandmotherPhoto : null
}

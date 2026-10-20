import type { GalleryItem, PublicConfig, PublicTribute } from '../lib/api/schemas'

const tribute = (over: Partial<PublicTribute> & Pick<PublicTribute, 'id' | 'fullName' | 'relationshipCategory' | 'relationshipLabel'>): PublicTribute => ({
  customRelationship: null,
  tributeText:
    'She always had the kettle on and a story ready. I will remember the sound of her laugh in the kitchen, and the way every visit ended with something wrapped in foil for the road.',
  contributorPhoto: null,
  grandmotherPhoto: null,
  isFeatured: false,
  publishedAt: '2026-01-10T10:00:00.000Z',
  ...over,
})

const config: PublicConfig = {
  memorialTitle: 'House of Memories',
  grandmotherDisplayName: 'Eleanor Whitfield',
  portrait: null,
  introductoryMessage: 'Step inside and discover the beautiful things my family and friends remember about me.',
  closingMessage: 'Thank you for taking the time to remember her with us.',
  tributeSubmissionsOpen: true,
  relationshipCategories: [
    { id: 'children', name: 'Children', order: 0 },
    { id: 'grandchildren', name: 'Grandchildren', order: 1 },
    { id: 'friends', name: 'Friends', order: 2 },
    { id: 'other', name: 'Other', order: 3 },
  ],
  gallery: { enabled: true, itemsPerPage: 24, allowVideos: true, layout: 'grid' },
  featuredMemories: [],
  acknowledgments: [{ id: 'a1', name: 'The Whitfield family', message: 'For sharing so generously' }],
  tributeLimits: { minLength: 20, maxLength: 5000 },
}

// Deliberately listed out of category order to prove the UI groups by configured order.
const tributes: PublicTribute[] = [
  tribute({ id: 't-friend', fullName: 'Margaret Ellis', relationshipCategory: 'friends', relationshipLabel: 'Friends' }),
  tribute({ id: 't-grand', fullName: 'Oliver Whitfield', relationshipCategory: 'grandchildren', relationshipLabel: 'Grandchildren' }),
  tribute({ id: 't-child', fullName: 'Susan Whitfield', relationshipCategory: 'children', relationshipLabel: 'Children' }),
]

const gallery: GalleryItem[] = [
  { id: 'g1', mediaType: 'image', category: 'gallery_family', url: 'https://example.test/a.jpg', altText: 'Eleanor in the garden', caption: 'Summer 1998', width: 800, height: 600, isFeatured: false },
  { id: 'g2', mediaType: 'image', category: 'gallery_family', url: 'https://example.test/b.jpg', altText: 'The family at Christmas', caption: '', width: 600, height: 800, isFeatured: false },
]

export const fixtures = { config, tributes, gallery, tribute }

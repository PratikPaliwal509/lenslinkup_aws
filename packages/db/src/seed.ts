import { prisma } from './index.js'

// Pre-generated with: bcrypt.hash('password123', 12)
const PASSWORD_HASH = '$2a$12$BDDWjmSrtl.TK.zrDCjeg./SHVe1bQbbLpKI77Dvzt./s0vIah8.6' // password123

// 17 photography categories
const CATEGORIES = [
  { name: 'Photo Studio',              slug: 'photo-studio',        emoji: '📸', order: 1  },
  { name: 'Photographer',              slug: 'photographer',         emoji: '🧑', order: 2 },
  { name: 'Videographer',              slug: 'videographer',         emoji: '🎬', order: 3  },
  { name: 'Cinematographer',           slug: 'cinematographer',      emoji: '🎥', order: 4  },
  { name: 'Print Lab',                 slug: 'print-lab',            emoji: '🖨', order: 5  },
  { name: 'Drone Operator',            slug: 'drone-operator',       emoji: '🚁', order: 6  },
  { name: 'Photo Editor / Retoucher',  slug: 'photo-editor',         emoji: '✂', order: 7  },
  { name: 'Album & Book Designer',     slug: 'album-designer',       emoji: '📖', order: 8  },
  { name: 'Camera & Lens Shop',        slug: 'camera-shop',          emoji: '📷', order: 9  },
  { name: 'Equipment Rental',          slug: 'equipment-rental',     emoji: '🎁', order: 10 },
  { name: 'Photo Booth Rental',        slug: 'photo-booth',          emoji: '🎪', order: 11 },
  { name: 'Lighting Supplier',         slug: 'lighting-supplier',    emoji: '💡', order: 12 },
  { name: 'Photography Trainer',       slug: 'photography-trainer',  emoji: '📚', order: 13 },
  { name: 'Product Photographer',      slug: 'product-photographer', emoji: '🛍', order: 14 },
  { name: 'Event Photographer',        slug: 'event-photographer',   emoji: '🎉', order: 15 },
  { name: 'Photo Framing Shop',        slug: 'photo-framing',        emoji: '🖼', order: 16 },
  { name: 'Makeup / Styling',          slug: 'makeup-styling',       emoji: '💄', order: 17 },
]

// Default admin settings
const DEFAULT_SETTINGS: Record<string, string> = {
  free_post_limit:          '3',
  premium_post_limit:       '50',
  free_service_limit:       '5',
  premium_service_limit:    '25',
  featured_listing_enabled: 'true',
  maintenance_mode:         'false',
}

// Helper: create user + profile + category link
async function createTestUser(opts: {
  email: string
  displayName: string
  bio: string
  city: string
  state: string
  phone?: string
  website?: string
  categorySlug: string
  isPremium: boolean
  avgRating: number
  reviewCount: number
}) {
  const user = await prisma.user.upsert({
    where:  { email: opts.email },
    update: {},
    create: {
      email:           opts.email,
      passwordHash:    PASSWORD_HASH,
      role:            'USER',
      isEmailVerified: true,
    },
  })

  // Create profile if not exists
  let profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId:      user.id,
        displayName: opts.displayName,
        bio:         opts.bio,
        city:        opts.city,
        state:       opts.state,
        phone:       opts.phone ?? null,
        website:     opts.website ?? null,
        isPremium:   opts.isPremium,
        avgRating:   opts.avgRating,
        reviewCount: opts.reviewCount,
      },
    })
  }

  // Link category via ProfileCategory
  const cat = await prisma.category.findUnique({ where: { slug: opts.categorySlug } })
  if (cat) {
    await prisma.profileCategory.upsert({
      where:  { profileId_categoryId: { profileId: profile.id, categoryId: cat.id } },
      update: {},
      create: { profileId: profile.id, categoryId: cat.id },
    })
  }

  return { user, profile }
}

async function main() {
  console.log('Seeding LensLinkUp...\n')

  // ── 1. Categories ──────────────────────────────────────────────────────────
  console.log('Seeding categories...')
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, emoji: cat.emoji, order: cat.order },
      create: cat,
    })
  }
  console.log(`  OK: ${CATEGORIES.length} categories\n`)

  // ── 2. App Settings ────────────────────────────────────────────────────────
  console.log('Seeding app settings...')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSettings.upsert({
      where:  { key },
      update: {},
      create: { key, value },
    })
  }
  console.log(`  OK: ${Object.keys(DEFAULT_SETTINGS).length} settings\n`)

  // ── 3. Admin User ──────────────────────────────────────────────────────────
  console.log('Seeding admin user...')
  const adminUser = await prisma.user.upsert({
    where:  { email: 'admin@lenslinkup.in' },
    update: {},
    create: {
      email:           'admin@lenslinkup.in',
      passwordHash:    PASSWORD_HASH,
      role:            'ADMIN',
      isEmailVerified: true,
    },
  })
  let adminProfile = await prisma.profile.findUnique({ where: { userId: adminUser.id } })
  if (!adminProfile) {
    adminProfile = await prisma.profile.create({
      data: {
        userId:      adminUser.id,
        displayName: 'LensLinkUp Admin',
        bio:         'Platform administrator.',
        city:        'Mumbai',
        state:       'Maharashtra',
        isPremium:   true,
      },
    })
  }
  console.log('  OK: admin@lenslinkup.in (password: password123)\n')

  // ── 4. Test Users ──────────────────────────────────────────────────────────
  console.log('Seeding test users...')

  const { user: photoUser } = await createTestUser({
    email:        'photographer@test.com',
    displayName:  'Arjun Mehta Photography',
    bio:          'Wedding & portrait photographer based in Mumbai. 8 years of experience.',
    city:         'Mumbai',
    state:        'Maharashtra',
    phone:        '+91 98765 43210',
    website:      'https://arjunmehta.photography',
    categorySlug: 'photographer',
    isPremium:    true,
    avgRating:    4.7,
    reviewCount:  23,
  })
  console.log('  OK: photographer@test.com (Premium, 4.7 stars)')

  const { user: studioUser } = await createTestUser({
    email:        'studio@test.com',
    displayName:  'Pixel Perfect Studio',
    bio:          'State-of-the-art photography studio in Pune with 3 fully equipped sets.',
    city:         'Pune',
    state:        'Maharashtra',
    phone:        '+91 20 1234 5678',
    categorySlug: 'photo-studio',
    isPremium:    false,
    avgRating:    4.2,
    reviewCount:  11,
  })
  console.log('  OK: studio@test.com (Free)')

  await createTestUser({
    email:        'videographer@test.com',
    displayName:  'Riya Films',
    bio:          'Cinematic wedding films and brand videos. Based in Bangalore.',
    city:         'Bangalore',
    state:        'Karnataka',
    phone:        '+91 80 8765 4321',
    categorySlug: 'videographer',
    isPremium:    false,
    avgRating:    0,
    reviewCount:  0,
  })
  console.log('  OK: videographer@test.com (Free)')

  const { user: editorUser } = await createTestUser({
    email:        'editor@test.com',
    displayName:  'ColorGrade Pro',
    bio:          'Professional photo editing and retouching. Lightroom, Photoshop expert. Quick turnaround.',
    city:         'Delhi',
    state:        'Delhi',
    phone:        '+91 11 2345 6789',
    categorySlug: 'photo-editor',
    isPremium:    true,
    avgRating:    4.9,
    reviewCount:  57,
  })
  console.log('  OK: editor@test.com (Premium, 4.9 stars)')

  const { user: droneUser } = await createTestUser({
    email:        'drone@test.com',
    displayName:  'Sky View Drones',
    bio:          'Licensed drone operator. Aerial photography across Maharashtra.',
    city:         'Nashik',
    state:        'Maharashtra',
    phone:        '+91 98001 23456',
    categorySlug: 'drone-operator',
    isPremium:    false,
    avgRating:    3.8,
    reviewCount:  5,
  })
  console.log('  OK: drone@test.com (Free)\n')

  // ── 5. Sample Services for photographer ───────────────────────────────────
  console.log('Seeding services for Arjun Mehta...')
  const existingSvcCount = await prisma.serviceProduct.count({ where: { userId: photoUser.id } })
  if (existingSvcCount === 0) {
    await prisma.serviceProduct.createMany({
      data: [
        { userId: photoUser.id, type: 'SERVICE', name: 'Wedding Photography Package',  description: 'Full day coverage, 500+ edited photos, USB delivery',  price: 75000, unit: 'per day',     order: 0 },
        { userId: photoUser.id, type: 'SERVICE', name: 'Pre-Wedding Shoot',            description: '4-hour outdoor session, 100+ edited photos',           price: 25000, unit: 'per session', order: 1 },
        { userId: photoUser.id, type: 'SERVICE', name: 'Portrait Session',             description: '2-hour studio or outdoor session, 30 edited photos',   price: 8000,  unit: 'per session', order: 2 },
        { userId: photoUser.id, type: 'PRODUCT', name: '12x18 Canvas Print',          description: 'Premium canvas, ready to hang',                        price: 2500,  unit: 'per piece',   order: 3 },
        { userId: photoUser.id, type: 'PRODUCT', name: 'Photo Album (40 pages)',       description: 'Flush mount album, premium linen cover',               price: 15000, unit: 'per album',   order: 4 },
      ],
    })
  }
  console.log('  OK: 5 services/products\n')

  // ── 6. Sample Work Posts ───────────────────────────────────────────────────
  console.log('Seeding work posts...')
  const existingPostCount = await prisma.workPost.count()
  if (existingPostCount === 0) {
    await prisma.workPost.createMany({
      data: [
        {
          userId:      studioUser.id,
          title:       'Need a Wedding Photographer for March 15th',
          description: 'Looking for an experienced wedding photographer for a 400-guest wedding in Pune. Full day coverage required from morning haldi to evening reception.',
          budget:      80000,
          categorySlug: 'photographer',
          city:        'Pune',
          status:      'OPEN',
        },
        {
          userId:      droneUser.id,
          title:       'Aerial Shots for Real Estate Project',
          description: 'Require drone photography for a 5-acre residential project in Nashik. Need 50+ aerial shots and a 2-minute aerial video.',
          budget:      15000,
          categorySlug: 'drone-operator',
          city:        'Nashik',
          status:      'OPEN',
        },
        {
          userId:      studioUser.id,
          title:       'Product Photography for E-commerce — 200 SKUs',
          description: 'Need a product photographer to shoot 200 clothing items. White background, studio lighting. Delivery in 7 days.',
          budget:      40000,
          categorySlug: 'product-photographer',
          city:        'Pune',
          status:      'OPEN',
        },
      ],
    })
  }
  console.log('  OK: 3 work posts\n')

  // ── 7. Sample Connections ──────────────────────────────────────────────────
  console.log('Seeding connections...')
  const conn1 = await prisma.connection.findFirst({
    where: { senderId: photoUser.id, receiverId: studioUser.id },
  })
  if (!conn1) {
    await prisma.connection.create({
      data: { senderId: photoUser.id, receiverId: studioUser.id, status: 'ACCEPTED' },
    })
  }
  const conn2 = await prisma.connection.findFirst({
    where: { senderId: photoUser.id, receiverId: editorUser.id },
  })
  if (!conn2) {
    await prisma.connection.create({
      data: { senderId: photoUser.id, receiverId: editorUser.id, status: 'PENDING' },
    })
  }
  console.log('  OK: 2 connections\n')

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('===================================================')
  console.log('  Seed complete! All passwords: password123')
  console.log('===================================================')
  console.log('  ADMIN  ->  admin@lenslinkup.in')
  console.log('  USER1  ->  photographer@test.com  (Premium, 4.7 stars, has services)')
  console.log('  USER2  ->  studio@test.com        (Free, 4.2 stars, has posts)')
  console.log('  USER3  ->  videographer@test.com  (Free, no rating)')
  console.log('  USER4  ->  editor@test.com        (Premium, 4.9 stars)')
  console.log('  USER5  ->  drone@test.com         (Free, 3.8 stars)')
  console.log('===================================================\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

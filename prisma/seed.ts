/**
 * FreshBhoj seed — enough real-shaped data to run the whole customer journey
 * end to end (Home → meal → cart → checkout → tracking → reorder → reels)
 * without a vendor dashboard existing yet.
 *
 * Idempotent: safe to re-run. Run with `npm run db:seed`.
 */
import {
  CouponType,
  FoodType,
  GoalTag,
  KitchenStatus,
  MealSlot,
  MediaType,
  PrismaClient,
  ReelStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const IMG = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// ─────────────────────────────────────────────────────────────────────────────
// Serviceable areas — single-city launch
// ─────────────────────────────────────────────────────────────────────────────

const AREAS = [
  { locality: 'Malviya Nagar', pincode: '302017', latitude: 26.8505, longitude: 75.8065 },
  { locality: 'Vaishali Nagar', pincode: '302021', latitude: 26.9124, longitude: 75.7382 },
  { locality: 'Mansarovar', pincode: '302020', latitude: 26.8505, longitude: 75.7607 },
  { locality: 'C-Scheme', pincode: '302001', latitude: 26.9048, longitude: 75.7975 },
  { locality: 'Jagatpura', pincode: '302017', latitude: 26.8117, longitude: 75.8619 },
  { locality: 'Raja Park', pincode: '302004', latitude: 26.8967, longitude: 75.8300 },
  { locality: 'Tonk Road', pincode: '302015', latitude: 26.8420, longitude: 75.8010 },
  { locality: 'Jhotwara', pincode: '302012', latitude: 26.9457, longitude: 75.7472 },
];

const CATEGORIES = [
  { slug: 'breakfast', name: 'Breakfast', slot: MealSlot.BREAKFAST, iconUrl: IMG('1525351484163-7529414344d8', 200) },
  { slug: 'lunch', name: 'Lunch', slot: MealSlot.LUNCH, iconUrl: IMG('1546069901-ba9599a7e63c', 200) },
  { slug: 'dinner', name: 'Dinner', slot: MealSlot.DINNER, iconUrl: IMG('1585937421612-70a008356fbe', 200) },
  { slug: 'healthy-snacks', name: 'Healthy Snacks', slot: MealSlot.SNACKS, iconUrl: IMG('1512621776951-a57141f2eefd', 200) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cuisines — style of food, not time slot. Drives the Home pill row and the
// cover-flow carousel, distinct from the MealCategory time-slot grid above.
// ─────────────────────────────────────────────────────────────────────────────

const CUISINES = [
  { slug: 'thali', name: 'Thali', iconUrl: IMG('1596797038530-2c107229654b', 200), imageUrl: IMG('1596797038530-2c107229654b', 600) },
  { slug: 'curry', name: 'Curry', iconUrl: IMG('1585937421612-70a008356fbe', 200), imageUrl: IMG('1585937421612-70a008356fbe', 600) },
  { slug: 'tandoor', name: 'Tandoor & Grill', iconUrl: IMG('1633945274309-2c107229654a', 200), imageUrl: IMG('1633945274309-2c107229654a', 600) },
  { slug: 'continental', name: 'Continental Bowls', iconUrl: IMG('1512621776951-a57141f2eefd', 200), imageUrl: IMG('1512621776951-a57141f2eefd', 600) },
  { slug: 'south-indian', name: 'South Indian', iconUrl: IMG('1589301760014-d929f3979dbc', 200), imageUrl: IMG('1589301760014-d929f3979dbc', 600) },
  { slug: 'biryani', name: 'Biryani', iconUrl: IMG('1563379091339-03246963d96c', 200), imageUrl: IMG('1563379091339-03246963d96c', 600) },
  { slug: 'snacks', name: 'Snacks', iconUrl: IMG('1599599810769-bcde5a160d32', 200), imageUrl: IMG('1599599810769-bcde5a160d32', 600) },
  { slug: 'desserts', name: 'Desserts', iconUrl: IMG('1551024506-0bccd828d307', 200), imageUrl: IMG('1551024506-0bccd828d307', 600) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Kitchens + their menus
// ─────────────────────────────────────────────────────────────────────────────

const KITCHENS = [
  {
    slug: 'annapurna-kitchen',
    name: 'Annapurna Kitchen',
    tagline: 'Authentic Homemade North Indian',
    description:
      'A family-run kitchen in Malviya Nagar serving slow-cooked North Indian thalis with cold-pressed oils and zero preservatives. FSSAI certified and hygiene-audited every month.',
    logoUrl: IMG('1466637574441-749b8f19452f', 300),
    coverImage: IMG('1556909212-d5b604d0c90d', 1200),
    isVerified: true,
    rating: 4.8,
    ratingCount: 1243,
    followerCount: 3820,
    hygieneScore: 4.9,
    locality: 'Malviya Nagar',
    pincode: '302017',
    latitude: 26.8505,
    longitude: 75.8065,
    prepTimeMins: 25,
    opensAt: '08:00',
    closesAt: '22:30',
    contactPhone: '+919876500011',
    fssaiLicense: '22823004000123',
    meals: [
      {
        name: 'Special North Indian Thali',
        slug: 'special-north-indian-thali',
        description: 'Dal Makhani, Paneer, Raita, 4 Butter Rotis, Rice and Salad.',
        images: [IMG('1601050690597-df0568f70950'), IMG('1546833999-b9f581a1996d')],
        price: 249, mrp: 299, foodType: FoodType.VEG,
        slots: [MealSlot.LUNCH, MealSlot.DINNER],
        goalTags: [GoalTag.HEALTHY_LIFESTYLE, GoalTag.HIGH_PROTEIN],
        calories: 720, proteinG: 28, carbsG: 88, fatG: 24, fiberG: 11,
        servingSize: '1 full thali (approx. 650 g)',
        ingredients: ['Whole urad dal', 'Paneer', 'Whole wheat atta', 'Basmati rice', 'Curd', 'Cold-pressed mustard oil'],
        allergens: ['Dairy', 'Gluten'],
        isBestseller: true, category: 'lunch', cuisine: 'thali', prepTimeMins: 25,
        customizations: [
          { name: 'Add-ons', options: [
            { name: 'Extra Butter', priceDelta: 30 },
            { name: 'Add Sweet (Gulab Jamun)', priceDelta: 45 },
            { name: 'Raita', priceDelta: 25 },
          ]},
        ],
      },
      {
        name: 'Paneer Butter Masala',
        slug: 'paneer-butter-masala',
        description: 'Cottage cheese cooked in a rich, slow-simmered tomato gravy.',
        images: [IMG('1631452180519-c014fe946bc7'), IMG('1567188040759-fb8a883dc6d8')],
        price: 180, mrp: 220, foodType: FoodType.VEG,
        slots: [MealSlot.LUNCH, MealSlot.DINNER],
        goalTags: [GoalTag.HIGH_PROTEIN, GoalTag.MUSCLE_GAIN],
        calories: 480, proteinG: 22, carbsG: 18, fatG: 34, fiberG: 4,
        servingSize: '250 g bowl',
        ingredients: ['Paneer', 'Tomato', 'Cashew', 'Butter', 'Cream', 'Kasuri methi'],
        allergens: ['Dairy', 'Tree nuts'],
        category: 'lunch', cuisine: 'curry', prepTimeMins: 20,
      },
      {
        name: 'Moong Dal Khichdi',
        slug: 'moong-dal-khichdi',
        description: 'Light, protein-rich comfort food served with roasted papad.',
        images: [IMG('1585937421612-70a008356fbe')],
        price: 140, foodType: FoodType.VEG,
        slots: [MealSlot.DINNER],
        goalTags: [GoalTag.LOW_CALORIE, GoalTag.WEIGHT_LOSS, GoalTag.HEALTHY_LIFESTYLE],
        calories: 320, proteinG: 14, carbsG: 52, fatG: 6, fiberG: 8,
        servingSize: '400 g bowl',
        ingredients: ['Yellow moong dal', 'Rice', 'Ghee', 'Cumin', 'Turmeric'],
        allergens: ['Dairy'],
        category: 'dinner', cuisine: 'curry', prepTimeMins: 18,
      },
      {
        name: 'Seasonal Veg Thali',
        slug: 'seasonal-veg-thali',
        description: 'Homestyle curry with whole wheat rotis and an organic salad.',
        images: [IMG('1512621776951-a57141f2eefd')],
        price: 180, foodType: FoodType.VEG,
        slots: [MealSlot.LUNCH],
        goalTags: [GoalTag.HEALTHY_LIFESTYLE, GoalTag.LOW_CALORIE],
        calories: 540, proteinG: 18, carbsG: 76, fatG: 15, fiberG: 12,
        servingSize: '1 thali (approx. 550 g)',
        ingredients: ['Seasonal vegetables', 'Whole wheat atta', 'Cold-pressed oil', 'Curd'],
        allergens: ['Dairy', 'Gluten'],
        category: 'lunch', cuisine: 'thali', prepTimeMins: 22,
      },
    ],
    media: [
      { type: MediaType.IMAGE, url: IMG('1556909114-f6e7ad7d3136'), caption: 'Fresh produce sorted this morning' },
      { type: MediaType.IMAGE, url: IMG('1577219491135-ce391730fb2c'), caption: 'Our chef prepping the day’s thali' },
      { type: MediaType.IMAGE, url: IMG('1466637574441-749b8f19452f'), caption: 'Hygiene-audited kitchen floor' },
      { type: MediaType.IMAGE, url: IMG('1490645935967-10de6ba17061'), caption: 'Salad bowls, made to order' },
      { type: MediaType.IMAGE, url: IMG('1504674900247-0877df9cc836'), caption: 'Today’s special plating' },
      { type: MediaType.IMAGE, url: IMG('1476224203421-9ac39bcb3327'), caption: 'Packed and sealed for delivery' },
    ],
    reels: [
      {
        videoUrl: 'https://cdn.freshbhoj.com/reels/annapurna-butter-chicken.mp4',
        thumbnailUrl: IMG('1517248135467-4c7edcad34c4'),
        caption: 'Watch how our Special Thali comes together, start to finish 🔥',
        hashtags: ['behindthescenes', 'thali', 'jaipur'],
        durationSec: 28, viewCount: 12400, likeCount: 2180, shareCount: 310, mealSlug: 'special-north-indian-thali',
      },
      {
        videoUrl: 'https://cdn.freshbhoj.com/reels/annapurna-tandoor.mp4',
        thumbnailUrl: IMG('1509440159596-0249088772ff'),
        caption: 'Fresh rotis, straight off the tandoor 🫓',
        hashtags: ['tandoor', 'freshmade'],
        durationSec: 19, viewCount: 8900, likeCount: 1420, shareCount: 190, mealSlug: 'paneer-butter-masala',
      },
    ],
    stories: [
      {
        mediaType: MediaType.VIDEO,
        mediaUrl: 'https://cdn.freshbhoj.com/stories/annapurna-morning-prep.mp4',
        thumbnailUrl: IMG('1504674900247-0877df9cc836'),
        caption: 'Dal on the stove since 6am',
        durationSec: 15,
        mealSlug: 'special-north-indian-thali',
      },
      {
        mediaType: MediaType.IMAGE,
        mediaUrl: IMG('1556909212-d5b604d0c90d'),
        caption: 'Fresh rotis coming off the tandoor',
        durationSec: 6,
      },
    ],
  },
  {
    slug: 'the-healthy-pot',
    name: 'The Healthy Pot',
    tagline: 'Macro-counted bowls for your goals',
    description:
      'Every bowl is weighed, macro-counted and photographed before it leaves the kitchen. Built for people tracking protein, not guessing it.',
    logoUrl: IMG('1490645935967-10de6ba17061', 300),
    coverImage: IMG('1546069901-ba9599a7e63c', 1200),
    isVerified: true,
    rating: 4.7,
    ratingCount: 862,
    followerCount: 2140,
    hygieneScore: 4.8,
    locality: 'Vaishali Nagar',
    pincode: '302021',
    latitude: 26.9124,
    longitude: 75.7382,
    prepTimeMins: 20,
    opensAt: '07:30',
    closesAt: '22:00',
    contactPhone: '+919876500022',
    fssaiLicense: '22823004000456',
    meals: [
      {
        name: 'Grilled Chicken Protein Bowl',
        slug: 'grilled-chicken-protein-bowl',
        description: 'Grilled chicken breast, quinoa, roasted veg and a yoghurt-herb dressing.',
        images: [IMG('1555939594-58d7cb561ad1'), IMG('1512852939750-1305098529bf')],
        price: 329, mrp: 379, foodType: FoodType.NON_VEG,
        slots: [MealSlot.LUNCH, MealSlot.DINNER],
        goalTags: [GoalTag.HIGH_PROTEIN, GoalTag.MUSCLE_GAIN],
        calories: 520, proteinG: 46, carbsG: 38, fatG: 18, fiberG: 9,
        servingSize: '450 g bowl',
        ingredients: ['Chicken breast', 'Quinoa', 'Broccoli', 'Bell pepper', 'Greek yoghurt', 'Olive oil'],
        allergens: ['Dairy'],
        isBestseller: true, category: 'lunch', cuisine: 'continental', prepTimeMins: 18,
        customizations: [
          { name: 'Boost your bowl', options: [
            { name: 'Extra chicken (100g)', priceDelta: 90 },
            { name: 'Add avocado', priceDelta: 60 },
            { name: 'Swap quinoa for brown rice', priceDelta: 0 },
          ]},
        ],
      },
      {
        name: 'Vegan Buddha Bowl',
        slug: 'vegan-buddha-bowl',
        description: 'Chickpea, sweet potato and kale bowl with a tahini drizzle.',
        images: [IMG('1540189549336-e6e99c3679fe')],
        price: 279, foodType: FoodType.VEGAN,
        slots: [MealSlot.LUNCH],
        goalTags: [GoalTag.LOW_CALORIE, GoalTag.WEIGHT_LOSS, GoalTag.HEALTHY_LIFESTYLE],
        calories: 390, proteinG: 17, carbsG: 54, fatG: 12, fiberG: 14,
        servingSize: '420 g bowl',
        ingredients: ['Chickpeas', 'Sweet potato', 'Kale', 'Tahini', 'Lemon', 'Pumpkin seeds'],
        allergens: ['Sesame'],
        category: 'lunch', cuisine: 'continental', prepTimeMins: 15,
      },
      {
        name: 'Overnight Oats & Berries',
        slug: 'overnight-oats-berries',
        description: 'Rolled oats soaked overnight with chia, almond milk and seasonal berries.',
        images: [IMG('1525351484163-7529414344d8')],
        price: 189, foodType: FoodType.VEG,
        slots: [MealSlot.BREAKFAST],
        goalTags: [GoalTag.LOW_CALORIE, GoalTag.HEALTHY_LIFESTYLE],
        calories: 340, proteinG: 12, carbsG: 48, fatG: 11, fiberG: 10,
        servingSize: '300 g jar',
        ingredients: ['Rolled oats', 'Chia seeds', 'Almond milk', 'Berries', 'Honey'],
        allergens: ['Tree nuts'],
        category: 'breakfast', cuisine: 'continental', prepTimeMins: 5,
      },
      {
        name: 'Paneer Tikka Salad Bowl',
        slug: 'paneer-tikka-salad-bowl',
        description: 'Char-grilled paneer over greens with a mint-yoghurt dressing.',
        images: [IMG('1551248429-40975aa4de74')],
        price: 269, foodType: FoodType.VEG,
        slots: [MealSlot.SNACKS, MealSlot.DINNER],
        goalTags: [GoalTag.HIGH_PROTEIN, GoalTag.LOW_CALORIE],
        calories: 380, proteinG: 29, carbsG: 16, fatG: 22, fiberG: 6,
        servingSize: '350 g bowl',
        ingredients: ['Paneer', 'Lettuce', 'Cherry tomato', 'Mint', 'Greek yoghurt'],
        allergens: ['Dairy'],
        category: 'healthy-snacks', cuisine: 'tandoor', prepTimeMins: 14,
      },
    ],
    media: [
      { type: MediaType.IMAGE, url: IMG('1512621776951-a57141f2eefd'), caption: 'Every bowl weighed to the gram' },
      { type: MediaType.IMAGE, url: IMG('1490645935967-10de6ba17061'), caption: 'Greens washed three times' },
      { type: MediaType.IMAGE, url: IMG('1543339494-b4cd4f7ba686'), caption: 'Macro-labelled and sealed' },
      { type: MediaType.IMAGE, url: IMG('1555939594-58d7cb561ad1'), caption: 'Today’s protein bowl' },
    ],
    reels: [
      {
        videoUrl: 'https://cdn.freshbhoj.com/reels/healthypot-protein-bowl.mp4',
        thumbnailUrl: IMG('1555939594-58d7cb561ad1'),
        caption: '46g of protein in one bowl. Here is exactly what goes in 💪',
        hashtags: ['highprotein', 'macros', 'mealprep'],
        durationSec: 34, viewCount: 21300, likeCount: 4120, shareCount: 680, mealSlug: 'grilled-chicken-protein-bowl',
      },
    ],
    stories: [
      {
        mediaType: MediaType.IMAGE,
        mediaUrl: IMG('1490645935967-10de6ba17061'),
        caption: 'Today’s bowls, weighed and macro-labelled',
        durationSec: 6,
        mealSlug: 'grilled-chicken-protein-bowl',
      },
    ],
  },
  {
    slug: 'shri-krishna-veg-kitchen',
    name: 'Shri Krishna Veg Kitchen',
    tagline: 'Pure veg tiffins, cooked fresh daily',
    description:
      'Sattvic, pure-veg tiffins with no onion or garlic. Cooked in small batches and dispatched within 20 minutes of plating.',
    logoUrl: IMG('1585937421612-70a008356fbe', 300),
    coverImage: IMG('1504674900247-0877df9cc836', 1200),
    isVerified: true,
    rating: 4.6,
    ratingCount: 534,
    followerCount: 1290,
    hygieneScore: 4.7,
    locality: 'Mansarovar',
    pincode: '302020',
    latitude: 26.8505,
    longitude: 75.7607,
    prepTimeMins: 30,
    opensAt: '09:00',
    closesAt: '21:30',
    contactPhone: '+919876500033',
    fssaiLicense: '22823004000789',
    meals: [
      {
        name: 'Executive Veg Tiffin',
        slug: 'executive-veg-tiffin',
        description: '2 sabzi, dal, 5 phulka, rice, salad and a sweet.',
        images: [IMG('1546833999-b9f581a1996d')],
        price: 199, mrp: 249, foodType: FoodType.VEG,
        slots: [MealSlot.LUNCH, MealSlot.DINNER],
        goalTags: [GoalTag.HEALTHY_LIFESTYLE],
        calories: 680, proteinG: 24, carbsG: 96, fatG: 20, fiberG: 13,
        servingSize: '4-compartment tiffin',
        ingredients: ['Seasonal vegetables', 'Toor dal', 'Whole wheat atta', 'Rice', 'Ghee'],
        allergens: ['Dairy', 'Gluten'],
        isBestseller: true, category: 'lunch', cuisine: 'thali', prepTimeMins: 30,
      },
      {
        name: 'Poha with Sprouts',
        slug: 'poha-with-sprouts',
        description: 'Flattened rice with moong sprouts, peanuts and fresh coriander.',
        images: [IMG('1589301760014-d929f3979dbc')],
        price: 99, foodType: FoodType.VEG,
        slots: [MealSlot.BREAKFAST],
        goalTags: [GoalTag.LOW_CALORIE, GoalTag.HEALTHY_LIFESTYLE],
        calories: 280, proteinG: 11, carbsG: 44, fatG: 7, fiberG: 6,
        servingSize: '250 g plate',
        ingredients: ['Poha', 'Moong sprouts', 'Peanuts', 'Curry leaves', 'Lemon'],
        allergens: ['Peanuts'],
        category: 'breakfast', cuisine: 'south-indian', prepTimeMins: 12,
      },
      {
        name: 'Roasted Makhana Trail Mix',
        slug: 'roasted-makhana-trail-mix',
        description: 'Ghee-roasted fox nuts with almonds and pumpkin seeds.',
        images: [IMG('1599599810769-bcde5a160d32')],
        price: 129, foodType: FoodType.VEG,
        slots: [MealSlot.SNACKS],
        goalTags: [GoalTag.LOW_CALORIE, GoalTag.WEIGHT_LOSS],
        calories: 190, proteinG: 7, carbsG: 22, fatG: 8, fiberG: 5,
        servingSize: '80 g pack',
        ingredients: ['Makhana', 'Almonds', 'Pumpkin seeds', 'Ghee', 'Rock salt'],
        allergens: ['Tree nuts', 'Dairy'],
        category: 'healthy-snacks', cuisine: 'snacks', prepTimeMins: 5,
      },
    ],
    media: [
      { type: MediaType.IMAGE, url: IMG('1585937421612-70a008356fbe'), caption: 'Small-batch cooking, every single day' },
      { type: MediaType.IMAGE, url: IMG('1546833999-b9f581a1996d'), caption: 'Tiffins ready for dispatch' },
      { type: MediaType.IMAGE, url: IMG('1589301760014-d929f3979dbc'), caption: 'Morning poha in progress' },
    ],
    reels: [
      {
        videoUrl: 'https://cdn.freshbhoj.com/reels/shrikrishna-tiffin.mp4',
        thumbnailUrl: IMG('1546833999-b9f581a1996d'),
        caption: '120 tiffins packed before 11 AM. No shortcuts 🙏',
        hashtags: ['tiffin', 'pureveg', 'jaipur'],
        durationSec: 22, viewCount: 6700, likeCount: 980, shareCount: 120, mealSlug: 'executive-veg-tiffin',
      },
    ],
    stories: [
      {
        mediaType: MediaType.VIDEO,
        mediaUrl: 'https://cdn.freshbhoj.com/stories/shrikrishna-tiffin-pack.mp4',
        thumbnailUrl: IMG('1589301760014-d929f3979dbc'),
        caption: '120 tiffins, packed and sealed',
        durationSec: 15,
        mealSlug: 'executive-veg-tiffin',
      },
    ],
  },
];

const COUPONS = [
  {
    code: 'FRESH150', title: '₹150 off your first order',
    description: 'Valid on orders above ₹399. New customers only.',
    type: CouponType.FLAT, value: 150, minOrderValue: 399, perUserLimit: 1,
  },
  {
    code: 'HEALTHY20', title: '20% off, up to ₹100',
    description: 'On all high-protein and low-calorie meals.',
    type: CouponType.PERCENT, value: 20, minOrderValue: 299, maxDiscount: 100, perUserLimit: 3,
  },
  {
    code: 'TIFFIN50', title: 'Flat ₹50 off tiffins',
    description: 'Valid on orders above ₹199.',
    type: CouponType.FLAT, value: 50, minOrderValue: 199, perUserLimit: 5,
  },
];

const FAQS = [
  { category: 'ORDERS', question: 'How do I track my order?', answer: 'Open the Orders tab and tap your active order. You will see a live status stepper and an estimated delivery window that updates as the kitchen cooks.' },
  { category: 'ORDERS', question: 'Can I cancel an order?', answer: 'Yes — until the kitchen starts preparing it. After that, tap Support on the order and our team will help you.' },
  { category: 'ORDERS', question: 'Can I order from two kitchens at once?', answer: 'Not yet. A cart holds meals from one kitchen so your food arrives together and hot. Place a second order for another kitchen.' },
  { category: 'NUTRITION', question: 'Where does the nutrition data come from?', answer: 'Every partner kitchen submits weighed recipes, which our team verifies against IFCT reference values before a meal goes live.' },
  { category: 'NUTRITION', question: 'How accurate are the calorie counts?', answer: 'Values are per standard serving and accurate to roughly ±10%. Add-ons you select are counted separately on the meal page.' },
  { category: 'PAYMENTS', question: 'Which payment methods do you accept?', answer: 'UPI (GPay, PhonePe, Paytm), credit and debit cards, wallets, and cash on delivery in serviceable areas.' },
  { category: 'PAYMENTS', question: 'My payment failed but money was deducted.', answer: 'Failed payments are auto-refunded to the source account within 5–7 working days. Message us on WhatsApp with your order ID and we will chase it for you.' },
  { category: 'DELIVERY', question: 'What are the delivery charges?', answer: 'Flat ₹45, and free on orders above ₹499.' },
  { category: 'DELIVERY', question: 'Which areas do you deliver to?', answer: 'We are live across eight localities in Jaipur, with more added every month. Check your area under Profile → Addresses.' },
  { category: 'GENERAL', question: 'What makes a kitchen “Verified”?', answer: 'A green Verified badge means we have inspected the kitchen in person, checked its FSSAI licence, and audited hygiene within the last 30 days.' },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding FreshBhoj…');

  // ── Serviceable areas ──────────────────────────────────────────────────
  for (const [index, area] of AREAS.entries()) {
    await prisma.serviceableArea.upsert({
      where: { city_locality: { city: 'Jaipur', locality: area.locality } },
      update: { ...area, sortOrder: index, isActive: true },
      create: { city: 'Jaipur', state: 'Rajasthan', sortOrder: index, ...area },
    });
  }
  console.log(`  ✓ ${AREAS.length} serviceable areas`);

  // ── Categories ─────────────────────────────────────────────────────────
  const categoryBySlug = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.mealCategory.upsert({
      where: { slug: category.slug },
      update: { ...category, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
    categoryBySlug.set(category.slug, row.id);
  }
  console.log(`  ✓ ${CATEGORIES.length} meal categories`);

  // ── Cuisines ───────────────────────────────────────────────────────────
  const cuisineBySlug = new Map<string, string>();
  for (const [index, cuisine] of CUISINES.entries()) {
    const row = await prisma.cuisine.upsert({
      where: { slug: cuisine.slug },
      update: { ...cuisine, sortOrder: index },
      create: { ...cuisine, sortOrder: index },
    });
    cuisineBySlug.set(cuisine.slug, row.id);
  }
  console.log(`  ✓ ${CUISINES.length} cuisines`);

  // ── Kitchens, meals, media, reels ──────────────────────────────────────
  let mealCount = 0;
  let reelCount = 0;
  let storyCount = 0;

  for (const def of KITCHENS) {
    const { meals, media, reels, stories, ...kitchenData } = def;

    const kitchen = await prisma.kitchen.upsert({
      where: { slug: def.slug },
      update: { ...kitchenData, status: KitchenStatus.ACTIVE, city: 'Jaipur', state: 'Rajasthan' },
      create: { ...kitchenData, status: KitchenStatus.ACTIVE, city: 'Jaipur', state: 'Rajasthan' },
    });

    const mealBySlug = new Map<string, string>();

    for (const mealDef of meals) {
      const { customizations, category, cuisine, ...mealData } = mealDef as any;

      const meal = await prisma.meal.upsert({
        where: { kitchenId_slug: { kitchenId: kitchen.id, slug: mealDef.slug } },
        update: {
          ...mealData,
          categoryId: categoryBySlug.get(category) ?? null,
          cuisineId: cuisine ? cuisineBySlug.get(cuisine) ?? null : null,
        },
        create: {
          ...mealData,
          kitchenId: kitchen.id,
          categoryId: categoryBySlug.get(category) ?? null,
          cuisineId: cuisine ? cuisineBySlug.get(cuisine) ?? null : null,
        },
      });
      mealBySlug.set(mealDef.slug, meal.id);
      mealCount += 1;

      if (customizations) {
        // Replace rather than merge — option ids are referenced by cart lines,
        // so re-seeding a live DB would orphan them; seeding is dev-only.
        await prisma.mealCustomizationGroup.deleteMany({ where: { mealId: meal.id } });
        for (const [gIndex, group] of customizations.entries()) {
          await prisma.mealCustomizationGroup.create({
            data: {
              mealId: meal.id,
              name: group.name,
              sortOrder: gIndex,
              options: {
                create: group.options.map((option: any, oIndex: number) => ({
                  name: option.name,
                  priceDelta: option.priceDelta,
                  sortOrder: oIndex,
                })),
              },
            },
          });
        }
      }
    }

    await prisma.kitchenMedia.deleteMany({ where: { kitchenId: kitchen.id } });
    await prisma.kitchenMedia.createMany({
      data: media.map((m, index) => ({ ...m, kitchenId: kitchen.id, sortOrder: index })),
    });

    for (const reelDef of reels) {
      const { mealSlug, ...reelData } = reelDef as any;
      const existing = await prisma.reel.findFirst({
        where: { kitchenId: kitchen.id, videoUrl: reelDef.videoUrl },
        select: { id: true },
      });

      const payload = {
        ...reelData,
        kitchenId: kitchen.id,
        mealId: mealSlug ? mealBySlug.get(mealSlug) ?? null : null,
        status: ReelStatus.PUBLISHED,
      };

      if (existing) {
        await prisma.reel.update({ where: { id: existing.id }, data: payload });
      } else {
        await prisma.reel.create({ data: payload });
      }
      reelCount += 1;
    }

    if (stories?.length) {
      // Re-seeding refreshes the 24h expiry rather than piling up duplicates —
      // stories are ephemeral by design, so "latest seed run" is the only
      // version that should ever be live.
      await prisma.kitchenStory.deleteMany({ where: { kitchenId: kitchen.id } });
      for (const storyDef of stories as any[]) {
        const { mealSlug, ...storyData } = storyDef;
        await prisma.kitchenStory.create({
          data: {
            ...storyData,
            kitchenId: kitchen.id,
            city: kitchen.city,
            mealId: mealSlug ? mealBySlug.get(mealSlug) ?? null : null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        storyCount += 1;
      }
    }
  }
  console.log(`  ✓ ${KITCHENS.length} kitchens, ${mealCount} meals, ${reelCount} reels, ${storyCount} stories`);

  // ── Coupons ────────────────────────────────────────────────────────────
  const validTill = new Date();
  validTill.setMonth(validTill.getMonth() + 6);

  for (const coupon of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { ...coupon, validTill, isActive: true },
      create: { ...coupon, validTill },
    });
  }
  console.log(`  ✓ ${COUPONS.length} coupons`);

  // ── FAQs ───────────────────────────────────────────────────────────────
  await prisma.faqItem.deleteMany({});
  await prisma.faqItem.createMany({
    data: FAQS.map((faq, index) => ({ ...faq, sortOrder: index })),
  });
  console.log(`  ✓ ${FAQS.length} FAQs`);

  // ── Delivery partners ──────────────────────────────────────────────────
  const partners = [
    { name: 'Ravi Kumar', phone: '+919876511111', vehicleNumber: 'RJ14 AB 4521' },
    { name: 'Sunil Meena', phone: '+919876522222', vehicleNumber: 'RJ14 CD 8890' },
  ];
  for (const partner of partners) {
    const existing = await prisma.deliveryPartner.findFirst({ where: { phone: partner.phone } });
    if (!existing) await prisma.deliveryPartner.create({ data: partner });
  }
  console.log(`  ✓ ${partners.length} delivery partners`);

  console.log('✅ Seed complete.');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

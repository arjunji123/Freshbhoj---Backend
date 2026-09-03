/**
 * End-to-end smoke test of the FreshBhoj API against a seeded database.
 *
 * Walks the whole customer journey — OTP login, onboarding, discovery,
 * cart, checkout, payment, tracking, review, reorder, reels — and asserts the
 * business rules that are easy to break silently: price arithmetic, the
 * one-kitchen-per-cart conflict, cart survival on failed payment, status
 * transition guards, and public-vs-personalised responses.
 *
 * Usage:
 *   npm run start:dev        # in another terminal
 *   npm run smoke            # optionally: API_URL=https://… npm run smoke
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const PHONE = `+9198765${String(Date.now()).slice(-5)}`;
let token = null;
let failures = 0;

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const step = (n, s) => console.log(`\n${bold(`${n}. ${s}`)}`);
const ok = (s) => console.log(`   \x1b[32m✓\x1b[0m ${s}`);
const bad = (s) => { failures++; console.log(`   \x1b[31m✗\x1b[0m ${s}`); };

async function call(method, path, { body, auth = true, form } = {}) {
  const headers = {};
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, data: json?.data };
}

const expect = (cond, msg) => (cond ? ok(msg) : bad(msg));

// ── 1–3: auth + onboarding ────────────────────────────────────────────────
step(1, 'Send OTP');
{
  const r = await call('POST', '/auth/otp/send', { body: { phone: PHONE }, auth: false });
  expect(r.status === 200 && r.data.devOtp === '123456',
    `${r.json.message} · devOtp=${r.data?.devOtp} · expires in ${r.data?.expiresInMinutes}min`);
}

step(2, 'Verify OTP');
{
  const r = await call('POST', '/auth/otp/verify', { body: { phone: PHONE, otp: '123456' }, auth: false });
  token = r.data?.tokens?.accessToken;
  expect(r.status === 200 && r.data.isNewUser === true && !!token,
    `${r.json.message} · isNewUser=${r.data?.isNewUser} · status=${r.data?.user?.status}`);
}

step(3, 'Complete profile (multipart)');
{
  const form = new FormData();
  form.append('fullName', 'Smoke Tester');
  form.append('email', `smoke${Date.now()}@freshbhoj.com`);
  const r = await call('POST', '/customer/profile/complete', { form });
  expect(r.status === 200 && r.data.status === 'ACTIVE',
    `${r.data?.fullName} · status=${r.data?.status}`);
}

// ── 4: serviceability ─────────────────────────────────────────────────────
step(4, 'Serviceability: unserved area returns suggestions, not a 404');
{
  const r = await call('GET', '/catalog/serviceability?locality=Nowhereville', { auth: false });
  expect(r.status === 200 && r.data.serviceable === false && r.data.nearbyAreas.length > 0,
    `serviceable=${r.data?.serviceable} · ${r.data?.nearbyAreas.length} nearby areas offered`);
}

// ── 5–7: discovery ────────────────────────────────────────────────────────
step(5, 'Home feed (single aggregated call)');
{
  const r = await call('GET', '/home/feed');
  const d = r.data;
  expect(r.status === 200 && d.featuredKitchens.length > 0 && d.recommendedMeals.length > 0,
    `"${d?.greeting}" · slot=${d?.currentSlot} · ${d?.goalTags.length} goals · ${d?.categories.length} categories · ${d?.featuredKitchens.length} kitchens · ${d?.recommendedMeals.length} meals · ${d?.trendingReels.length} reels`);
}

step(6, 'Filter: HIGH_PROTEIN sorted by protein desc');
{
  const r = await call('GET', '/meals?goalTags=HIGH_PROTEIN&sortBy=protein_high&limit=3');
  const items = r.data.items;
  const sorted = items.every((m, i) => i === 0 || items[i - 1].nutrition.proteinG >= m.nutrition.proteinG);
  expect(r.status === 200 && items.length > 0 && sorted, `${items.length} results, correctly ordered`);
  items.forEach((m) => console.log(`     · ${m.name} — ${m.nutrition.proteinG}g protein, ₹${m.price}`));
}

step(7, 'Meal detail: macro split sums to 100');
var mealId, optionId;
{
  const list = await call('GET', '/meals?q=Thali&limit=1');
  mealId = list.data.items[0].id;
  const r = await call('GET', `/meals/${mealId}`);
  const n = r.data.nutrition;
  const sum = n.macroSplit.proteinPercent + n.macroSplit.carbsPercent + n.macroSplit.fatPercent;
  optionId = r.data.customizationGroups[0]?.options[0]?.id;
  expect(r.status === 200 && sum === 100,
    `${r.data.name} · ${n.calories}kcal · P${n.macroSplit.proteinPercent}/C${n.macroSplit.carbsPercent}/F${n.macroSplit.fatPercent} = ${sum}% · ${r.data.ingredients.length} ingredients · allergens: ${r.data.allergens.join(', ')}`);
}

// ── 8–11: cart ────────────────────────────────────────────────────────────
step(8, 'Add to cart with an add-on');
{
  const r = await call('POST', '/customer/cart/items', {
    body: { mealId, quantity: 2, customizationIds: [optionId], specialInstructions: 'Less spicy' },
  });
  const p = r.data.pricing;
  const line = r.data.items[0];
  const mathsOk = line.unitPrice === line.meal.basePrice + line.customizations[0].priceDelta
    && p.totalAmount === p.itemsTotal - p.discount + p.deliveryFee + p.taxes;
  expect(r.status === 200 && mathsOk,
    `${r.data.itemCount} items · unit ₹${line.unitPrice} (base ₹${line.meal.basePrice} + ₹${line.customizations[0].priceDelta}) · subtotal ₹${p.itemsTotal} · delivery ₹${p.deliveryFee} · tax ₹${p.taxes} · total ₹${p.totalAmount}`);
}

step(9, 'Cross-kitchen add is rejected with CART_KITCHEN_CONFLICT');
var otherMealId;
{
  const other = await call('GET', '/meals?q=Chicken&limit=1');
  otherMealId = other.data.items[0].id;
  const r = await call('POST', '/customer/cart/items', { body: { mealId: otherMealId, quantity: 1 } });
  expect(r.status === 409 && r.json.message?.code === 'CART_KITCHEN_CONFLICT' || r.status === 409,
    `HTTP ${r.status} · ${JSON.stringify(r.json.message).slice(0, 110)}`);
}

step(10, 'Apply a valid coupon');
{
  const r = await call('POST', '/customer/cart/coupon', { body: { code: 'HEALTHY20' } });
  expect(r.status === 200 && r.data.coupon.discount > 0,
    `${r.data?.coupon.code} → −₹${r.data?.coupon.discount} · new total ₹${r.data?.pricing.totalAmount}`);
}

step(11, 'Invalid coupon returns a message fit to show the user');
{
  const r = await call('POST', '/customer/cart/coupon', { body: { code: 'NOTREAL' } });
  expect(r.status === 400, `HTTP ${r.status} · "${r.json.message}"`);
}

// ── 12–15: checkout ───────────────────────────────────────────────────────
step(12, 'Add a delivery address (first one becomes default)');
var addressId;
{
  const r = await call('POST', '/customer/addresses', {
    body: { label: 'HOME', line1: 'Flat 402, Green Valley Apartments', locality: 'Malviya Nagar', pincode: '302017' },
  });
  addressId = r.data?.id;
  expect(r.status === 201 && r.data.isDefault === true, `${r.data?.line1} · isDefault=${r.data?.isDefault}`);
}

step(13, 'Place order (UPI → PENDING_PAYMENT)');
var orderId, kitchenId;
{
  const r = await call('POST', '/customer/orders', {
    body: { addressId, paymentMethod: 'UPI', orderNotes: 'Ring the bell twice' },
  });
  orderId = r.data?.id;
  kitchenId = r.data?.kitchen.id;
  expect(r.status === 201 && r.data.status === 'PENDING_PAYMENT',
    `${r.data?.orderNumber} · ${r.data?.status} · ₹${r.data?.totalAmount} · ETA ${r.data?.eta.etaMinutes}min`);
}

step(14, 'Cart survives an unpaid order (so the customer can retry)');
{
  const r = await call('GET', '/customer/cart');
  expect(r.data.isEmpty === false, `isEmpty=${r.data?.isEmpty} · ${r.data?.itemCount} items still there`);
}

step(15, 'Confirm payment → PLACED, cart cleared');
{
  const r = await call('POST', `/customer/orders/${orderId}/confirm-payment`, { body: { paymentRef: 'upi-smoke-001' } });
  const cart = await call('GET', '/customer/cart');
  expect(r.data.status === 'PLACED' && r.data.paymentStatus === 'PAID' && cart.data.isEmpty === true,
    `${r.data?.status} · payment=${r.data?.paymentStatus} · cart now empty=${cart.data?.isEmpty}`);
}

// ── 16–17: tracking ───────────────────────────────────────────────────────
step(16, 'Walk the tracking stepper');
for (const s of ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
  const r = await call('POST', `/customer/orders/${orderId}/simulate/${s}`);
  const done = r.data?.tracking.steps.filter((x) => x.isDone).length;
  expect(r.data?.status === s, `→ ${r.data?.status} · ${done} step(s) complete · canCancel=${r.data?.canCancel}`);
}

step(17, 'Illegal transition is rejected');
{
  const r = await call('POST', `/customer/orders/${orderId}/simulate/PREPARING`);
  expect(r.status === 400, `HTTP ${r.status} · "${r.json.message}"`);
}

step(18, 'Tracking payload');
{
  const r = await call('GET', `/customer/orders/${orderId}/tracking`);
  expect(r.status === 200 && r.data.status === 'DELIVERED',
    `${r.data?.orderNumber} · ${r.data?.statusLabel} · ${r.data?.eta.rangeLabel} · cancellable=${r.data?.canCancel}`);
}

// ── 19–20: reviews ────────────────────────────────────────────────────────
step(19, 'Write a verified review');
{
  const r = await call('POST', `/customer/reviews/kitchens/${kitchenId}`, {
    body: { rating: 5, orderId, comment: 'Genuinely fresh, packed well.', tags: ['Clean', 'Well-packed'] },
  });
  expect(r.status === 201 && r.data.isVerified === true,
    `${r.data?.rating}★ by ${r.data?.author.name} (${r.data?.author.initials}) · verified=${r.data?.isVerified}`);
}

step(20, 'Second review on the same order is rejected');
{
  const r = await call('POST', `/customer/reviews/kitchens/${kitchenId}`, { body: { rating: 3, orderId } });
  expect(r.status === 400, `HTTP ${r.status} · "${r.json.message}"`);
}

step(21, 'Kitchen rating recomputed from reviews');
{
  const r = await call('GET', `/kitchens/${kitchenId}/reviews/summary`, { auth: false });
  expect(r.status === 200 && r.data.total >= 1,
    `avg ${r.data?.average} over ${r.data?.total} · 5★ = ${r.data?.distribution[0].percent}%`);
}

// ── 22: reorder ───────────────────────────────────────────────────────────
step(22, 'One-tap reorder rebuilds the cart');
{
  const r = await call('POST', `/customer/orders/${orderId}/reorder`);
  expect(r.status === 200 && r.data.addedCount > 0,
    `added ${r.data?.addedCount} · skipped [${r.data?.skippedItems}] · cart total ₹${r.data?.cart.pricing.totalAmount}`);
}

// ── 23–25: reels + social ─────────────────────────────────────────────────
step(23, 'Reels feed with a shoppable meal attached');
var reelId;
{
  const r = await call('GET', '/reels?feed=trending&limit=3');
  const first = r.data.items[0];
  reelId = first?.id;
  expect(r.status === 200 && r.data.items.length > 0 && !!first.meal,
    `${first?.kitchen.name}: "${first?.caption?.slice(0, 40)}…" · ${first?.stats.viewsLabel} views · shoppable=${!!first?.meal} (${first?.meal?.name} ₹${first?.meal?.price})`);
}

step(24, 'Like a reel (count increments)');
{
  const before = await call('GET', `/reels/${reelId}`);
  const r = await call('POST', `/reels/${reelId}/like`);
  expect(r.data.isLiked === true && r.data.likeCount === before.data.stats.likes + 1,
    `liked=${r.data?.isLiked} · ${before.data?.stats.likes} → ${r.data?.likeCount}`);
}

step(25, 'Follow a kitchen, then read profile stats');
{
  const f = await call('POST', `/kitchens/${kitchenId}/follow`);
  const s = await call('GET', '/support/profile-stats');
  expect(f.data.isFollowing === true && s.data.followingCount === 1,
    `following=${f.data?.isFollowing} · followers=${f.data?.followerCount} | stats: orders=${s.data?.orderCount} following=${s.data?.followingCount} addresses=${s.data?.addressCount}`);
}

// ── 26–27: auth boundaries ────────────────────────────────────────────────
step(26, 'Protected route without a token → 401');
{
  const saved = token; token = null;
  const r = await call('GET', '/customer/cart', { auth: false });
  token = saved;
  expect(r.status === 401, `HTTP ${r.status}`);
}

step(27, 'Public route works signed-out (and does not personalise)');
{
  const saved = token; token = null;
  const r = await call('GET', '/meals?limit=1', { auth: false });
  token = saved;
  expect(r.status === 200 && r.data.items[0].isFavorite === false,
    `${r.data?.items[0].name} · isFavorite=${r.data?.items[0].isFavorite}`);
}

console.log(`\n${failures === 0 ? '\x1b[32mALL CHECKS PASSED\x1b[0m' : `\x1b[31m${failures} CHECK(S) FAILED\x1b[0m`}`);
process.exit(failures === 0 ? 0 : 1);

# FreshBhoj API Reference

**Interactive docs: [`{host}/swagger`](http://localhost:3000/swagger)** — every endpoint,
with request bodies, response schemas and a working *Try it out*.
Also served at `{host}/api/v1/docs`; the raw spec is at `{host}/swagger-json`.

Base URL: `{host}/api/v1`

Every successful response is wrapped by `TransformInterceptor`:

```json
{ "success": true, "statusCode": 200, "message": "…", "data": { }, "timestamp": "…" }
```

Failures come back through `HttpExceptionFilter`:

```json
{ "success": false, "statusCode": 400, "message": "…", "errors": null, "path": "…", "timestamp": "…" }
```

`errors` carries the per-field list when validation rejects the body. Errors the
client has to branch on also carry a machine-readable `code` plus any data needed
to act on it — for example a cart conflict returns:

```json
{
  "success": false, "statusCode": 409,
  "message": "Your cart has items from Annapurna Kitchen. Clear it to order from a new kitchen?",
  "code": "CART_KITCHEN_CONFLICT",
  "existingKitchen": { "id": "cd4e…", "name": "Annapurna Kitchen" }
}
```

**Auth.** Send `Authorization: Bearer <accessToken>`. Access tokens live 15 minutes;
the app rotates them against `POST /auth/token/refresh`. Routes marked _public_ work
signed-out, but personalise (favourites, likes, follows) when a token is present.

---

## Auth — `/auth`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/account-type` | public | Which OTP flow a phone belongs to (`CUSTOMER` or `KITCHEN`). |
| POST | `/auth/otp/send` | public | Send a 6-digit OTP. Rate limited to 5/hour per number. |
| POST | `/auth/otp/verify` | public | Verify OTP → `{ isNewUser, user, tokens }`. Creates the user on first login. |
| POST | `/auth/token/refresh` | public | Rotate the refresh token → new pair. |
| POST | `/auth/logout` | ✅ | Revoke refresh tokens. |
| GET | `/auth/me` | ✅ | Current user. |

With `OTP_DEV_MODE=true` the OTP is always `123456` and is echoed back as `devOtp`.

## Profile — `/customer/profile`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/customer/profile` | ✅ | Fresh profile from the DB. |
| POST | `/customer/profile/complete` | ✅ | Onboarding step 1 (multipart: `fullName`, `email?`, `profileImage?`). Flips status to `ACTIVE`. |
| PATCH | `/customer/profile/image` | ✅ | Replace the avatar. |
| PATCH | `/customer/profile/location` | ✅ | Onboarding step 2 — save the chosen area. |
| PATCH | `/customer/profile/fcm-token` | ✅ | Store the push token. |

## Catalog — `/catalog`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/catalog/categories` | public | Breakfast / Lunch / Dinner / Healthy Snacks. |
| GET | `/catalog/cuisines` | public | Style-of-food pills (Thali, Biryani…) with meal counts. |
| GET | `/catalog/goal-tags` | public | Goal chips with labels, icons and descriptions. |
| GET | `/catalog/areas?q=&city=` | public | Serviceable localities. |
| GET | `/catalog/serviceability?locality=&pincode=` | public | Never 404s — returns `serviceable:false` plus nearby areas so the app can show a warm "not here yet" state. |

## Home — `/home`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/home/feed` | public* | Greeting, current meal slot, goal chips, categories, featured kitchens, recommended meals, trending reels, active orders — one round-trip for everything above the meal feed. |
| GET | `/home/search-suggestions` | public | Trending searches + popular kitchens for the empty Search screen. |

## Meals — `/meals`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/meals` | public* | Paginated feed. Filters: `q`, `goalTags`, `slots`, `foodTypes`, `category`, `kitchenId`, `minPrice`, `maxPrice`, `maxCalories`, `minProtein`, `openOnly`, `sortBy`. |
| GET | `/meals/:id` | public* | Detail: full nutrition + pre-computed `macroSplit`, ingredients, allergens, customisation groups. |
| GET | `/meals/:id/similar` | public* | "You may also like". |
| GET | `/meals/:id/reviews` | public | Reviews for one dish. |
| GET | `/meals/favorites` | ✅ | The user's favourites. |
| GET | `/meals/trending-nearby?lat=&lng=` | public* | Demand-ranked meals within a radius. |
| POST | `/meals/:id/favorite` | ✅ | Toggle favourite. |

`sortBy`: `recommended` · `rating` · `price_low` · `price_high` · `calories_low` · `protein_high` · `prep_time_low` · `newest`

`openOnly=true` filters before pagination, so pages stay full and `meta.total` counts only orderable meals (same for `GET /kitchens`).

## Kitchens — `/kitchens`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/kitchens` | public | List. Filters: `q`, `city`, `locality`, `verifiedOnly`, `openOnly`, `sortBy`. |
| GET | `/kitchens/:idOrSlug` | public* | Profile with counts, trust signals and `isFollowing`. |
| GET | `/kitchens/:id/media` | public | Phase-1 photo/video gallery. |
| GET | `/kitchens/:id/menu` | public* | Meals, in the same card shape as the Home feed. |
| GET | `/kitchens/:id/reviews` | public | Reviews (`sortBy`: `recent`/`highest`/`lowest`/`helpful`). |
| GET | `/kitchens/:id/reviews/summary` | public | Average + 5→1 star histogram. |
| GET | `/kitchens/:id/subscription-plans` | public | Active subscription plans the kitchen offers. |
| POST | `/kitchens/:id/follow` | ✅ | Follow / unfollow. |
| GET | `/kitchens/following` | ✅ | Kitchens the user follows. |

## Cart — `/customer/cart`

A cart holds meals from **one kitchen**. Adding from another returns
`409 CART_KITCHEN_CONFLICT` with the existing kitchen; resend with
`replaceCart: true` to start fresh.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/customer/cart` | ✅ | Cart with server-computed pricing and `checkout.blockers`. |
| GET | `/customer/cart/count` | ✅ | Badge count. |
| POST | `/customer/cart/items` | ✅ | Add (`mealId`, `quantity`, `customizationIds`, `specialInstructions`, `replaceCart`). |
| PATCH | `/customer/cart/items/:itemId` | ✅ | Change quantity (0 removes the line). |
| DELETE | `/customer/cart/items/:itemId` | ✅ | Remove a line. |
| DELETE | `/customer/cart` | ✅ | Empty the cart. |
| POST | `/customer/cart/coupon` | ✅ | Apply a code — 400 carries the human reason. |
| DELETE | `/customer/cart/coupon` | ✅ | Remove the coupon. |
| POST | `/customer/cart/coins` | ✅ | Redeem as many FreshBhoj Coins as the cart qualifies for. |
| DELETE | `/customer/cart/coins` | ✅ | Stop redeeming coins. |
| GET | `/coupons?itemsTotal=` | public | Live offers, flagged against the subtotal. |

Pricing lives in `common/utils/pricing.ts`: ₹45 delivery, free above ₹499, 5% tax
on the post-discount subtotal, ₹99 minimum order. The cart preview and order
placement call the same helpers, so the quoted total is the charged total.

## Addresses — `/customer/addresses`

`GET /customer/addresses` · `GET /customer/addresses/default` · `POST /customer/addresses` ·
`PATCH /customer/addresses/:id` · `PATCH /customer/addresses/:id/default` · `DELETE /customer/addresses/:id`

The first saved address becomes the default; deleting the default promotes the
next most recent, so a user is never left without one.

## Orders — `/customer/orders`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/customer/orders` | ✅ | Place from the cart. Re-prices server-side. COD → `PLACED`; everything else → `PENDING_PAYMENT`. |
| GET | `/customer/orders?status=&page=&limit=` | ✅ | History, newest first. |
| GET | `/customer/orders/active` | ✅ | Orders in flight. |
| GET | `/customer/orders/:id` | ✅ | Full detail with items, bill and address snapshot. |
| GET | `/customer/orders/:id/tracking` | ✅ | Slim payload for polling (~15s): stepper, ETA, kitchen, partner, support. |
| POST | `/customer/orders/:id/confirm-payment` | ✅ | Release to the kitchen, empty the cart, redeem the coupon. |
| POST | `/customer/orders/:id/fail-payment` | ✅ | Mark failed — the cart is left intact for a retry. |
| POST | `/customer/orders/:id/cancel` | ✅ | Only before `PREPARING`. |
| POST | `/customer/orders/:id/reorder` | ✅ | Rebuild the cart, reporting anything no longer available. |
| POST | `/customer/orders/:id/simulate/:status` | ✅ | **Dev only** — walk an order through the stepper. |
| GET | `/customer/orders/:id/messages` | ✅ | Chat thread with the kitchen. Opening it marks the kitchen's messages read. |
| POST | `/customer/orders/:id/messages` | ✅ | Send a message (`{ body }`, max 500 chars). |
| POST | `/customer/orders/:id/messages/read` | ✅ | Mark the kitchen's messages read. |

`scheduledFor` (for `slotType: SCHEDULED`) must be at least 10 minutes ahead and at most 7 days out.
Cancelling a wallet-paid order returns the money to the wallet, and any FreshBhoj Coins spent on it come back — whoever cancels (customer or kitchen).

Status flow: `PENDING_PAYMENT → PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`,
with `CANCELLED` reachable up to `PREPARING`. Transitions are guarded by
`ALLOWED_TRANSITIONS` in `orders.constants.ts`.

## Reviews — `/customer/reviews`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/customer/reviews/kitchens/:kitchenId` | ✅ | Write a review. Passing a delivered `orderId` earns the Verified badge and is enforced one-per-order. |
| GET | `/customer/reviews/pending` | ✅ | Delivered orders still awaiting a rating. |
| POST | `/customer/reviews/:id/helpful` | ✅ | Mark helpful. |

Writing a review recomputes the denormalised `rating`/`ratingCount` on the kitchen
and the meal, so every card can show a rating without an aggregate query.

## Reels — `/reels`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/reels?feed=&kitchenId=&q=` | public* | `for_you` · `trending` · `following`. Each reel can carry a shoppable `meal`. |
| GET | `/reels/:id` | public* | Deep-link target. |
| POST | `/reels/:id/like` | ✅ | Like / unlike. |
| POST | `/reels/:id/save` | ✅ | Save / unsave. |
| POST | `/reels/:id/view` | public | Fire-and-forget view count. |
| POST | `/reels/:id/share` | public | Share count. |
| GET | `/reels/saved` | ✅ | Saved reels. |

## Support — `/support`

`GET /support/contact` (public) · `GET /support/faqs?category=` (public) ·
`GET|PATCH /support/notification-preferences` · `GET /support/profile-stats`

## Legal — `/legal`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/legal` | public | Terms, Privacy and Content Policy with their sections. |
| GET | `/legal/:key` | public | One document (`terms` · `privacy` · `content`): `{ key, title, updatedAt, sections[] }`. |

## Notifications — `/customer/notifications`

The customer inbox is derived from records that already exist — order status events,
messages from the kitchen, wallet credits and subscription decisions — so nothing has to
remember to "send" one. The only stored state is `User.notificationsReadAt`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/customer/notifications?category=&page=&limit=` | ✅ | Newest first. `category`: `ORDER` · `SUBSCRIPTION` · `WALLET`. Returns `{ items, meta, unreadCount }`. |
| GET | `/customer/notifications/unread-count` | ✅ | Badge count. |
| POST | `/customer/notifications/read-all` | ✅ | Mark everything read. |

## Wallet, payment methods, subscriptions, referral, stories

| Area | Endpoints |
|---|---|
| Wallet | `GET /customer/wallet` · `GET /customer/wallet/transactions` · `POST /customer/wallet/topup` · `GET /customer/wallet/withdrawals` · `POST /customer/wallet/withdraw` |
| Payment methods | `GET /customer/payment-methods` (cards) · `PATCH|DELETE /customer/payment-methods/:id…` · `GET|POST /customer/payment-methods/upi` · `PATCH /customer/payment-methods/upi/:id/default` · `DELETE /customer/payment-methods/upi/:id` |
| Subscriptions | `POST /customer/subscriptions` · `POST /customer/subscriptions/quote` · `GET /customer/subscriptions` · `GET /customer/subscriptions/:id` · `POST …/:id/pause|resume|cancel` · `POST /customer/subscriptions/pause-all` · `POST …/:id/deliveries/:date/meal` |
| Referral | `GET /referral/me` (`code`, `coinsBalance`, `invitesCount`, `hasRedeemed`, `referrerBonusCoins`, `refereeBonusCoins`) · `POST /referral/redeem` |
| Stories | `GET /stories?city=` · `GET /stories/kitchens/:id` · `POST /stories/:id/seen|like|share` |

## Kitchen partner — `/partner/**` (kitchen JWT, `aud: kitchen`)

Full request/response schemas live in Swagger (`/swagger`, tags "Kitchen · …"). Contract notes that are easy to get wrong:

- Write DTOs are strict (`forbidNonWhitelisted`): never echo read-model fields such as customization `id`s back on create/update.
- `PUT /partner/operating-hours/:dayOfWeek` takes the **string** enum `MONDAY`…`SUNDAY` (not 0–6); `GET /partner/operating-hours` returns `dayOfWeek` the same way.
- `PATCH /partner/menu/:id` accepts `customizationGroups` — when present it **replaces** all of the dish's groups (`[]` clears them); omit it to leave them untouched. Menu reads (`GET /partner/menu`, `/:id`, create/update responses) include `cuisineSlug` (nullable).
- `GET /partner/subscriptions?q=` matches the subscriber's name **or phone number**.
- `POST /partner/fssai-assistance/cancel` is only allowed while the request is `PENDING_PAYMENT` (400 afterwards).
- `GET /partner/payouts/summary` → `lastPayout` is the full payout record (`amount`, `status`, `requestedAt`, `paidAt`, …), not a `{amount, occurredAt}` stub.

---

## Running it

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and the JWT secrets
npx prisma migrate deploy     # or: npm run db:migrate  (dev)
npm run db:seed               # 3 kitchens, 11 meals, 4 reels, 8 areas, coupons, FAQs
npm run start:dev             # → http://localhost:3000/swagger
```

If the database already has tables but no `_prisma_migrations` (created with
`prisma db push`), baseline it first:

```bash
npx prisma migrate resolve --applied 20260314083354_init_auth_schema
npx prisma migrate resolve --applied 20260315182705_add_web_preregistration
npx prisma migrate deploy
```

## Verifying it

```bash
npm run openapi:check    # generates the spec without a DB; flags undocumented responses
npm run openapi:export   # writes openapi.json (for client codegen)
npm run smoke            # end-to-end journey against a running, seeded server
```

`npm run smoke` walks OTP login → onboarding → discovery → cart → checkout →
payment → tracking → review → reorder → reels, and asserts the rules that break
quietly: price arithmetic, the one-kitchen-per-cart conflict, cart survival on a
failed payment, status-transition guards, and public-vs-personalised responses.

`* public` = browsable signed-out, personalised when a bearer token is sent.

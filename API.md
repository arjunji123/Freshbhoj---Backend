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
| POST | `/auth/otp/send` | public | Send a 6-digit OTP. Rate limited to 5/hour per number. |
| POST | `/auth/otp/verify` | public | Verify OTP → `{ isNewUser, user, tokens }`. Creates the user on first login. |
| POST | `/auth/token/refresh` | public | Rotate the refresh token → new pair. |
| POST | `/auth/logout` | ✅ | Revoke refresh tokens. |
| GET | `/auth/me` | ✅ | Current user. |

With `OTP_DEV_MODE=true` the OTP is always `123456` and is echoed back as `devOtp`.

## Users — `/users`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | ✅ | Fresh profile from the DB. |
| POST | `/users/profile/complete` | ✅ | Onboarding step 1 (multipart: `fullName`, `email?`, `profileImage?`). Flips status to `ACTIVE`. |
| PATCH | `/users/profile/image` | ✅ | Replace the avatar. |
| PATCH | `/users/location` | ✅ | Onboarding step 2 — save the chosen area. |
| PATCH | `/users/fcm-token` | ✅ | Store the push token. |

## Catalog — `/catalog`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/catalog/categories` | public | Breakfast / Lunch / Dinner / Healthy Snacks. |
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
| POST | `/meals/:id/favorite` | ✅ | Toggle favourite. |

`sortBy`: `recommended` · `rating` · `price_low` · `price_high` · `calories_low` · `protein_high` · `newest`

## Kitchens — `/kitchens`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/kitchens` | public | List. Filters: `q`, `city`, `locality`, `verifiedOnly`, `openOnly`, `sortBy`. |
| GET | `/kitchens/:idOrSlug` | public* | Profile with counts, trust signals and `isFollowing`. |
| GET | `/kitchens/:id/media` | public | Phase-1 photo/video gallery. |
| GET | `/kitchens/:id/menu` | public* | Meals, in the same card shape as the Home feed. |
| GET | `/kitchens/:id/reviews` | public | Reviews (`sortBy`: `recent`/`highest`/`lowest`/`helpful`). |
| GET | `/kitchens/:id/reviews/summary` | public | Average + 5→1 star histogram. |
| POST | `/kitchens/:id/follow` | ✅ | Follow / unfollow. |
| GET | `/kitchens/following` | ✅ | Kitchens the user follows. |

## Cart — `/cart`

A cart holds meals from **one kitchen**. Adding from another returns
`409 CART_KITCHEN_CONFLICT` with the existing kitchen; resend with
`replaceCart: true` to start fresh.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/cart` | ✅ | Cart with server-computed pricing and `checkout.blockers`. |
| GET | `/cart/count` | ✅ | Badge count. |
| POST | `/cart/items` | ✅ | Add (`mealId`, `quantity`, `customizationIds`, `specialInstructions`, `replaceCart`). |
| PATCH | `/cart/items/:itemId` | ✅ | Change quantity (0 removes the line). |
| DELETE | `/cart/items/:itemId` | ✅ | Remove a line. |
| DELETE | `/cart` | ✅ | Empty the cart. |
| POST | `/cart/coupon` | ✅ | Apply a code — 400 carries the human reason. |
| DELETE | `/cart/coupon` | ✅ | Remove the coupon. |
| GET | `/coupons?itemsTotal=` | public | Live offers, flagged against the subtotal. |

Pricing lives in `common/utils/pricing.ts`: ₹45 delivery, free above ₹499, 5% tax
on the post-discount subtotal, ₹99 minimum order. The cart preview and order
placement call the same helpers, so the quoted total is the charged total.

## Addresses — `/addresses`

`GET /addresses` · `GET /addresses/default` · `POST /addresses` ·
`PATCH /addresses/:id` · `PATCH /addresses/:id/default` · `DELETE /addresses/:id`

The first saved address becomes the default; deleting the default promotes the
next most recent, so a user is never left without one.

## Orders — `/orders`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/orders` | ✅ | Place from the cart. Re-prices server-side. COD → `PLACED`; everything else → `PENDING_PAYMENT`. |
| GET | `/orders?status=&page=&limit=` | ✅ | History, newest first. |
| GET | `/orders/active` | ✅ | Orders in flight. |
| GET | `/orders/:id` | ✅ | Full detail with items, bill and address snapshot. |
| GET | `/orders/:id/tracking` | ✅ | Slim payload for polling (~15s): stepper, ETA, kitchen, partner, support. |
| POST | `/orders/:id/confirm-payment` | ✅ | Release to the kitchen, empty the cart, redeem the coupon. |
| POST | `/orders/:id/fail-payment` | ✅ | Mark failed — the cart is left intact for a retry. |
| POST | `/orders/:id/cancel` | ✅ | Only before `PREPARING`. |
| POST | `/orders/:id/reorder` | ✅ | Rebuild the cart, reporting anything no longer available. |
| POST | `/orders/:id/simulate/:status` | ✅ | **Dev only** — walk an order through the stepper. |

Status flow: `PENDING_PAYMENT → PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`,
with `CANCELLED` reachable up to `PREPARING`. Transitions are guarded by
`ALLOWED_TRANSITIONS` in `orders.constants.ts`.

## Reviews

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/kitchens/:kitchenId/reviews` | ✅ | Write a review. Passing a delivered `orderId` earns the Verified badge and is enforced one-per-order. |
| GET | `/reviews/pending` | ✅ | Delivered orders still awaiting a rating. |
| POST | `/reviews/:id/helpful` | ✅ | Mark helpful. |

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

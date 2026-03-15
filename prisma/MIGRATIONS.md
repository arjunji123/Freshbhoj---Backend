# FreshBhoj Backend - Database Migrations Guide

## Prerequisites
- PostgreSQL running locally
- `.env` file configured with `DATABASE_URL`

## Create the database manually first:
```sql
CREATE DATABASE freshbhoj;
```

## Run migrations:
```bash
# Development (creates migration + applies it)
npm run db:migrate

# When prompted: give your migration a name e.g. "init_auth_schema"

# Production (applies existing migrations only, no changes)
npm run db:migrate:prod
```

## Generate Prisma Client (after schema changes):
```bash
npm run db:generate
```

## View DB via GUI:
```bash
npm run db:studio
```

## Migration naming convention:
- `init_auth_schema` — initial tables
- `add_vendor_tables` — vendor/kitchen tables
- `add_order_tables` — order management
- `add_feed_tables` — reels/video feed

## Reset DB (DEV ONLY):
```bash
npx prisma migrate reset
```

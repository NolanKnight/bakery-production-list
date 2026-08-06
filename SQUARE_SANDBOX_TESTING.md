# Square Sandbox Testing Guide

This guide walks you through setting up Square sandbox testing for your retail order intake system.

## Prerequisites

1. **Square Account**: You need a Square Developer account with sandbox credentials
2. **Sandbox Access Token**: From your [Square Developer Dashboard](https://developer.squareup.com/apps)
3. **Webhook URL**: Your Convex deployment's webhook endpoint

## Setup Steps

### 1. Configure Sandbox Credentials

Set your **sandbox** credentials in `.env.local`:

```bash
# .env.local
SQUARE_ACCESS_TOKEN=sq_test_xxx... (your sandbox token)
SQUARE_ENVIRONMENT=SANDBOX
```

⚠️ **Important**: Keep production and sandbox tokens separate:
- Use `SQUARE_ACCESS_TOKEN` for the **sandbox token** during `convex dev`
- Switch to production token only for production deployments

### 2. Create Catalog Items in Square Sandbox

The `square-sandbox-setup.js` script creates test items with variations:

```bash
npm run square-sandbox:create-items
```

This will:
- Create `Cookie` (Chocolate Chip, Vegan, Double Chocolate variations)
- Create `Croissant` (Plain, Almond variations)
- Create `Baguette` (White variation)
- Save variation IDs to `sandbox-item-mapping.json`

**Output example**:
```json
[
  {
    "catalogObjectId": "LSFXWB7YCXAYX",
    "variationIds": ["YNZ7O7C2YVCJJ", "HZPDP7P7YVCJJ", "QWERTY7YVCJJ"],
    "name": "Cookie"
  },
  ...
]
```

### 3. Link Square Variations to Your Convex Catalog

Use the admin page to connect each production catalog item to its Square variation:

1. Go to **Admin** → **Item Catalog**
2. Find each item (Cookie, Croissant, etc.)
3. Click **Edit** on the row
4. Click **Connect Square Variation** button
5. Select the matching variation from the dialog
6. Save

**Mapping reference** (from `sandbox-item-mapping.json`):
- Production "Cookie" → Square "Cookie - Chocolate Chip" (variation ID: YNZ7O7C2YVCJJ)
- Production "Cookie" → Square "Cookie - Vegan" (variation ID: HZPDP7P7YVCJJ)
- etc.

### 4. Configure Webhook in Square Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Navigate to **Event subscriptions**
4. Set webhook URL to: `https://your-convex-deployment/webhooks/square/order-created`
5. Subscribe to `order.created` events
6. Toggle **Enable** for testing

To find your Convex deployment URL:
```bash
npx convex env list
```

### 5. Create Test Orders

Create both online and in-person test orders:

```bash
npm run square-sandbox:test-orders
```

This will create:
- **Online order**: Should be processed by your webhook (will appear in retail orders)
- **POS/In-person order**: Should be ignored by your webhook

**Expected behavior**:
✅ Online order appears in **Admin** → **Retail Orders**
❌ POS order is silently ignored (returns 200 to Square but no retail order created)

### 6. Verify Webhook Processing

Monitor webhook execution:

```bash
# Terminal 1: Watch convex dev
npx convex dev

# Terminal 2: Check logs
npx convex logs
```

Look for:
- `handleSquareOrderCreatedWebhook` function executing
- `order id: xxx` logged
- No errors in webhook response

### 7. Test Production View

1. Go to **Production** → view today's or tomorrow's date
2. Look for a **Retail** column with quantities
3. Verify online order items show up in the total

## Troubleshooting

### Script errors

**"SQUARE_ACCESS_TOKEN is not set"**
```bash
export SQUARE_ACCESS_TOKEN=sq_test_xxx...
npm run square-sandbox:create-items
```

**"SQUARE_ENVIRONMENT is 'PRODUCTION'"**
Make sure you're using sandbox credentials and have `SQUARE_ENVIRONMENT=SANDBOX` set.

### Webhook not firing

1. Check Square Developer Dashboard event logs
2. Verify webhook URL is publicly accessible
3. Confirm `order.created` subscription is enabled
4. Use "Test Event" in Dashboard to manually trigger

### Orders not appearing in retail orders

Check Convex logs:
```bash
npx convex logs
```

Look for:
- `No mapped retail items on order` - Items aren't linked to catalog
- `Square API error` - Token/API issues
- `Retail order stored` - Success ✅

### In-person orders appearing when they shouldn't

The webhook checks if `order.source.name` (lowercase) === `"square point of sale"`.
Verify the source name in your test order matches exactly.

## Cleanup

To clear test data:

```bash
# Delete test items from Square Dashboard manually, or
rm sandbox-item-mapping.json
```

## Production Deployment

When ready for production:

1. **Switch credentials**:
   - Set `SQUARE_ACCESS_TOKEN` to your production token in environment
   - Remove `SQUARE_ENVIRONMENT=SANDBOX` setting

2. **Create real catalog items** in your actual Square store

3. **Link production items** to their Square variations

4. **Update webhook URL** to production deployment

5. **Enable webhook signature verification** (currently commented in code - see `convex/retailOrders.ts` line 235)

6. **Test with a real order** from your Square store

## Script Reference

### `npm run square-sandbox:create-items`

Creates test items in Square with hardcoded variations:
- Cookie (3 variations)
- Croissant (2 variations)
- Baguette (1 variation)

Saves output to `sandbox-item-mapping.json`.

**Customization**: Edit `scripts/square-sandbox-setup.js` lines 208-222 to match your actual catalog.

### `npm run square-sandbox:test-orders`

Creates test orders using variation IDs from `sandbox-item-mapping.json`:
- Online order (Pickup fulfillment) - will be processed
- POS order (In-person fulfillment) - will be ignored

Orders are created in Square and webhooks will fire automatically if configured.

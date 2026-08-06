# Square Sandbox Testing Setup - Quick Summary

## What was created:

### 1. **Convex Testing Utilities** (`convex/testing.ts`)

- `exportCatalogForSandbox` - Query to export your production catalog items
- `syncSquareVariationId` - Mutation to link Square variation IDs to items (sandbox-only)
- `simulateSquareWebhook` - Action to simulate orders for testing (sandbox-only)

Safety features:

- All functions check `CONVEX_ENVIRONMENT` to prevent running in production
- Will throw errors if accidentally called outside dev environment

### 2. **Sandbox Setup Script** (`scripts/square-sandbox-setup.js`)

Node.js script with three commands:

```bash
# Create test items in Square with variations
npm run square-sandbox:create-items

# Create test orders (online and in-person)
npm run square-sandbox:test-orders

# Show webhook testing instructions
node scripts/square-sandbox-setup.js webhook-test
```

Features:

- ✅ Environment validation (requires `SQUARE_ENVIRONMENT=SANDBOX`)
- ✅ Creates Cookie, Croissant, Baguette with variations
- ✅ Saves variation IDs to `sandbox-item-mapping.json`
- ✅ Creates both online (will be processed) and POS (will be ignored) test orders
- ✅ Colored terminal output with clear instructions

### 3. **Documentation** (`SQUARE_SANDBOX_TESTING.md`)

Complete guide with:

- Setup prerequisites
- Step-by-step instructions
- Troubleshooting for common issues
- Production deployment checklist

## Next Steps:

### Step 1: Get Sandbox Credentials

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to "Credentials" → "Sandbox Access Token"
4. Copy the sandbox token

### Step 2: Set Environment Variables

In `.env.local`:

```
SQUARE_ACCESS_TOKEN=sq_test_YOUR_SANDBOX_TOKEN
SQUARE_ENVIRONMENT=SANDBOX
```

### Step 3: Create Catalog Items in Sandbox

```bash
npm run square-sandbox:create-items
```

### Step 4: Link Items in Admin UI

1. Go to Admin → Item Catalog
2. Edit each item (Cookie, Croissant, etc.)
3. Click "Connect Square Variation"
4. Select the matching variation from the dialog
5. Save

### Step 5: Configure Webhook (Optional)

To auto-trigger webhooks when creating orders:

1. Square Developer Dashboard → Event subscriptions
2. Add webhook URL: `https://your-convex-url/webhooks/square/order-created`
3. Subscribe to `order.created`

To find your Convex URL:

```bash
npx convex env list
```

### Step 6: Create Test Orders

```bash
npm run square-sandbox:test-orders
```

### Step 7: Verify

- Go to Admin → Retail Orders
- Online order should appear
- Check production view for retail quantities

## Safety Features:

✅ **Environment Checks**: Script requires `SQUARE_ENVIRONMENT=SANDBOX`
✅ **Separate Credentials**: Keep sandbox and production tokens separate
✅ **Function Guards**: All testing functions check `CONVEX_ENVIRONMENT`
✅ **No Auto-Production**: Script fails loudly if production token is accidentally used

## File Structure:

```
bakery-production-list/
├── convex/
│   ├── testing.ts               (NEW - testing utilities)
│   ├── retailOrders.ts          (EXISTING - webhook handler)
│   └── ...
├── scripts/
│   └── square-sandbox-setup.js  (NEW - setup script)
├── SQUARE_SANDBOX_TESTING.md    (NEW - detailed guide)
├── sandbox-item-mapping.json    (GENERATED - variation IDs)
└── ...
```

## Commands Reference:

| Command                               | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run square-sandbox:create-items` | Create Cookie, Croissant, Baguette items with variations in Square sandbox |
| `npm run square-sandbox:test-orders`  | Create online and POS test orders                                          |
| `npx convex logs`                     | Watch webhook execution logs                                               |
| `npx convex env list`                 | Get your Convex webhook URL                                                |

## Questions?

See `SQUARE_SANDBOX_TESTING.md` for detailed troubleshooting and production deployment guide.

#!/usr/bin/env node

/**
 * Square Sandbox Setup Script
 *
 * This script helps you:
 * 1. Create catalog items in Square sandbox matching your production catalog
 * 2. Create test orders (both in-person and online)
 * 3. Verify webhook processing
 *
 * SAFETY: This script ONLY works with sandbox credentials.
 * It checks for SQUARE_ENVIRONMENT=SANDBOX to prevent production accidents.
 */

import https from "https";
import fs from "fs";
import path from "path";

// Configuration
const SQUARE_API_VERSION = "2026-07-22";
const SQUARE_API_BASE = "connect.squareupsandbox.com";

// Color output for terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}❌ ERROR: ${message}${colors.reset}`);
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, "green");
}

function info(message) {
  log(`ℹ  ${message}`, "blue");
}

function warn(message) {
  log(`⚠  ${message}`, "yellow");
}

// Environment validation
function validateEnvironment() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    error(
      "SQUARE_ACCESS_TOKEN is not set. Set it to your sandbox token in .env.local",
    );
  }

  const env = process.env.SQUARE_ENVIRONMENT || "SANDBOX";
  if (env !== "SANDBOX") {
    error(
      `SQUARE_ENVIRONMENT is '${env}', not 'SANDBOX'. This script only works with sandbox credentials.`,
    );
  }

  success("Environment validated (SQUARE_ENVIRONMENT=SANDBOX)");
  return token;
}

// HTTP helper for Square API
function squareRequest(method, path, body = null) {
  const token = process.env.SQUARE_ACCESS_TOKEN;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: SQUARE_API_BASE,
      path: `/v2${path}`,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!res.statusCode.toString().startsWith("2")) {
            reject({
              status: res.statusCode,
              message: parsed.errors ? parsed.errors[0].detail : data,
            });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject({ status: res.statusCode, message: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Create a Square catalog item with variations
async function createSquareItem(name, description, variations) {
  info(`Creating Square item: ${name}`);

  const itemData = {
    idempotency_key: `${name}-${Date.now()}`,
    object: {
      type: "ITEM",
      id: `#${name.replace(/\s+/g, "_").toLowerCase()}`,
      item_data: {
        name,
        description,
        variations: variations.map((v, idx) => ({
          type: "ITEM_VARIATION",
          id: `#${name.replace(/\s+/g, "_").toLowerCase()}_${v.name.replace(/\s+/g, "_").toLowerCase()}`,
          item_variation_data: {
            name: v.name,
            sku: `${name.toUpperCase()}_${v.name.toUpperCase()}`,
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: 1000, // $10.00 for testing
              currency: "USD",
            },
          },
        })),
      },
    },
  };

  try {
    console.log("try");
    const response = await squareRequest(
      "POST",
      "/catalog/object",
      itemData,
    ).then((result) => {
      console.log("posted date");
      console.log("result: ", result);

      return result;
    });
    const catalogObjectId = response.catalog_object.id;
    console.log("found id");
    console.log("id: ", catalogObjectId);
    const variationIds = response.catalog_object.item_data.variations.map(
      (v) => v.id,
    );

    console.log("found variation ids");
    console.log("variationIds: ", variationIds);

    success(`Created Square item: ${catalogObjectId}`);
    info(`Variations: ${variationIds.join(", ")}`);

    return {
      catalogObjectId,
      variationIds,
      name,
    };
  } catch (e) {
    warn(`Failed to create ${name}: ${e.message}`);
    return null;
  }
}

// Create a test order in Square
async function createTestOrder(orderId, lineItems, customerName) {
  info(`Creating test order: ${orderId})`);

  // const source =
  //   sourceType === "ONLINE"
  //     ? { name: "Online Store" }
  //     : { name: "Square Point of Sale" };

  const orderData = {
    idempotency_key: `test-order-${orderId}-${Date.now()}`,
    order: {
      location_id: "L9FTRV89Y3KB1",
      reference_id: orderId,
      line_items: lineItems.map((item) => ({
        quantity: item.quantity.toString(),
        catalog_object_id: item.catalogObjectId,
      })),
      fulfillments: [
        {
          state: "PROPOSED",
          type: "PICKUP", //sourceType === "ONLINE" ? "PICKUP" : "IN_STORE",
          pickup_details: {
            pickup_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            note: "Test order for sandbox",
            recipient: {
              display_name: customerName || "Test Customer",
            },
          },
        },
      ],
    },
  };

  try {
    const response = await squareRequest("POST", "/orders", orderData);
    const createdOrderId = response.order.id;
    success(`Created test order: ${createdOrderId}`);
    console.log("response: ", response);
    return createdOrderId;
  } catch (e) {
    error(`Failed to create order: ${e.message}`);
  }
}

// Main execution
async function main() {
  log("🔷 Square Sandbox Setup Script", "blue");
  log("================================\n", "blue");

  const token = validateEnvironment();
  log("");

  // Parse command-line arguments
  const command = process.argv[2];

  if (command === "create-items") {
    await createItemsFlow();
  } else if (command === "test-orders") {
    await testOrdersFlow();
  } else if (command === "webhook-test") {
    await webhookTestFlow();
  } else {
    showHelp();
  }
}

async function createItemsFlow() {
  log("\n📦 Creating catalog items in Square sandbox...\n", "blue");

  // Example catalog items with variations
  // In production, you'd query this from Convex
  const catalogItems = [
    {
      name: "Cookie",
      description: "Delicious homemade cookie",
      variations: [
        { name: "Chocolate Chip" },
        { name: "Vegan" },
        { name: "Double Chocolate" },
      ],
    },
    {
      name: "Croissant",
      description: "French-style buttery croissant",
      variations: [{ name: "Plain" }, { name: "Almond" }],
    },
    {
      name: "Baguette",
      description: "Traditional French baguette",
      variations: [{ name: "White" }],
    },
  ];

  const createdItems = [];

  for (const item of catalogItems) {
    const created = await createSquareItem(
      item.name,
      item.description,
      item.variations,
    );
    if (created) {
      createdItems.push(created);
    }
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limiting
  }

  log("\n📋 Summary:", "blue");
  log(
    `Created ${createdItems.length} items with ${createdItems.reduce((sum, item) => sum + item.variationIds.length, 0)} total variations\n`,
  );

  // Save mapping for webhook testing
  const mappingFile = path.join(
    import.meta.dirname,
    "../sandbox-item-mapping.json",
  );
  fs.writeFileSync(mappingFile, JSON.stringify(createdItems, null, 2));
  info(`Item mapping saved to: ${mappingFile}`);

  log("\n📝 Next steps:", "blue");
  log("1. Use these variation IDs to link items in your Convex catalog");
  log("2. Run: npm run square-sandbox test-orders\n");
}

async function testOrdersFlow() {
  log("\n🛒 Creating test orders...\n", "blue");

  // Load mapping from previous step
  const mappingFile = path.join(
    import.meta.dirname,
    "../sandbox-item-mapping.json",
  );
  if (!fs.existsSync(mappingFile)) {
    error(
      `Item mapping file not found. Run 'npm run square-sandbox create-items' first.`,
    );
  }

  const itemMapping = JSON.parse(fs.readFileSync(mappingFile, "utf-8"));

  // Get first item and variation for testing
  if (!itemMapping.length || !itemMapping[0].variationIds.length) {
    error("No items or variations found in mapping");
  }

  const testVariationId = itemMapping[0].variationIds[0];

  // Test 1: Online order (should be processed)
  log("Test 1: Online order (should be processed by webhook)\n", "yellow");
  const onlineOrderId = await createTestOrder(
    `online-test-${Date.now()}`,
    [
      {
        catalogObjectId: testVariationId,
        quantity: 2,
      },
    ],
    "Test Online Customer",
  );

  // log("\nTest 2: In-person order (should be IGNORED by webhook)\n", "yellow");
  // const posOrderId = await createTestOrder(
  //   `pos-test-${Date.now()}`,
  //   "POS",
  //   [
  //     {
  //       catalogObjectId: testVariationId,
  //       quantity: 1,
  //     },
  //   ],
  //   "Test POS Customer"
  // );

  log("\n📝 Next steps:", "blue");
  log(`1. Check your webhook logs for order: ${onlineOrderId}`);
  log(`2. Verify it appears in the retail orders admin page`);
  // log(
  //   `3. Confirm that order ${posOrderId} (POS) was NOT processed\n`
  // );
}

async function webhookTestFlow() {
  log("\n🧪 Manual webhook testing...\n", "blue");
  warn("To test webhooks manually:");
  log("1. Go to Square Developer Dashboard → Applications");
  log("2. Select your application");
  log("3. Go to Event subscriptions");
  log("4. Use the Test Event button to send mock events");
  log(
    "5. Check your server logs at https://dashboard.convex.dev for webhook execution\n",
  );
}

function showHelp() {
  log("\n🔷 Square Sandbox Setup Script\n", "blue");
  log("Usage: node scripts/square-sandbox-setup.js <command>\n", "gray");
  log("Commands:", "blue");
  log(
    "  create-items   Create catalog items in Square sandbox with variations",
  );
  log("  test-orders    Create test orders (online and in-person)");
  log("  webhook-test   Show webhook testing instructions\n");
  log("Example:", "blue");
  log(
    "  SQUARE_ENVIRONMENT=SANDBOX node scripts/square-sandbox-setup.js create-items\n",
  );
}

// Run
main().catch(error);

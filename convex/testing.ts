import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { handleSquareOrderCreated } from "./retailOrders";

/**
 * Testing and sandbox setup utilities.
 * These functions should only be used in development with sandbox Square credentials.
 */

export const exportCatalogForSandbox = query({
  handler: async (ctx) => {
    const items = await ctx.db
      .query("itemCatalog")
      .withIndex("by_sortOrder")
      .collect();

    const activeItems = items.filter((item) => item.active);
    return activeItems.map((item) => ({
      id: item._id,
      name: item.name,
      categoryId: item.categoryId,
      unitId: item.unitId,
      squareItemId: item.squareItemId,
    }));
  },
});

/**
 * Sync Square variation IDs back to item catalog after creating them in sandbox.
 * SANDBOX ONLY - requires explicit SQUARE_SANDBOX_MODE environment variable.
 */
export const syncSquareVariationId = action({
  args: {
    itemId: v.id("itemCatalog"),
    squareVariationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Safety check: ensure this only runs with explicit sandbox mode
    const isSandbox = process.env.CONVEX_ENVIRONMENT?.includes("dev");

    if (!isSandbox) {
      throw new Error(
        "syncSquareVariationId can only run in dev environment (sandbox). " +
          "Do not use this action in production.",
      );
    }

    // Update the item with the new square variation ID
    await ctx.runMutation(api.itemCatalog.setSquareItemConnection, {
      id: args.itemId,
      squareItemId: args.squareVariationId,
    });

    return { success: true };
  },
});

/**
 * Simulate a Square webhook order created event.
 * SANDBOX ONLY - for testing the webhook handler.
 */
export const simulateSquareWebhook = action({
  args: {
    orderId: v.string(),
    sourceType: v.union(
      v.literal("ONLINE_ORDER_CREATED"),
      v.literal("POS_ORDER_CREATED"),
    ),
    lineItems: v.array(
      v.object({
        catalogObjectId: v.string(), // Square variation ID
        quantity: v.number(),
      }),
    ),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    desiredDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Safety check
    const isSandbox = process.env.CONVEX_ENVIRONMENT?.includes("dev");
    if (!isSandbox) {
      throw new Error(
        "simulateSquareWebhook can only run in dev environment. " +
          "Do not use this action in production.",
      );
    }

    // Determine order source name based on type
    const sourceName = args.sourceType.includes("POS")
      ? "Square Point of Sale"
      : "Online Store";

    // Create a mock order payload similar to Square's webhook
    const mockOrder = {
      id: args.orderId,
      source: {
        name: sourceName,
      },
      line_items: args.lineItems.map((item) => ({
        catalog_object_id: item.catalogObjectId,
        quantity: item.quantity.toString(),
      })),
      created_at: new Date().toISOString(),
      total_money: {
        amount: 10000,
        currency: "USD",
      },
      reference_id: args.orderId,
      customer_id: "sandbox-customer",
    };

    // Call the webhook handler
    const result: any = await handleSquareOrderCreated(ctx, mockOrder);

    return result;
  },
});

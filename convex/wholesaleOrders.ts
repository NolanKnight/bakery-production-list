import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createWholesaleOrder = mutation({
  args: {
    clientName: v.string(),
    email: v.string(),
    desiredDate: v.string(),
    items: v.array(
      v.object({
        itemId: v.id("itemCatalog"),
        quantity: v.number(),
      }),
    ),
  },

  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("wholesaleOrders", {
      clientName: args.clientName,
      email: args.email,
      desiredDate: args.desiredDate,
      items: args.items,
      createdAt: Date.now(),
    });

    return orderId;
  },
});

export const getWholesaleOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("wholesaleOrders").collect();
  },
});

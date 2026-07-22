import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";

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
    await requireRole(ctx, ["admin", "client"]);
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
    await requireRole(ctx, ["admin"]);
    return await ctx.db.query("wholesaleOrders").collect();
  },
});

export const getWholesaleOrder = query({
  args: {
    orderId: v.id("wholesaleOrders"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.get(args.orderId);
  },
});

import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./authorization";

const wholesaleOrderValidator = v.object({
  _id: v.id("wholesaleOrders"),
  _creationTime: v.number(),
  clientName: v.string(),
  email: v.string(),
  desiredDate: v.string(),
  createdAt: v.number(),
  items: v.array(
    v.object({
      itemId: v.id("itemCatalog"),
      quantity: v.number(),
    }),
  ),
});

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
    const { user, role } = await requireRole(ctx, ["admin", "client"]);
    const orderId = await ctx.db.insert("wholesaleOrders", {
      clientName: args.clientName,
      email: role === "client" ? user.email : args.email,
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

export const getWholesaleOrdersForDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(wholesaleOrderValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db
      .query("wholesaleOrders")
      .withIndex("by_date", (q) => q.eq("desiredDate", args.date))
      .collect();
  },
});

export const getClientWholesaleOrders = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireRole(ctx, ["client"]);
    const normalizedEmail = user.email.trim().toLowerCase();
    const orders = await ctx.db.query("wholesaleOrders").collect();

    return orders
      .filter((order) => order.email.trim().toLowerCase() === normalizedEmail)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getWholesaleOrder = query({
  args: {
    orderId: v.id("wholesaleOrders"),
  },
  handler: async (ctx, args) => {
    const { user, role } = await requireRole(ctx, ["admin", "client"]);
    const order = await ctx.db.get(args.orderId);

    if (
      order &&
      role === "client" &&
      order.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      throw new ConvexError({ message: "Unauthorized" });
    }

    return order;
  },
});

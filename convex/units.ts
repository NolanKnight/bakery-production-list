import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./authorization";

export const getUnits = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "employee", "client"]);
    return await ctx.db.query("units").withIndex("by_sortOrder").collect();
  },
});

export const addUnit = mutation({
  args: {
    name: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const existing = await ctx.db.query("units").collect();

    if (existing.find((unit) => unit.name === args.name)) {
      throw new ConvexError({ message: "Duplicate unit name." });
    }

    const sortOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((item) => item.sortOrder)) + 1;

    await ctx.db.insert("units", {
      name: args.name.trim(),
      sortOrder,
    });
  },
});

export const updateUnit = mutation({
  args: {
    id: v.id("units"),
    name: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
    });
  },
});

export const deleteUnit = mutation({
  args: {
    id: v.id("units"),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const item = await ctx.db
      .query("itemCatalog")
      .filter((q) => q.eq(q.field("unitId"), args.id))
      .first();

    if (item) {
      throw new ConvexError({
        message: "Cannot delete a unit that is in use.",
      });
    }

    await ctx.db.delete(args.id);
  },
});

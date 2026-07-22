import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./authorization";

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.query("categories").withIndex("by_sortOrder").collect();
  },
});

export const addCategory = mutation({
  args: {
    name: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const existing = await ctx.db.query("categories").collect();

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

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
    });
  },
});

export const deleteCategory = mutation({
  args: {
    id: v.id("categories"),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const item = await ctx.db
      .query("itemCatalog")
      .filter((q) => q.eq(q.field("categoryId"), args.id))
      .first();

    if (item) {
      throw new ConvexError({
        message: "Cannot delete a category that is in use.",
      });
    }

    await ctx.db.delete(args.id);
  },
});

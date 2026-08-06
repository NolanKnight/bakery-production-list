import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./authorization";

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

    await ctx.db.insert("categories", {
      name: args.name.trim(),
      sortOrder,
      active: true,
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
    const items = await ctx.db
      .query("itemCatalog")
      .filter((q) => q.eq(q.field("categoryId"), args.id))
      .collect();

    items.forEach((item) => {
      if (item.active) {
        throw new ConvexError({
          message: "Cannot delete a category that is in use.",
        });
      }
    });

    await ctx.db.patch("categories", args.id, { active: false });
  },
});

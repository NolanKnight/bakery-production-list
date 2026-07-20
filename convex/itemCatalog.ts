import { Doc, Id } from "./_generated/dataModel";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const getCatalog = async (ctx: QueryCtx) => {
  const categories = await ctx.db.query("categories").collect();
  const items = await ctx.db
    .query("itemCatalog")
    .withIndex("by_sortOrder")
    .collect()
    .then((items) => items.filter((item) => item.active));

  const categoryMap = new Map<
    string,
    {
      category: Doc<"categories">;
      items: Doc<"itemCatalog">[];
    }
  >();

  for (const cat of categories) {
    let catItems: Doc<"itemCatalog">[] = [];

    for (const item of items) {
      if (item.categoryId === cat._id) {
        catItems.push(item);
      }
    }

    categoryMap.set(cat._id, {
      category: cat,
      items: catItems,
    });
  }

  return [...categoryMap.values()];
};

export const getItems = query({
  args: {},
  handler: async (ctx) => {
    return await getCatalog(ctx);
  },
});

export const addItem = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    unitId: v.id("units"),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db.query("itemCatalog").collect();

    const sortOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((item) => item.sortOrder)) + 1;

    await ctx.db.insert("itemCatalog", {
      name: args.name.trim(),
      categoryId: args.categoryId,
      unitId: args.unitId,
      sortOrder,
      active: true,
      par: 0,
    });
  },
});

export const deleteItem = mutation({
  args: {
    id: v.id("itemCatalog"),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      active: false,
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("itemCatalog"),
    name: v.string(),
    unitId: v.id("units"),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      unitId: args.unitId,
    });
  },
});

export const updateItemPar = mutation({
  args: {
    id: v.id("itemCatalog"),
    par: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("itemCatalog", args.id, { par: args.par });
  },
});

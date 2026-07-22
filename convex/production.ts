import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCatalog } from "./itemCatalog";
import { Id } from "./_generated/dataModel";
import { requireRole } from "./authorization";

export const getDailyProduction = query({
  args: {
    date: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    const catalog = await getCatalog(ctx);

    const orders = await ctx.db
      .query("wholesaleOrders")
      .withIndex("by_date", (q) => q.eq("desiredDate", args.date))
      .collect();

    const overrides = await ctx.db
      .query("productionOverrides")
      .withIndex("by_date_item", (q) => q.eq("date", args.date))
      .collect();

    const overrideMap: Record<Id<"itemCatalog">, number> = {};

    for (const o of overrides) {
      overrideMap[o.itemId] = o.overrideQuantity;
    }

    // ---- PAR MAP ----
    const parMap: Record<Id<"itemCatalog">, number> = {};
    for (const p of catalog.flatMap((entry) => entry.items)) {
      parMap[p._id] = p.par;
    }

    // ---- WHOLESALE SUM ----
    const wholesaleMap: Record<Id<"itemCatalog">, number> = {};

    for (const order of orders) {
      for (const item of order.items) {
        wholesaleMap[item.itemId] =
          (wholesaleMap[item.itemId] ?? 0) + item.quantity;
      }
    }

    // ---- BUILD FINAL STRUCTURE (based on catalog order) ----
    const result = catalog.map((entry) => ({
      category: entry.category,
      items: entry.items.map((item) => {
        const par = parMap[item._id] ?? 0;
        const wholesale = wholesaleMap[item._id] ?? 0;

        const computed = par + wholesale;
        const override = overrideMap[item._id];

        return {
          itemId: item._id,
          name: item.name,
          unitId: item.unitId,
          par,
          wholesale,
          computedTotal: computed,
          finalTotal: override ?? computed,
        };
      }),
    }));

    return result;
  },
});

export const getOverrides = query({
  args: {
    date: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    return await ctx.db
      .query("productionOverrides")
      .withIndex("by_date_item", (q) => q.eq("date", args.date))
      .collect();
  },
});

export const setOverride = mutation({
  args: {
    date: v.string(),
    itemId: v.id("itemCatalog"),
    overrideQuantity: v.number(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    const existing = await ctx.db
      .query("productionOverrides")
      .withIndex("by_date_item", (q) =>
        q.eq("date", args.date).eq("itemId", args.itemId),
      )
      .unique();

    const lock = await ctx.db
      .query("productionLocks")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (lock?.locked) {
      throw new ConvexError({ message: "Production sheet is locked." });
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        overrideQuantity: args.overrideQuantity,
      });
    } else {
      await ctx.db.insert("productionOverrides", args);
    }
  },
});

export const deleteOverride = mutation({
  args: {
    overrideId: v.id("productionOverrides"),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    return await ctx.db.delete("productionOverrides", args.overrideId);
  },
});

export const getLock = query({
  args: { date: v.string() },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    return await ctx.db
      .query("productionLocks")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
  },
});

export const toggleLock = mutation({
  args: {
    date: v.string(),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee"]);
    const existing = await ctx.db
      .query("productionLocks")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (!existing) {
      await ctx.db.insert("productionLocks", {
        date: args.date,
        locked: true,
        lockedAt: Date.now(),
      });

      return;
    }

    await ctx.db.patch(existing._id, {
      locked: !existing.locked,
      lockedAt: existing.locked ? undefined : Date.now(),
    });
  },
});

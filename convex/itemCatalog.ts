import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireRole } from "./authorization";
import {
  createWeekdayParValues,
  normalizeWeekdayParValues,
  weekdayNameValidator,
} from "./weekdayPar";

const SQUARE_API_VERSION = "2026-07-22";
const SQUARE_CATALOG_API_URL = process.env.SQUARE_API_URL + "/v2/catalog/list";

type JsonRecord = Record<string, unknown>;
type SquareCatalogItem = {
  id: string;
  name: string;
  description?: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null;

const getString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  const next = value[key];
  return typeof next === "string" ? next : null;
};

const listSquareCatalogItems = async (
  squareAccessToken: string,
): Promise<SquareCatalogItem[]> => {
  const result: SquareCatalogItem[] = [];

  let cursor: string | null = null;
  for (;;) {
    const url = new URL(SQUARE_CATALOG_API_URL);
    url.searchParams.set("types", "ITEM");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${squareAccessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new ConvexError({
        message: `Square API error while listing catalog items: ${body}`,
      });
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      throw new ConvexError({
        message: "Invalid Square catalog response shape.",
      });
    }

    const objects = Array.isArray(payload.objects) ? payload.objects : [];
    for (const object of objects) {
      if (!isRecord(object)) continue;
      if (getString(object, "type") !== "ITEM") continue;

      const itemData = isRecord(object.item_data) ? object.item_data : null;
      const itemId = getString(object, "id");
      const itemName = getString(itemData, "name");
      if (!itemId || !itemName) continue;
      const description = getString(itemData, "description") ?? undefined;

      const variations = Array.isArray(itemData?.variations)
        ? itemData.variations
        : [];
      if (variations.length === 0) {
        result.push({
          id: itemId,
          name: itemName,
          description,
        });
        continue;
      }

      for (const variation of variations) {
        if (!isRecord(variation)) continue;
        const variationId = getString(variation, "id");
        if (!variationId) continue;

        const variationData = isRecord(variation.item_variation_data)
          ? variation.item_variation_data
          : null;
        const variationName = getString(variationData, "name") ?? "Regular";

        result.push({
          id: variationId,
          name: `${itemName} - ${variationName}`,
          description,
        });
      }
    }

    const nextCursor = getString(payload, "cursor");
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return result;
};

export const getCatalog = async (ctx: QueryCtx, includeInactive?: boolean) => {
  const categories = await ctx.db.query("categories").collect();
  const items = await ctx.db
    .query("itemCatalog")
    .withIndex("by_sortOrder")
    .collect()
    .then((items) =>
      includeInactive ? items : items.filter((item) => item.active),
    );

  const categoryMap = new Map<
    string,
    {
      category: Doc<"categories">;
      items: Doc<"itemCatalog">[];
    }
  >();

  for (const cat of categories) {
    let catItems: Doc<"itemCatalog">[] = [];

    if (!cat.active && !includeInactive) continue;

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
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "employee", "client"]);
    return await getCatalog(ctx, args.includeInactive);
  },
});

export const addItem = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    unitId: v.id("units"),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
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
      par: createWeekdayParValues(0),
      currentInventory: 0,
    });
  },
});

export const deleteItem = mutation({
  args: {
    id: v.id("itemCatalog"),
  },

  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
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
    await requireRole(ctx, ["admin"]);

    await ctx.db.patch(args.id, {
      name: args.name,
      unitId: args.unitId,
    });
  },
});

export const setSquareItemConnection = mutation({
  args: {
    id: v.id("itemCatalog"),
    squareItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const normalizedSquareItemId = args.squareItemId?.trim();

    await ctx.db.patch(args.id, {
      squareItemId:
        normalizedSquareItemId && normalizedSquareItemId.length > 0
          ? normalizedSquareItemId
          : undefined,
    });
  },
});

export const getConnectedSquareItemLinks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("itemCatalog").collect();
    return items
      .filter(
        (item) =>
          item.active &&
          typeof item.squareItemId === "string" &&
          item.squareItemId.trim().length > 0,
      )
      .map((item) => ({
        id: item._id,
        squareItemId: item.squareItemId!.trim(),
      }));
  },
});

export const clearSquareItemConnections = internalMutation({
  args: {
    itemIds: v.array(v.id("itemCatalog")),
  },
  handler: async (ctx, args) => {
    for (const itemId of args.itemIds) {
      await ctx.db.patch(itemId, { squareItemId: undefined });
    }
  },
});

export const validateSquareItemConnections = action({
  args: {},
  handler: async (ctx) => {
    const roleState: {
      isAuthenticated: boolean;
      role: string;
    } = await ctx.runQuery(api.auth.getCurrentUserRole, {});
    if (!roleState.isAuthenticated || roleState.role !== "admin") {
      throw new ConvexError({ message: "Unauthorized" });
    }

    const connectedItems: {
      id: Doc<"itemCatalog">["_id"];
      squareItemId: string;
    }[] = await ctx.runQuery(
      internal.itemCatalog.getConnectedSquareItemLinks,
      {},
    );
    if (connectedItems.length === 0) {
      return {
        connectedItemCount: 0,
        clearedItemCount: 0,
      };
    }

    const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!squareAccessToken) {
      throw new ConvexError({
        message: "SQUARE_ACCESS_TOKEN is not configured",
      });
    }

    const validSquareIds = new Set(
      (await listSquareCatalogItems(squareAccessToken)).map((item) => item.id),
    );
    const invalidItemIds = connectedItems
      .filter((item) => !validSquareIds.has(item.squareItemId))
      .map((item) => item.id);

    if (invalidItemIds.length > 0) {
      await ctx.runMutation(internal.itemCatalog.clearSquareItemConnections, {
        itemIds: invalidItemIds,
      });
    }

    return {
      connectedItemCount: connectedItems.length,
      clearedItemCount: invalidItemIds.length,
    };
  },
});

export const getSquareCatalogItems = action({
  args: {},
  handler: async (ctx) => {
    const roleState: {
      isAuthenticated: boolean;
      role: string;
    } = await ctx.runQuery(api.auth.getCurrentUserRole, {});
    if (!roleState.isAuthenticated || roleState.role !== "admin") {
      throw new ConvexError({ message: "Unauthorized" });
    }

    const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!squareAccessToken) {
      throw new ConvexError({
        message: "SQUARE_ACCESS_TOKEN is not configured",
      });
    }

    return (await listSquareCatalogItems(squareAccessToken)).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  },
});

export const updateItemPar = mutation({
  args: {
    id: v.id("itemCatalog"),
    day: weekdayNameValidator,
    par: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const item = await ctx.db.get(args.id);

    if (!item) {
      throw new ConvexError({ message: "Item not found." });
    }

    const currentPar = normalizeWeekdayParValues(item.par);

    await ctx.db.patch(args.id, {
      par: {
        ...currentPar,
        [args.day]: args.par,
      },
    });
  },
});

export const updateItemInventory = mutation({
  args: {
    id: v.id("itemCatalog"),
    currentInventory: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.currentInventory !== undefined) {
      throw new ConvexError({ message: "Inventory Error Test" });
    }
    await requireRole(ctx, ["admin", "employee"]);
    await ctx.db.patch("itemCatalog", args.id, {
      currentInventory: args.currentInventory,
    });
  },
});

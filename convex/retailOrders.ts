import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  httpAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireRole } from "./authorization";
import { v } from "convex/values";

const SQUARE_API_URL = "https://connect.squareup.com/v2/orders";
const SQUARE_API_VERSION = "2026-07-22";
const ONLINE_ORDER_EVENT_TYPE = "order.created";
const IN_PERSON_SOURCE_NAME = "square point of sale";

type JsonRecord = Record<string, unknown>;
type SquareOrderLineItem = {
  catalog_object_id?: unknown;
  quantity?: unknown;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null;

const getRecord = (value: unknown, key: string): JsonRecord | null => {
  if (!isRecord(value)) return null;
  const next = value[key];
  return isRecord(next) ? next : null;
};

const getString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  const next = value[key];
  return typeof next === "string" ? next : null;
};

const extractOrderId = (payload: unknown): string | null => {
  const rootOrderId = getString(payload, "order_id");
  if (rootOrderId) return rootOrderId;

  const data = getRecord(payload, "data");
  if (!data) return null;

  const object = getRecord(data, "object");
  const orderCreated = getRecord(object, "order_created");
  if (!orderCreated) return null;

  return (
    getString(orderCreated, "order_id") ??
    getString(orderCreated, "orderId") ??
    null
  );
};

const getEventType = (payload: unknown): string | null =>
  getString(payload, "type") ?? getString(payload, "event_type");

const getSourceName = (order: unknown): string | null => {
  const source = getRecord(order, "source");
  return getString(source, "name");
};

const isInPersonOrder = (order: unknown) => {
  const sourceName = getSourceName(order)?.trim().toLowerCase();
  return sourceName === IN_PERSON_SOURCE_NAME;
};

const asDateString = (isoValue: string | null) => {
  if (!isoValue) return null;
  if (isoValue.length < 10) return null;
  return isoValue.slice(0, 10);
};

const extractDesiredDate = (order: unknown): string => {
  const fulfillments = isRecord(order) && Array.isArray(order.fulfillments)
    ? order.fulfillments
    : [];

  for (const fulfillment of fulfillments) {
    if (!isRecord(fulfillment)) continue;

    const pickupAt = asDateString(
      getString(getRecord(fulfillment, "pickupDetails"), "pickupAt"),
    );
    if (pickupAt) return pickupAt;

    const deliverAt = asDateString(
      getString(getRecord(fulfillment, "deliveryDetails"), "deliverAt"),
    );
    if (deliverAt) return deliverAt;

    const shipAt = asDateString(
      getString(getRecord(fulfillment, "shipmentDetails"), "expectedShippedAt"),
    );
    if (shipAt) return shipAt;
  }

  return asDateString(getString(order, "createdAt")) ?? new Date().toISOString().slice(0, 10);
};

const extractCustomer = (order: unknown): {
  name?: string;
  email?: string;
  phone?: string;
} => {
  const fulfillments = isRecord(order) && Array.isArray(order.fulfillments)
    ? order.fulfillments
    : [];

  for (const fulfillment of fulfillments) {
    if (!isRecord(fulfillment)) continue;

    const pickupRecipient = getRecord(
      getRecord(fulfillment, "pickupDetails"),
      "recipient",
    );
    if (pickupRecipient) {
      return {
        name: getString(pickupRecipient, "displayName") ?? undefined,
        email: getString(pickupRecipient, "emailAddress") ?? undefined,
        phone: getString(pickupRecipient, "phoneNumber") ?? undefined,
      };
    }

    const deliveryRecipient = getRecord(
      getRecord(fulfillment, "deliveryDetails"),
      "recipient",
    );
    if (deliveryRecipient) {
      return {
        name: getString(deliveryRecipient, "displayName") ?? undefined,
        email: getString(deliveryRecipient, "emailAddress") ?? undefined,
        phone: getString(deliveryRecipient, "phoneNumber") ?? undefined,
      };
    }
  }

  return {};
};

const extractLineItems = (order: unknown): SquareOrderLineItem[] => {
  if (!isRecord(order)) return [];
  if (!Array.isArray(order.lineItems)) return [];

  return order.lineItems;
};

export const getRetailOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.query("retailOrders").collect();
  },
});

export const getRetailOrder = query({
  args: {
    orderId: v.id("retailOrders"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.get(args.orderId);
  },
});

export const getSquareItemLookup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("itemCatalog")
      .withIndex("by_sortOrder")
      .collect();

    return items.flatMap((item) => {
      if (!item.active || typeof item.squareItemId !== "string") return [];
      return [{ itemId: item._id, squareItemId: item.squareItemId }];
    });
  },
});

export const upsertRetailOrderFromSquare = internalMutation({
  args: {
    squareOrderId: v.string(),
    desiredDate: v.string(),
    createdAt: v.number(),
    sourceName: v.optional(v.string()),
    customer: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    items: v.array(
      v.object({
        itemId: v.id("itemCatalog"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("retailOrders")
      .withIndex("by_square_order_id", (q) => q.eq("squareOrderId", args.squareOrderId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        desiredDate: args.desiredDate,
        sourceName: args.sourceName,
        customer: args.customer,
        items: args.items,
      });
      return existing._id;
    }

    return await ctx.db.insert("retailOrders", args);
  },
});

export const handleSquareOrderCreatedWebhook = httpAction(async (ctx, req) => {
  const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!squareAccessToken) {
    return new Response("SQUARE_ACCESS_TOKEN is not configured", { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const eventType = getEventType(payload);
  if (eventType !== ONLINE_ORDER_EVENT_TYPE) {
    return new Response("Ignored event type", { status: 200 });
  }

  const orderId = extractOrderId(payload);
  if (!orderId) {
    return new Response("Missing order id in payload", { status: 400 });
  }

  const response = await fetch(`${SQUARE_API_URL}/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${squareAccessToken}`,
      "Square-Version": SQUARE_API_VERSION,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    return new Response(`Square API error: ${body}`, { status: response.status });
  }

  const json: unknown = await response.json();
  const order = getRecord(json, "order");
  if (!order) {
    return new Response("Square response missing order", { status: 502 });
  }

  if (isInPersonOrder(order)) {
    return new Response("Ignored in-person order", { status: 200 });
  }

  const catalogLookup: { itemId: Id<"itemCatalog">; squareItemId: string }[] =
    await ctx.runQuery(internal.retailOrders.getSquareItemLookup, {});
  const itemIdBySquareCatalogId = new Map(
    catalogLookup.map((entry) => [entry.squareItemId, entry.itemId]),
  );

  const itemTotals = new Map<Id<"itemCatalog">, number>();
  for (const lineItem of extractLineItems(order)) {
    const catalogObjectId =
      typeof lineItem.catalog_object_id === "string"
        ? lineItem.catalog_object_id
        : null;
    if (!catalogObjectId) continue;

    const itemId = itemIdBySquareCatalogId.get(catalogObjectId);
    if (!itemId) continue;

    const quantity = Number(lineItem.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    itemTotals.set(itemId, (itemTotals.get(itemId) ?? 0) + quantity);
  }

  if (itemTotals.size === 0) {
    return new Response("No mapped retail items on order", { status: 200 });
  }

  await ctx.runMutation(internal.retailOrders.upsertRetailOrderFromSquare, {
    squareOrderId: orderId,
    desiredDate: extractDesiredDate(order),
    createdAt: Date.now(),
    sourceName: getSourceName(order) ?? undefined,
    customer: extractCustomer(order),
    items: [...itemTotals.entries()].map(([itemId, quantity]) => ({
      itemId,
      quantity,
    })),
  });

  return new Response("Retail order stored", { status: 200 });
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { weekdayParValidator } from "./weekdayPar";

export default defineSchema({
  itemCatalog: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    unitId: v.id("units"),
    sortOrder: v.number(),
    active: v.boolean(),
    par: v.union(v.number(), weekdayParValidator),
    currentInventory: v.number(),
    squareItemId: v.optional(v.string()),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_sortOrder", ["sortOrder"]),
  categories: defineTable({
    name: v.string(),
    sortOrder: v.number(),
  }).index("by_sortOrder", ["sortOrder"]),
  units: defineTable({
    name: v.string(),
    sortOrder: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_sortOrder", ["sortOrder"]),
  productionOverrides: defineTable({
    date: v.string(),
    itemId: v.id("itemCatalog"),
    overrideQuantity: v.number(),
  }).index("by_date_item", ["date", "itemId"]),
  productionLocks: defineTable({
    date: v.string(),
    locked: v.boolean(),
    lockedAt: v.optional(v.number()),
  }).index("by_date", ["date"]),
  wholesaleOrders: defineTable({
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
  }).index("by_date", ["desiredDate"]),
  retailOrders: defineTable({
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
  })
    .index("by_date", ["desiredDate"])
    .index("by_square_order_id", ["squareOrderId"]),
  accessInvitations: defineTable({
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("employee"), v.literal("client")),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    source: v.union(v.literal("invite"), v.literal("request")),
    note: v.optional(v.string()),
    requestedByAuthUserId: v.optional(v.string()),
    requestedByName: v.optional(v.string()),
    resolvedByAuthUserId: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_email_and_status", ["email", "status"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_source_and_status", ["source", "status"]),
  bakerRoles: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    createdAt: v.number(),
  }).index("by_normalizedName", ["normalizedName"]),
  bakerRoleItems: defineTable({
    bakerRoleId: v.id("bakerRoles"),
    itemId: v.id("itemCatalog"),
  })
    .index("by_bakerRoleId", ["bakerRoleId"])
    .index("by_bakerRoleId_and_itemId", ["bakerRoleId", "itemId"]),
});

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./authorization";
import { getCatalog } from "./itemCatalog";
import { Id } from "./_generated/dataModel";

const uniqueItemIds = (itemIds: Id<"itemCatalog">[]) => [...new Set(itemIds)];

const validateRoleName = (name: string) => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ConvexError({ message: "Role name is required." });
  }
  return trimmed;
};

const normalizeRoleName = (name: string) => name.trim().toLowerCase();

export const getRoleManagementData = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);

    const [catalog, roles, roleItems] = await Promise.all([
      getCatalog(ctx),
      ctx.db.query("bakerRoles").collect(),
      ctx.db.query("bakerRoleItems").collect(),
    ]);

    return {
      catalog,
      roles: roles
        .map((role) => ({
          _id: role._id,
          name: role.name,
          itemIds: roleItems
            .filter((roleItem) => roleItem.bakerRoleId === role._id)
            .map((roleItem) => roleItem.itemId),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

export const listRolesForProduction = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "employee"]);

    const [roles, roleItems] = await Promise.all([
      ctx.db.query("bakerRoles").collect(),
      ctx.db.query("bakerRoleItems").collect(),
    ]);

    return roles
      .map((role) => ({
        _id: role._id,
        name: role.name,
        itemIds: roleItems
          .filter((roleItem) => roleItem.bakerRoleId === role._id)
          .map((roleItem) => roleItem.itemId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createRole = mutation({
  args: {
    name: v.string(),
    itemIds: v.array(v.id("itemCatalog")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const name = validateRoleName(args.name);
    const normalizedName = normalizeRoleName(name);
    const itemIds = uniqueItemIds(args.itemIds);

    const existing = await ctx.db
      .query("bakerRoles")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName),
      )
      .unique();

    if (existing) {
      throw new ConvexError({
        message: "A baker role with this name already exists.",
      });
    }

    const roleId = await ctx.db.insert("bakerRoles", {
      name,
      normalizedName,
      createdAt: Date.now(),
    });

    await Promise.all(
      itemIds.map((itemId) =>
        ctx.db.insert("bakerRoleItems", {
          bakerRoleId: roleId,
          itemId,
        }),
      ),
    );
  },
});

export const deleteRole = mutation({
  args: {
    roleId: v.id("bakerRoles"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const role = await ctx.db.get(args.roleId);

    if (!role) {
      throw new ConvexError({ message: "Baker role not found." });
    }

    const roleItems = await ctx.db
      .query("bakerRoleItems")
      .withIndex("by_bakerRoleId", (q) => q.eq("bakerRoleId", args.roleId))
      .collect();

    await Promise.all(roleItems.map((roleItem) => ctx.db.delete(roleItem._id)));
    await ctx.db.delete(args.roleId);
  },
});

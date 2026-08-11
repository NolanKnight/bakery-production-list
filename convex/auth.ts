import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  paginationResultValidator,
  paginationOptsValidator,
  type PaginationResult,
} from "convex/server";
import { betterAuth } from "better-auth/minimal";
import { ConvexError, v } from "convex/values";
import type { UserRoleValue } from "../shared/userRole";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;
const adminBootstrapEmails = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0),
);
const assignableRoleValidator = v.union(
  v.literal("admin"),
  v.literal("employee"),
  v.literal("client"),
);
const invitationSourceValidator = v.union(
  v.literal("invite"),
  v.literal("request"),
);
const invitationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
);
const manageableRoleValidator = v.union(
  v.literal("employee"),
  v.literal("client"),
);
const existingUserValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  role: v.union(
    v.literal("none"),
    v.literal("admin"),
    v.literal("employee"),
    v.literal("client"),
  ),
});

export const authComponent = createClient<DataModel>(components.betterAuth);

const normalizeEmail = (email: string) => email.trim().toLowerCase();
type RoleCtx = QueryCtx | MutationCtx;

const resolveRoleForEmail = async (
  ctx: RoleCtx,
  email: string,
): Promise<UserRoleValue> => {
  const normalizedEmail = normalizeEmail(email);
  if (adminBootstrapEmails.has(normalizedEmail)) {
    return "admin";
  }

  const acceptedInvites = await ctx.db
    .query("accessInvitations")
    .withIndex("by_email_and_status", (q) =>
      q.eq("email", normalizedEmail).eq("status", "accepted"),
    )
    .collect();
  if (acceptedInvites.length === 0) {
    return "none";
  }

  let latestAccepted = acceptedInvites[0];
  for (const invite of acceptedInvites) {
    if (!latestAccepted) {
      latestAccepted = invite;
      continue;
    }
    const inviteTimestamp = invite.resolvedAt ?? invite.createdAt;
    const latestTimestamp =
      latestAccepted.resolvedAt ?? latestAccepted.createdAt;
    if (inviteTimestamp > latestTimestamp) {
      latestAccepted = invite;
    }
  }
  return latestAccepted?.role ?? "none";
};

const getAuthedUser = async (ctx: GenericCtx<DataModel>) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new ConvexError({ message: "Not authenticated" });
  }
  return user;
};

const getAuthedRole = async (ctx: RoleCtx) => {
  const user = await getAuthedUser(ctx);
  const role = await resolveRoleForEmail(ctx, user.email);
  return { user, role };
};

const requireAdmin = async (ctx: RoleCtx) => {
  const { user, role } = await getAuthedRole(ctx);
  if (role !== "admin") {
    throw new ConvexError({ message: "Unauthorized" });
  }
  return user;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    user: {
      deleteUser: {
        enabled: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const role = await resolveRoleForEmail(ctx, user.email);
    return { ...user, role };
  },
});

export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return {
        isAuthenticated: false,
        role: "none" as const,
        pendingInvite: null,
        pendingRequest: null,
      };
    }

    const normalizedEmail = normalizeEmail(user.email);
    const role = await resolveRoleForEmail(ctx, user.email);
    const pendingInvite = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("source"), "invite"))
      .first();
    const pendingRequest = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("source"), "request"))
      .first();

    return {
      isAuthenticated: true,
      role,
      pendingInvite:
        pendingInvite === null
          ? null
          : {
              role: pendingInvite.role,
              createdAt: pendingInvite.createdAt,
            },
      pendingRequest:
        pendingRequest === null
          ? null
          : {
              role: pendingRequest.role,
              createdAt: pendingRequest.createdAt,
            },
    };
  },
});

export const requestAccess = mutation({
  args: {
    desiredRole: assignableRoleValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, role } = await getAuthedRole(ctx);
    if (role !== "none") {
      throw new ConvexError({
        message: "You already have an assigned role.",
      });
    }

    const normalizedEmail = normalizeEmail(user.email);
    const existingPending = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("source"), "request"))
      .first();
    if (existingPending) {
      throw new ConvexError({
        message: "You already have a pending access request.",
      });
    }

    await ctx.db.insert("accessInvitations", {
      email: normalizedEmail,
      role: args.desiredRole,
      status: "pending",
      source: "request",
      note: args.note?.trim() || undefined,
      requestedByAuthUserId: user._id,
      requestedByName: user.name,
      createdAt: Date.now(),
    });
  },
});

export const syncRoleFromInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const { user, role } = await getAuthedRole(ctx);
    if (role !== "none") {
      return { role };
    }

    const normalizedEmail = normalizeEmail(user.email);
    const pendingInvite = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("source"), "invite"))
      .first();
    if (!pendingInvite) {
      return { role };
    }

    await ctx.db.patch(pendingInvite._id, {
      status: "accepted",
      resolvedAt: Date.now(),
      resolvedByAuthUserId: user._id,
    });

    return { role: pendingInvite.role };
  },
});

export const createInvitation = mutation({
  args: {
    email: v.string(),
    role: assignableRoleValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);

    const normalizedEmail = normalizeEmail(args.email);
    const existingPendingInvite = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("source"), "invite"))
      .first();

    if (existingPendingInvite) {
      await ctx.db.patch(existingPendingInvite._id, {
        role: args.role,
        note: args.note?.trim() || existingPendingInvite.note,
      });
      return existingPendingInvite._id;
    }

    return await ctx.db.insert("accessInvitations", {
      email: normalizedEmail,
      role: args.role,
      status: "pending",
      source: "invite",
      note: args.note?.trim() || undefined,
      requestedByAuthUserId: adminUser._id,
      requestedByName: adminUser.name,
      createdAt: Date.now(),
    });
  },
});

export const listInvitations = query({
  args: {
    source: v.optional(invitationSourceValidator),
    status: v.optional(invitationStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let invitations = await ctx.db
      .query("accessInvitations")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", args.status ?? "pending"),
      )
      .collect();

    if (args.source) {
      invitations = invitations.filter(
        (invitation) => invitation.source === args.source,
      );
    }

    return invitations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const resolveInvitation = mutation({
  args: {
    invitationId: v.id("accessInvitations"),
    approve: v.boolean(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({ message: "Invitation not found." });
    }
    if (invitation.status !== "pending") {
      throw new ConvexError({
        message: "Invitation has already been resolved.",
      });
    }

    await ctx.db.patch(invitation._id, {
      status: args.approve ? "accepted" : "declined",
      resolvedAt: Date.now(),
      resolvedByAuthUserId: adminUser._id,
    });
  },
});

export const listExistingUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.string(),
  },
  returns: paginationResultValidator(existingUserValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const search = args.search.trim();
    const users: PaginationResult<{
      _id: string;
      name: string;
      email: string;
    }> = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where:
        search === ""
          ? undefined
          : [
              {
                field: "name",
                operator: "contains",
                value: search,
                connector: "OR",
              },
              {
                field: "email",
                operator: "contains",
                value: search,
              },
            ],
      sortBy: { field: "name", direction: "asc" },
      paginationOpts: args.paginationOpts,
    });

    return {
      ...users,
      page: await Promise.all(
        users.page.map(async (user) => ({
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: await resolveRoleForEmail(ctx, user.email),
        })),
      ),
    };
  },
});

export const updateExistingUserRole = mutation({
  args: {
    userId: v.string(),
    role: manageableRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId }],
    });
    if (!user) {
      throw new ConvexError({ message: "User not found." });
    }

    const currentRole = await resolveRoleForEmail(ctx, user.email);
    if (currentRole === "admin") {
      throw new ConvexError({ message: "Admin roles cannot be changed." });
    }

    const acceptedInvitations = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizeEmail(user.email)).eq("status", "accepted"),
      )
      .collect();
    const latestInvitation = acceptedInvitations.sort(
      (a, b) => (b.resolvedAt ?? b.createdAt) - (a.resolvedAt ?? a.createdAt),
    )[0];

    if (latestInvitation) {
      await ctx.db.patch(latestInvitation._id, {
        role: args.role,
        resolvedAt: Date.now(),
        resolvedByAuthUserId: adminUser._id,
      });
    } else {
      await ctx.db.insert("accessInvitations", {
        email: normalizeEmail(user.email),
        role: args.role,
        status: "accepted",
        source: "invite",
        requestedByAuthUserId: adminUser._id,
        requestedByName: adminUser.name,
        resolvedByAuthUserId: adminUser._id,
        createdAt: Date.now(),
        resolvedAt: Date.now(),
      });
    }

    return null;
  },
});

export const removeExistingUser = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId }],
    });
    if (!user) {
      throw new ConvexError({ message: "User not found." });
    }

    if ((await resolveRoleForEmail(ctx, user.email)) === "admin") {
      throw new ConvexError({ message: "Admin users cannot be removed." });
    }

    const invitations = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(user.email)))
      .collect();
    await Promise.all(
      invitations.map((invitation) => ctx.db.delete(invitation._id)),
    );

    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [{ field: "userId", value: args.userId }],
      },
      paginationOpts: { cursor: null, numItems: 100 },
    });
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "account",
        where: [{ field: "userId", value: args.userId }],
      },
      paginationOpts: { cursor: null, numItems: 100 },
    });
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId }],
      },
    });

    return null;
  },
});

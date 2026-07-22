import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import type { UserRoleValue } from "../shared/userRole";

type RoleCtx = QueryCtx | MutationCtx;
const adminBootstrapEmails = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0),
);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const requireRole = async (
  ctx: RoleCtx,
  allowed: readonly UserRoleValue[],
) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new ConvexError({ message: "Not authenticated" });
  }

  const normalizedEmail = normalizeEmail(user.email);
  let role: UserRoleValue = "none";

  if (adminBootstrapEmails.has(normalizedEmail)) {
    role = "admin";
  } else {
    const acceptedInvites = await ctx.db
      .query("accessInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "accepted"),
      )
      .collect();
    if (acceptedInvites.length > 0) {
      const latestAccepted = acceptedInvites.sort(
        (a, b) => (b.resolvedAt ?? b.createdAt) - (a.resolvedAt ?? a.createdAt),
      )[0];
      role = latestAccepted?.role ?? "none";
    }
  }

  if (!allowed.includes(role)) {
    throw new ConvexError({ message: "Unauthorized" });
  }

  return { user, role };
};

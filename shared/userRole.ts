import {
  Account,
  AccessManagement,
  BakerRoles,
  ItemCatalog,
  Inventory,
  Link,
  Par,
  Production,
  RetailOrders,
  WholesaleForm,
  WholesaleOrders,
} from "./links";

export const USER_ROLE_VALUES = [
  "none",
  "admin",
  "employee",
  "client",
] as const;
export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];
export const ASSIGNABLE_USER_ROLES = ["admin", "employee", "client"] as const;
export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

export default class UserRole {
  public static readonly None: UserRole = new UserRole("none", "No Access", []);
  public static readonly Admin: UserRole = new UserRole("admin", "Admin", [
    Production,
    Par,
    WholesaleForm,
    WholesaleOrders,
    RetailOrders,
    Inventory,
    ItemCatalog,
    AccessManagement,
    BakerRoles,
    Account,
  ]);
  public static readonly Employee: UserRole = new UserRole(
    "employee",
    "Employee",
    [Inventory, Production, Account],
  );
  public static readonly Client: UserRole = new UserRole("client", "Client", [
    WholesaleForm,
    Account,
  ]);

  private static readonly ByValue: Record<UserRoleValue, UserRole> = {
    none: UserRole.None,
    admin: UserRole.Admin,
    employee: UserRole.Employee,
    client: UserRole.Client,
  };

  private constructor(
    public readonly value: UserRoleValue,
    public readonly name: string,
    public readonly links: readonly Link[],
  ) {}

  public static from(value: unknown): UserRole {
    return UserRole.ByValue[normalizeUserRole(value)];
  }
}

export const normalizeUserRole = (value: unknown): UserRoleValue => {
  if (typeof value !== "string") return "none";

  const normalized = value.toLowerCase() as UserRoleValue;
  if (!USER_ROLE_VALUES.includes(normalized)) return "none";

  return normalized;
};

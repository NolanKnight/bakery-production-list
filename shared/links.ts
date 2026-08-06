export type Link = { name: string; path: string };

export const Par: Link = { name: "Par Values", path: "/par" };
export const WholesaleForm: Link = {
  name: "Wholesale Order Form",
  path: "/wholesale-form",
};
export const WholesaleOrders: Link = {
  name: "Wholesale Orders",
  path: "/wholesale-orders",
};
export const RetailOrders: Link = {
  name: "Retail Orders",
  path: "/retail-orders",
};
export const Production: Link = {
  name: "Daily Production",
  path: "/production",
};
export const Inventory: Link = { name: "Inventory", path: "/inventory" };
export const ItemCatalog: Link = {
  name: "Item Catalog",
  path: "/item-catalog",
};
export const AccessManagement: Link = {
  name: "Access Management",
  path: "/admin/access",
};
export const BakerRoles: Link = {
  name: "Baker Roles",
  path: "/admin/baker-roles",
};
export const Account: Link = { name: "Account", path: "/account" };

export const isLink = (value: unknown): value is Link => {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "path" in value &&
    typeof (value as Link).name === "string" &&
    typeof (value as Link).path === "string"
  );
};

export const Navigation = [
  Production,
  {
    name: "User Management",
    links: [AccessManagement, BakerRoles],
  },
  {
    name: "Item Management",
    links: [Par, Inventory, ItemCatalog],
  },
  {
    name: "Order History",
    links: [WholesaleOrders, RetailOrders],
  },
  Account,
];

export type Link = { name: string; path: string };

export const Par: Link = { name: "Par Values", path: "/par" } as const;
export const WholesaleForm: Link = { name: "Wholesale Order Form", path: "/wholesale-form" } as const;
export const WholesaleOrders: Link = { name: "Wholesale Orders", path: "/wholesale-orders" } as const;
export const Production: Link = { name: "Daily Production", path: "/production" } as const;
export const ItemCatalog: Link = { name: "Item Catalog", path: "/item-catalog" } as const;
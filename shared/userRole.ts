import {
  ItemCatalog,
  Link,
  Par,
  Production,
  WholesaleForm,
  WholesaleOrders,
} from "./links";

export default class UserRole {
  public static readonly Admin: UserRole = new UserRole("Admin", [
    Par,
    WholesaleForm,
    WholesaleOrders,
    Production,
    ItemCatalog,
  ]);
  public static readonly Employee: UserRole = new UserRole("Employee", [
    Production,
  ]);
  public static readonly Client: UserRole = new UserRole("Client", [
    WholesaleForm,
  ]);

  private constructor(
    public readonly name: string,
    public readonly links: Link[],
  ) {}
}

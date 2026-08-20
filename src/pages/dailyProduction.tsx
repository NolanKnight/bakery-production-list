import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Id } from "../../convex/_generated/dataModel";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Loading from "@/components/loading";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function DailyProductionPage() {
  const none = { name: "None (all items)" };

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [selectedBakerRole, setSelectedBakerRole] = useState<typeof none>(none);

  const setOverride = useMutation(api.production.setOverride);
  const overrides = useQuery(api.production.getOverrides, { date });
  const deleteOverride = useMutation(api.production.deleteOverride);

  const lock = useQuery(api.production.getLock, { date });
  const toggleLock = useMutation(api.production.toggleLock);

  const data = useQuery(api.production.getDailyProduction, { date });
  const bakerRoles = useQuery(api.bakerRoles.listRolesForProduction);
  const wholesaleOrders = useQuery(
    api.wholesaleOrders.getWholesaleOrdersForDate,
    { date },
  );
  const retailOrders = useQuery(api.retailOrders.getRetailOrdersForDate, {
    date,
  });
  const catalog = useQuery(api.itemCatalog.getItems, { includeInactive: true });
  const units = useQuery(api.units.getUnits);

  const updateOverride = (itemId: Id<"itemCatalog">, value: string) => {
    const override = getOverride(itemId);

    if (value === "" && override) {
      deleteOverride({ overrideId: override._id }).catch(toastError);
      return;
    }

    setOverride({
      date,
      itemId,
      overrideQuantity: Number(value),
    }).catch(toastError);
  };

  const getOverride = (itemId: Id<"itemCatalog">) => {
    if (!overrides) return null;
    return (
      overrides.find((o) => o.itemId === itemId && o.date === date) ?? null
    );
  };

  const printSection = (section: "wholesale" | "retail" | "production") => {
    const clearPrintSection = () => {
      delete document.body.dataset.printSection;
    };

    document.body.dataset.printSection = section;
    window.addEventListener("afterprint", clearPrintSection, { once: true });
    window.print();
  };

  const handleProductionPrint = () => {
    if (!lock?.locked) {
      setShowPrintWarning(true);
    } else {
      printSection("production");
    }
  };

  const effectiveSelectedBakerRole =
    selectedBakerRole === none ||
    bakerRoles?.some((role) => role === selectedBakerRole)
      ? selectedBakerRole
      : none;

  const selectedRole =
    effectiveSelectedBakerRole === none
      ? null
      : (bakerRoles?.find((role) => role === effectiveSelectedBakerRole) ??
        null);

  const selectedRoleItemIds = useMemo(
    () => (selectedRole ? new Set(selectedRole.itemIds) : null),
    [selectedRole],
  );

  const visibleData = useMemo(() => {
    if (!data) return null;
    if (!selectedRoleItemIds) return data;

    return data
      .map((entry) => ({
        ...entry,
        items: entry.items.filter((item) =>
          selectedRoleItemIds.has(item.itemId),
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [data, selectedRoleItemIds]);

  const itemLookup = useMemo(() => {
    const lookup = new Map<
      Id<"itemCatalog">,
      { categoryName: string; name: string; unitName: string }
    >();

    if (!catalog || !units) return lookup;

    const unitNameById = new Map(units.map((unit) => [unit._id, unit.name]));
    for (const category of catalog) {
      for (const item of category.items) {
        lookup.set(item._id, {
          categoryName: category.category.name,
          name: item.name,
          unitName: unitNameById.get(item.unitId) ?? "",
        });
      }
    }

    return lookup;
  }, [catalog, units]);

  if (
    !data ||
    !visibleData ||
    !wholesaleOrders ||
    !retailOrders ||
    !catalog ||
    !units
  ) {
    return <Loading />;
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h3 className="daily-orders-print-hidden text-xl font-bold">
        Daily Production
      </h3>
      <Card className="daily-orders-print-hidden">
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="font-medium">Date:</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <section className="daily-print-section" data-print-section="wholesale">
        <Card className="daily-screen-only p-0">
          <details className="daily-screen-only">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <h5 className="text-xl">Wholesale Orders</h5>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={(event) => {
                    event.preventDefault();
                    printSection("wholesale");
                  }}
                >
                  Print
                </Button>
                <ChevronDown className="size-4 transition-transform in-[[open]]:rotate-180" />
              </div>
            </summary>
            <div className="space-y-3 border-t p-4">
              {wholesaleOrders.length > 0 ? (
                <>
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-4 text-sm text-muted-foreground">
                    <span>Client</span>
                    <span>Email</span>
                    <span>Desired Date</span>
                    <span>Items</span>
                    <span className="sr-only">Order actions</span>
                  </div>
                  {wholesaleOrders.map((order) => (
                    <details
                      key={order._id}
                      className="daily-order-details rounded-md border"
                    >
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 p-4 text-sm [&::-webkit-details-marker]:hidden">
                        <span>{order.clientName}</span>
                        <span>{order.email}</span>
                        <span>{order.desiredDate}</span>
                        <span>{order.items.length} items</span>
                        <ChevronDown className="daily-order-chevron size-4" />
                      </summary>
                      <div className="border-t p-4">
                        <Link
                          to={`/wholesale-order/${order._id}`}
                          // className="mb-4 inline-block text-sm underline underline-offset-4 print:hidden"
                          className={cn(
                            buttonVariants({ variant: "link", size: "lg" }),
                            "print:hidden pl-2.5",
                          )}
                        >
                          Go to Order
                        </Link>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">
                                Quantity
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.items.map((item) => {
                              const details = itemLookup.get(item.itemId);
                              return (
                                <TableRow key={item.itemId}>
                                  <TableCell>
                                    {details?.name ?? item.itemId}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantity}
                                    {details?.unitName
                                      ? ` ${details.unitName}`
                                      : ""}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground">
                  No wholesale orders for this date.
                </p>
              )}
            </div>
          </details>
        </Card>
        <div data-section-print-only className="hidden">
          {wholesaleOrders.map((order) => (
            <div key={order._id} className="daily-order-print-page mb-6">
              <h3>{order.clientName}</h3>
              <p>Email: {order.email}</p>
              <p>Desired Date: {order.desiredDate}</p>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const details = itemLookup.get(item.itemId);
                    return (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          {details
                            ? `${details.categoryName} : ${details.name}`
                            : item.itemId}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                          {details?.unitName ? ` ${details.unitName}` : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </section>

      <section className="daily-print-section" data-print-section="retail">
        <Card className="daily-screen-only p-0">
          <details className="daily-screen-only">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <h5 className="text-xl">Retail Orders</h5>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={(event) => {
                    event.preventDefault();
                    printSection("retail");
                  }}
                >
                  Print
                </Button>
                <ChevronDown className="size-4 transition-transform in-[[open]]:rotate-180" />
              </div>
            </summary>
            <div className="space-y-3 border-t p-4">
              {retailOrders.length > 0 ? (
                <>
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-4 text-sm text-muted-foreground">
                    <span>Customer</span>
                    <span>Desired Date</span>
                    <span>Source</span>
                    <span>Items</span>
                    <span className="sr-only">Order actions</span>
                  </div>
                  {retailOrders.map((order) => (
                    <details
                      key={order._id}
                      className="daily-order-details rounded-md border"
                    >
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 p-4 text-sm [&::-webkit-details-marker]:hidden">
                        <span>{order.customer.name ?? "Unknown customer"}</span>
                        <span>{order.desiredDate}</span>
                        <span>{order.fulfillmentType ?? "Unknown source"}</span>
                        <span>{order.items.length} items</span>
                        <ChevronDown className="daily-order-chevron size-4" />
                      </summary>
                      <div className="border-t p-4">
                        <Link
                          to={`/retail-order/${order._id}`}
                          className="mb-4 inline-block text-sm underline underline-offset-4 print:hidden"
                        >
                          Go to Order
                        </Link>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">
                                Quantity
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.items.map((item, index) => {
                              const details = itemLookup.get(item.itemId);
                              return (
                                <TableRow key={`${item.itemId}-${index}`}>
                                  <TableCell>
                                    {details?.name ?? item.itemId}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {item.quantity}
                                    {details?.unitName
                                      ? ` ${details.unitName}`
                                      : ""}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground">
                  No retail orders for this date.
                </p>
              )}
            </div>
          </details>
        </Card>
        <div data-section-print-only className="hidden">
          {retailOrders.map((order) => (
            <div key={order._id} className="daily-order-print-page mb-6">
              <h3>{order.customer.name ?? "Unknown customer"}</h3>
              <p>Email: {order.customer.email ?? "No email provided"}</p>
              <p>Phone: {order.customer.phone ?? "No phone provided"}</p>
              <p>Desired Date: {order.desiredDate}</p>
              <p>Source: {order.fulfillmentType ?? "Unknown source"}</p>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => {
                    const details = itemLookup.get(item.itemId);
                    return (
                      <TableRow key={`${item.itemId}-${index}`}>
                        <TableCell>
                          {details
                            ? `${details.categoryName} : ${details.name}`
                            : item.itemId}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                          {details?.unitName ? ` ${details.unitName}` : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </section>

      <section className="daily-print-section" data-print-section="production">
        <Card className="p-0">
          <details open>
            <summary className="daily-screen-only flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <h5 className="text-xl">Need to Bake</h5>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleProductionPrint();
                  }}
                >
                  Print
                </Button>
                <ChevronDown className="size-4 transition-transform in-[[open]]:rotate-180" />
              </div>
            </summary>
            <div className="space-y-6 border-t p-4">
              <div className="daily-screen-only flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Baker role:</span>
                  <Select
                    value={effectiveSelectedBakerRole}
                    itemToStringLabel={(item) => item.name}
                    onValueChange={(v) => {
                      if (v) setSelectedBakerRole(v);
                    }}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={none.name} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={none}>{none.name}</SelectItem>
                      {bakerRoles?.map((role) => (
                        <SelectItem key={role._id} value={role}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => void toggleLock({ date }).catch(toastError)}
                    variant={lock?.locked ? "destructive" : "default"}
                  >
                    {lock?.locked ? "Unlock Sheet" : "Lock Sheet"}
                  </Button>
                </div>
              </div>
              <h2 className="hidden text-2xl font-bold print:block">
                Need to Bake
              </h2>
              {visibleData.map((entry) => (
                <div key={entry.category._id}>
                  <h4 className="mb-2">{entry.category.name}</h4>
                  <Table className="text-center">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Par</TableHead>
                        <TableHead className="text-center">Wholesale</TableHead>
                        <TableHead className="text-center">Retail</TableHead>
                        <TableHead className="text-center">Inventory</TableHead>
                        <TableHead className="text-center">Computed</TableHead>
                        <TableHead className="text-center">Override</TableHead>
                        <TableHead className="text-center">Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.items.map((item) => (
                        <TableRow
                          key={item.itemId}
                          className="print:break-inside-avoid"
                        >
                          <TableCell className="text-left font-light uppercase">
                            {item.name}
                          </TableCell>
                          <TableCell>{item.par}</TableCell>
                          <TableCell>{item.wholesale}</TableCell>
                          <TableCell>{item.retail}</TableCell>
                          <TableCell>{item.currentInventory}</TableCell>
                          <TableCell>{item.computedTotal}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder="None"
                              value={
                                getOverride(item.itemId)?.overrideQuantity ?? ""
                              }
                              disabled={lock?.locked}
                              onChange={(e) =>
                                updateOverride(item.itemId, e.target.value)
                              }
                              className="w-24 print:hidden"
                            />
                            <span className="hidden print:inline">
                              {getOverride(item.itemId)?.overrideQuantity ??
                                "—"}
                            </span>
                          </TableCell>
                          <TableCell className="font-light uppercase">
                            {item.finalTotal}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </details>
        </Card>
      </section>

      {/* Unlock warning dialog */}
      <AlertDialog open={showPrintWarning} onOpenChange={setShowPrintWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sheet is not locked</AlertDialogTitle>
            <AlertDialogDescription>
              This production sheet is currently unlocked — overrides can still
              be changed. Are you sure you want to print now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowPrintWarning(false);
                setTimeout(() => printSection("production"), 500);
              }}
            >
              Print anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

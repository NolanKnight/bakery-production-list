import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";

import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoveLeft } from "lucide-react";
import Loading from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";

export default function WholesaleOrderPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id as Id<"wholesaleOrders"> | undefined;

  const order = useQuery(
    api.wholesaleOrders.getWholesaleOrder,
    orderId ? { orderId } : "skip",
  );
  const catalog = useQuery(api.itemCatalog.getItems, { includeInactive: true });
  const units = useQuery(api.units.getUnits);
  const roleState = useQuery(api.auth.getCurrentUserRole);
  const cancelOrder = useMutation(api.wholesaleOrders.cancelWholesaleOrder);

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

  if (!catalog || !units || roleState === undefined) return <Loading />;

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h3>Wholesale Order</h3>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }
  const canCancel =
    (roleState.role === "admin" || roleState.role === "client") &&
    order.cancelledAt === undefined;
  const canPrint = roleState.role === "admin" || roleState.role === "employee";

  const handleCancel = () => {
    void cancelOrder({ orderId: order._id })
      .then(() => toast.success("Order cancelled."))
      .catch(toastError);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-6 print:hidden">
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-start">
            <Link
              to={roleState.role === "client" ? "/" : "/wholesale-orders"}
              className={cn(
                buttonVariants({ variant: "link", size: "lg" }),
                "px-0",
              )}
            >
              <MoveLeft />
              {roleState.role === "client"
                ? "Back to Dashboard"
                : "Back to Orders"}
            </Link>
            <h3>Wholesale Order</h3>
          </div>
          {canPrint && (
            <Button variant="outline" onClick={() => window.print()}>
              Print
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>{order.clientName}</CardTitle>
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Cancel order
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This order will no longer appear in daily production.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep order</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleCancel}
                    >
                      Cancel order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="font-medium">Email:</span> {order.email}
            </p>
            <p>
              <span className="font-medium">Desired Date:</span>{" "}
              {order.desiredDate}
            </p>
            <p>
              <span className="font-medium">Submitted:</span>{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>
            {order.cancelledAt !== undefined && (
              <p className="font-medium text-destructive">
                This order is cancelled.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>

          <CardContent>
            {order.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {order.items.map((item) => {
                    const details = itemLookup.get(item.itemId);
                    const unitName = details?.unitName
                      ? ` ${details.unitName}`
                      : "";

                    return (
                      <TableRow key={item.itemId}>
                        <TableCell>{details?.name ?? item.itemId}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                          {unitName}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No items ordered.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block">
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
    </div>
  );
}

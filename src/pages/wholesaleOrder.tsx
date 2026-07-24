import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { Id } from "convex/_generated/dataModel";

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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoveLeft } from "lucide-react";
import Loading from "@/components/loading";

export default function WholesaleOrderPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id as Id<"wholesaleOrders"> | undefined;

  const order = useQuery(
    api.wholesaleOrders.getWholesaleOrder,
    orderId ? { orderId } : "skip",
  );
  const catalog = useQuery(api.itemCatalog.getItems);
  const units = useQuery(api.units.getUnits);

  const itemLookup = useMemo(() => {
    const lookup = new Map<Id<"itemCatalog">, { name: string; unitName: string }>();

    if (!catalog || !units) return lookup;

    const unitNameById = new Map(units.map((unit) => [unit._id, unit.name]));

    for (const category of catalog) {
      for (const item of category.items) {
        lookup.set(item._id, {
          name: item.name,
          unitName: unitNameById.get(item.unitId) ?? "",
        });
      }
    }

    return lookup;
  }, [catalog, units]);

  if (!catalog || !units) return <Loading />;

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h3>Wholesale Order</h3>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-col items-start">
        <Link to="/wholesale-orders" className={cn(buttonVariants({ variant: "link", size: "lg" }), "px-0")}>
          <MoveLeft />
          Back to orders
        </Link>
        <h3>Wholesale Order</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{order.clientName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Email:</span> {order.email}
          </p>
          <p>
            <span className="font-medium">Desired Date:</span> {order.desiredDate}
          </p>
          <p>
            <span className="font-medium">Submitted:</span>{" "}
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>

        <CardContent>
          {(
            order.items.length > 0 ?
          
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
                const unitName = details?.unitName ? ` ${details.unitName}` : "";

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
          :
        <p className="text-muted-foreground">No items ordered.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RetailOrdersPage() {
  const orders = useQuery(api.retailOrders.getRetailOrders);
  const navigate = useNavigate();

  if (!orders) return undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h3>Retail Orders</h3>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Desired Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Items</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order._id}
                  className="cursor-pointer"
                  onClick={() => {
                    void navigate(`/retail-order/${order._id}`);
                  }}
                >
                  <TableCell>{order.customer.name ?? "Unknown customer"}</TableCell>
                  <TableCell>{order.desiredDate}</TableCell>
                  <TableCell>{order.sourceName ?? "Unknown source"}</TableCell>
                  <TableCell className="text-right">
                    {order.items.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

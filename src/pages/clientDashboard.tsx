import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/loading";

export default function ClientDashboardPage() {
  const orders = useQuery(api.wholesaleOrders.getClientWholesaleOrders);
  const navigate = useNavigate();

  if (!orders) return <Loading />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3>Dashboard</h3>
        <Button onClick={() => navigate("/wholesale-form")}>New Order</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No orders submitted yet.</p>
          ) : (
            orders.slice(0, 5).map((order) => (
              <button
                key={order._id}
                type="button"
                className="w-full rounded-md border p-4 text-left transition-colors hover:bg-muted"
                onClick={() => navigate(`/wholesale-order/${order._id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{order.desiredDate}</span>
                  <span className="text-muted-foreground">
                    {order.items.length} item
                    {order.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

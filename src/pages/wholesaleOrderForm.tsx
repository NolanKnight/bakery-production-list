import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Id } from "../../convex/_generated/dataModel";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import Loading from "@/components/loading";
import { authClient } from "@/lib/auth-client";

export default function WholesaleOrderForm() {
  const session = authClient.useSession();

  const catalog = useQuery(api.itemCatalog.getItems, {});
  const units = useQuery(api.units.getUnits);

  const [clientName, setClientName] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [desiredDate, setDesiredDate] = useState("");

  const [orders, setOrders] = useState<Map<Id<"itemCatalog">, number>>(
    new Map(),
  );

  const navigate = useNavigate();

  const createWholesaleOrder = useMutation(
    api.wholesaleOrders.createWholesaleOrder,
  );

  useEffect(() => {
    setClientName(session.data?.user?.name);
    setEmail(session.data?.user?.email);
  }, [session.data?.user]);

  const updateQuantity = (itemId: Id<"itemCatalog">, value: string) => {
    const quantity = value === "" ? 0 : Number(value);

    setOrders((prev) => {
      const map = new Map(prev);
      map.set(itemId, quantity);
      return map;
    });
  };

  const handleSubmit = async () => {
    if (!desiredDate.trim()) {
      toast.error("Please enter a desired date for the order.");
      return;
    }

    if (!clientName || !email) {
      toast.error("The user name and email cannot be found");
      return;
    }

    const order = {
      clientName,
      email,
      desiredDate,
      items: [...orders.entries()]
        .map(([itemId, quantity]) => ({ itemId, quantity }))
        .filter((order) => order.quantity > 0),
    };

    if (order.items.length === 0) {
      toast.error("Cannot submit an empty order.");
      return;
    }

    try {
      const orderId = await createWholesaleOrder(order);
      toast.success("Successfully submitted order.");
      navigate(`/wholesale-order/${orderId}`);
    } catch (error) {
      toastError(error);
      return;
    }

    setClientName("");
    setEmail("");
    setDesiredDate("");
    setOrders(new Map());
  };

  const getUnit = (id: Id<"units">) => {
    if (!units) return;

    for (const unit of units) {
      if (unit._id === id) {
        return unit;
      }
    }
  };

  if (!catalog || !clientName || !email) return <Loading />;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h3>New Order</h3>
      <Card>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="desired-date">Desired Date</FieldLabel>
            <Input
              id="desired-date"
              type="date"
              value={desiredDate}
              onChange={(e) => setDesiredDate(e.target.value)}
            />
            <FieldDescription>
              The date that the order is desired to be picked up on.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {catalog.map((entry) => (
        <Card key={entry.category._id}>
          <CardHeader>
            <CardTitle>{entry.category.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entry.items.map((item) => (
              <div
                key={item._id}
                className="grid grid-cols-[1fr_120px_auto] items-center gap-4"
              >
                <h5>{item.name}</h5>

                <Input
                  type="number"
                  min={0}
                  value={orders?.get(item._id) ?? 0}
                  onChange={(e) => updateQuantity(item._id, e.target.value)}
                />

                <span className="text-muted-foreground">
                  {getUnit(item.unitId)?.name}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSubmit}>Submit Order</Button>
    </div>
  );
}

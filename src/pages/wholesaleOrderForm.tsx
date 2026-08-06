import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Id } from "../../convex/_generated/dataModel";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import Loading from "@/components/loading";

export default function WholesaleOrderForm() {
  const catalog = useQuery(api.itemCatalog.getItems, {});
  const units = useQuery(api.units.getUnits);

  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [desiredDate, setDesiredDate] = useState("");

  const [orders, setOrders] = useState<Map<Id<"itemCatalog">, number>>();

  const createWholesaleOrder = useMutation(
    api.wholesaleOrders.createWholesaleOrder,
  );

  const updateQuantity = (itemId: Id<"itemCatalog">, value: string) => {
    console.log("update");
    const quantity = value === "" ? 0 : Number(value);

    console.log(orders);
    setOrders((prev) => {
      const map = prev ?? new Map();
      map.set(itemId, quantity);
      return map;
    });
    console.log(orders);
  };

  const handleSubmit = async () => {
    if (!orders) {
      toast.error("Cannot submit an empty order.");
      return;
    }

    const order = {
      clientName,
      email,
      desiredDate,
      items: [...orders.entries()].map(([itemId, quantity]) => {return {itemId, quantity}}).filter((order) => order.quantity > 0),
    };

    await createWholesaleOrder(order)
      .then(() => toast.success("Successfully submitted order."))
      .catch(toastError);

    // optional reset
    setClientName("");
    setEmail("");
    setDesiredDate("");
    setOrders(new Map());
  };

  const getQuantity = (itemId: Id<"itemCatalog">) => {
    if (!orders) return 0;

    for (const order of orders.entries()) {
      if (order[0] === itemId) {
        return order[1];
      }
    }
  
    return 0;
  };

  const getUnit = (id: Id<"units">) => {
    if (!units) return;

    for (const unit of units) {
      if (unit._id === id) {
        return unit;
      }
    }
  };

  if (!catalog) return <Loading />;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h3>New Order</h3>
      <Card>
        <CardContent className="space-y-4">
          {/* Client Info */}
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="client-name">Client Name</FieldLabel>
              <Input
                id="client-name"
                placeholder="Buttercup Bakery"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-email">Client Email</FieldLabel>
              <Input
                id="client-email"
                type="email"
                placeholder="example@buttercupmb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldDescription>
                Email address to receieve the receipt.
              </FieldDescription>
            </Field>
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
          </div>
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
                  value={getQuantity(item._id)}
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

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Doc, Id } from "convex/_generated/dataModel";

import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError } from "@/lib/errors";
import Loading from "@/components/loading";

export default function InventoryPage() {
  const catalog = useQuery(api.itemCatalog.getItems);
  const units = useQuery(api.units.getUnits);
  const updateInventory = useMutation(api.itemCatalog.updateItemInventory);

  const [catalogInventory, setCatalogInventory] =
    useState<Map<Id<"itemCatalog">, number>>();

  useEffect(() => {
    if (!catalog) return;

    setCatalogInventory(
      catalog
        .flatMap((entry) => entry.items)
        .reduce((acc, { _id, currentInventory }) => {
          acc.set(_id, currentInventory ?? 0);
          return acc;
        }, new Map<Id<"itemCatalog">, number>()),
    );
  }, [catalog]);

  const getUnit = (id: Id<"units">) => {
    if (!units) return;

    for (const unit of units) {
      if (unit._id === id) {
        return unit;
      }
    }
  };

  const updateCatalogInventory = (
    inventoryValues: Map<Id<"itemCatalog">, number>,
    item: Doc<"itemCatalog">,
    inventory: string,
  ) => {
    setCatalogInventory(() => {
      const prev = new Map(inventoryValues);
      prev.set(item._id, Number(inventory));
      return prev;
    });
  };

  if (!catalog || !units || !catalogInventory) return <Loading />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h3>Inventory Values</h3>

        <p className="text-muted-foreground">
          Update current on-hand inventory amounts used by daily production.
        </p>
      </div>

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
                  value={catalogInventory.get(item._id)}
                  onChange={(e) =>
                    updateCatalogInventory(catalogInventory, item, e.target.value)
                  }
                  onBlur={(e) => {
                    updateInventory({
                      id: item._id,
                      currentInventory: Number(e.target.value),
                    }).catch(toastError);
                  }}
                />

                <span className="text-muted-foreground">
                  {getUnit(item.unitId)?.name}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doc, Id } from "convex/_generated/dataModel";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function ParPage() {
  const catalog = useQuery(api.itemCatalog.getItems);
  const units = useQuery(api.units.getUnits);

  const updatePar = useMutation(api.itemCatalog.updateItemPar);

  const [catalogPars, setCatalogPars] =
    useState<Map<Id<"itemCatalog">, number>>();

  useEffect(() => {
    if (!catalog) return;

    setCatalogPars(
      catalog
        .flatMap((entry) => entry.items)
        .reduce((acc, { _id, par }) => {
          acc.set(_id, par);
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

  const updateCatalogPars = async (
    pars: Map<Id<"itemCatalog">, number>,
    item: Doc<"itemCatalog">,
    par: string,
  ) => {
    setCatalogPars(() => {
      const prev = new Map(pars);
      prev.set(item._id, Number(par));
      return prev;
    });
  };

  if (!catalog || !units || !catalogPars) return undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h3>Par Values</h3>

        <p className="text-muted-foreground">
          Customize the required item quantities for in-house sales.
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
                    value={catalogPars.get(item._id)}
                    onChange={(e) =>
                      updateCatalogPars(catalogPars, item, e.target.value)
                    }
                    onBlur={async (e) => {
                      await updatePar({
                        id: item._id,
                        par: Number(e.target.value),
                      })
                        .then(() => {
                          toast.success(
                            <p>Successfully updated <b>{entry.category.name} : {item.name}</b> par value.</p>,
                          );
                        })
                        .catch(toastError);
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

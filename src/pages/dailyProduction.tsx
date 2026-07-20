import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Id } from "convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";

export default function DailyProductionPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const setOverride = useMutation(api.production.setOverride);
  const overrides = useQuery(api.production.getOverrides, { date });
  const deleteOverride = useMutation(api.production.deleteOverride);

  const lock = useQuery(api.production.getLock, { date });
  const toggleLock = useMutation(api.production.toggleLock);

  const data = useQuery(api.production.getDailyProduction, {
    date,
  });

  const updateOverride = (itemId: Id<"itemCatalog">, value: string) => {
    const override = getOverride(itemId);

    if (value === "" && override) {
      deleteOverride({
        overrideId: override._id,
      }).catch(toastError);

      return;
    }

    const num = Number(value);

    setOverride({
      date,
      itemId,
      overrideQuantity: num,
    }).catch(toastError);
  };

  const getOverride = (itemId: Id<"itemCatalog">) => {
    if (!overrides) return null;

    for (const override of overrides) {
      if (override.itemId === itemId && override.date === date) {
        return override;
      }
    }

    return null;
  };

  if (!data) return undefined;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Daily Production</h1>

            <Button
              onClick={() => toggleLock({ date }).catch(toastError)}
              variant={lock?.locked ? "destructive" : "default"}
            >
              {lock?.locked ? "Unlock Sheet" : "Lock Sheet"}
            </Button>
          </div>
        </CardHeader>

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

      {/* Production List */}
      {data.map((entry) => (
        <Card key={entry.category._id}>
          <CardHeader>
            <CardTitle>{entry.category.name}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {entry.items.map((item) => (
              <>
                <Separator />
                <div
                  key={item.itemId}
                  className="grid grid-cols-3 items-center justify-start gap-8"
                >
                  <span className="uppercase font-light text-wrap">
                    {item.name}
                  </span>

                  <div className="grid grid-rows-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Par: {item.par}</div>

                      <div className="text-sm">Wholesale: {item.wholesale}</div>

                      <div className="text-sm">
                        Computed: {item.computedTotal}
                      </div>
                    </div>

                    <div>
                      <span>Override: </span>
                      <Input
                        type="number"
                        placeholder="None"
                        value={getOverride(item.itemId)?.overrideQuantity ?? ""}
                        disabled={lock?.locked}
                        onChange={(e) =>
                          updateOverride(item.itemId, e.target.value)
                        }
                        className="w-auto"
                      />
                    </div>
                  </div>

                  <div className="font-light text-center uppercase">
                    Final: {item.finalTotal}
                  </div>
                </div>
              </>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

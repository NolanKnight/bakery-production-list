import { useAction, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

import CatalogCategoryCard from "@/components/catalog/CatalogCategoryCard";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import NewCategoryCard from "@/components/catalog/newCategoryCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import UnitRow from "@/components/units/UnitRow";
import NewUnitRow from "@/components/units/NewUnitRow";
import Loading from "@/components/loading";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

export default function ItemCatalogPage() {
  const catalog = useQuery(api.itemCatalog.getItems, {});
  const units = useQuery(api.units.getUnits);
  const validateSquareItemConnections = useAction(
    api.itemCatalog.validateSquareItemConnections,
  );
  const hasValidatedSquareConnections = useRef(false);

  const [addingCategory, setAddingCategory] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  useEffect(() => {
    if (!catalog || hasValidatedSquareConnections.current) return;
    hasValidatedSquareConnections.current = true;

    void validateSquareItemConnections({})
      .then((result) => {
        if (result.clearedItemCount > 0) {
          toast.info(
            `Removed ${result.clearedItemCount} invalid Square connection${result.clearedItemCount === 1 ? "" : "s"}.`,
          );
        }
      })
      .catch(toastError);
  }, [catalog, validateSquareItemConnections]);

  if (!catalog) return <Loading />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h3>Item Catalog</h3>

        <p className="text-muted-foreground">
          Manage bakery items, units, and categories.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {units?.map((unit) => (
            <UnitRow key={unit._id} unit={unit} />
          ))}

          {!addingUnit ? (
            <Button onClick={() => setAddingUnit(true)}>Add Unit</Button>
          ) : (
            <NewUnitRow
              onSave={() => setAddingUnit(false)}
              onCancel={() => setAddingUnit(false)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {!addingCategory ? (
          <Button onClick={() => setAddingCategory(true)}>Add Category</Button>
        ) : (
          <NewCategoryCard
            onCancel={() => setAddingCategory(false)}
            onSave={() => setAddingCategory(false)}
          />
        )}
      </div>

      {catalog.map((entry) => (
        <CatalogCategoryCard key={entry.category._id} catalogEntry={entry} />
      ))}
    </div>
  );
}

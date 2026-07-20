import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

import CatalogItemRow from "./CatalogItemRow";
import CatalogNewItemRow from "./CatalogNewItemRow";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Doc, Id } from "../../../convex/_generated/dataModel";
import { toastError } from "@/lib/errors";

type Props = {
  catalogEntry: {
    category: Doc<"categories">;
    items: Doc<"itemCatalog">[];
  };
};

export default function CatalogCategoryCard({ catalogEntry }: Props) {
  const addItem = useMutation(api.itemCatalog.addItem);

  const [adding, setAdding] = useState(false);

  const handleAdd = async (name: string, unitId: Id<"units">) => {
    await addItem({
      name,
      categoryId: catalogEntry.category._id,
      unitId,
    }).catch(toastError);

    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{catalogEntry.category.name}</CardTitle>

        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Add Item
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {catalogEntry.items.map((item) => (
          <CatalogItemRow key={item._id} item={item} />
        ))}

        {adding && (
          <CatalogNewItemRow
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

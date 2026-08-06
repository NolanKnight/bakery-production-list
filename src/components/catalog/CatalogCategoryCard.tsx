import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

import CatalogItemRow from "./CatalogItemRow";
import CatalogNewItemRow from "./CatalogNewItemRow";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Doc, Id } from "../../../convex/_generated/dataModel";
import { toastError } from "@/lib/errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { toast } from "sonner";

type Props = {
  catalogEntry: {
    category: Doc<"categories">;
    items: Doc<"itemCatalog">[];
  };
};

export default function CatalogCategoryCard({ catalogEntry }: Props) {
  const addItem = useMutation(api.itemCatalog.addItem);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(catalogEntry.category.name);

  const handleAdd = async (name: string, unitId: Id<"units">) => {
    await addItem({
      name,
      categoryId: catalogEntry.category._id,
      unitId,
    }).catch(toastError);

    setAdding(false);
  };

  const handleCancel = () => {
    setName(catalogEntry.category.name);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    await updateCategory({
      id: catalogEntry.category._id,
      name: name.trim(),
    })
      .then(() => toast.success(`Successfully updated ${name.trim()}.`))
      .catch(toastError);

    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteCategory({
      id: catalogEntry.category._id,
    })
      .then(() => setOpen(false))
      .catch((e) => {
        setOpen(false);
        toastError(e);
      });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-80"
          />
        ) : (
          <CardTitle>{catalogEntry.category.name}</CardTitle>
        )}

        <div className="flex items-center space-x-4">
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add Item
            </Button>
          )}

          {editing ? (
            <Button
              size="sm"
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}

          {/* Delete / Cancel */}
          {editing ? (
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          ) : (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger
                render={<Button size="sm" variant="destructive" />}
              >
                Delete
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete "{catalogEntry.category.name}"?
                  </AlertDialogTitle>

                  <AlertDialogDescription>
                    This will delete the category forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                  <AlertDialogAction
                    onClick={() => {
                      void handleDelete();
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
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

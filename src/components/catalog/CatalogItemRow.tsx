import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
} from "@/components/ui/alert-dialog";

import { Doc, Id } from "../../../convex/_generated/dataModel";
import { Separator } from "../ui/separator";
import { toastError } from "@/lib/errors";

type Props = {
  item: Doc<"itemCatalog">;
};

export default function CatalogItemRow({ item }: Props) {
  const units = useQuery(api.units.getUnits);
  const updateItem = useMutation(api.itemCatalog.updateItem);
  const deleteItem = useMutation(api.itemCatalog.deleteItem);

  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(item.name);
  const [squareItemId, setSquareItemId] = useState(item.squareItemId ?? "");

  const [unitId, setUnitId] = useState<Id<"units">>(item.unitId);
  const unitMap = useMemo(() => {
    const map = new Map<Id<"units">, string>();
    for (const unit of units ?? []) {
      map.set(unit._id, unit.name);
    }
    return map;
  }, [units]);

  const handleSave = async () => {
    if (!name.trim() || !unitId) {
      return;
    }

    await updateItem({
      id: item._id,
      name: name.trim(),
      unitId: unitId,
      squareItemId: squareItemId.trim(),
    }).catch(toastError);

    setEditing(false);
  };

  const handleCancel = () => {
    setName(item.name);
    setUnitId(item.unitId);
    setSquareItemId(item.squareItemId ?? "");
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteItem({
      id: item._id,
    })
      .then(() => setOpen(false))
      .catch((e) => {
        setOpen(false);
        toastError(e);
      });
  };

  return (
    <>
      <Separator />
      <div className="grid grid-cols-[1fr_150px_1fr_auto_auto] items-center gap-4 py-2">
        {/* Item Name */}
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <h5>{item.name}</h5>
        )}

        {/* Unit */}
        {editing ? (
          <Select
            value={unitMap?.get(unitId ?? item.unitId)}
            onValueChange={(unit) =>
              setUnitId(
                Array.from(unitMap?.entries() ?? [])?.find(
                  ([, name]) => name === unit,
                )?.[0] ?? item.unitId,
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {units?.map((unit) => (
                <SelectItem key={unit._id} value={unit.name}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground">
            {unitMap?.get(unitId ?? item.unitId) ?? "Select a unit"}
          </span>
        )}

        {/* Square Item ID */}
        {editing ? (
          <Input
            value={squareItemId}
            onChange={(e) => setSquareItemId(e.target.value)}
            placeholder="Square item id"
          />
        ) : (
          <span className="text-muted-foreground">
            {item.squareItemId ?? "No Square item id"}
          </span>
        )}

        {/* Edit / Save */}
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
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
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
                <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>

                <AlertDialogDescription>
                  This will remove the item from the catalog. The item will
                  still be listed in wholesale and retail orders.
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
    </>
  );
}

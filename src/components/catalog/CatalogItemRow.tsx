import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

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
import { CircleCheck, CircleX, SearchIcon } from "lucide-react";
import { Table, TableRow } from "../ui/table";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";

type Props = {
  item: Doc<"itemCatalog">;
};

type SquareCatalogItem = {
  id: string;
  name: string;
  description?: string;
};

const descriptionSnippet = (description?: string) => {
  if (!description) return "No description";
  const trimmed = description.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 100)}...`;
};

export default function CatalogItemRow({ item }: Props) {
  const units = useQuery(api.units.getUnits);
  const updateItem = useMutation(api.itemCatalog.updateItem);
  const deleteItem = useMutation(api.itemCatalog.deleteItem);
  const setSquareItemConnection = useMutation(api.itemCatalog.setSquareItemConnection);
  const getSquareCatalogItems = useAction(api.itemCatalog.getSquareCatalogItems);

  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [squareDialogOpen, setSquareDialogOpen] = useState(false);
  const [loadingSquareItems, setLoadingSquareItems] = useState(false);
  const [connectingSquareItemId, setConnectingSquareItemId] = useState<string | null>(null);
  const [squareCatalogItems, setSquareCatalogItems] = useState<SquareCatalogItem[]>([]);
  const [squareItemsQuery, setSquareItemsQuery] = useState("");

  const [name, setName] = useState(item.name);

  const [unitId, setUnitId] = useState<Id<"units">>(item.unitId);
  const unitMap = useMemo(() => {
    const map = new Map<Id<"units">, string>();
    for (const unit of units ?? []) {
      map.set(unit._id, unit.name);
    }
    return map;
  }, [units]);

  const displayedSquareItems = useMemo(() => {
    const normalizedQuery = squareItemsQuery.trim().toLowerCase();
    const filtered = squareCatalogItems.filter((squareItem) =>
      squareItem.name.toLowerCase().includes(normalizedQuery),
    );

    if (!item.squareItemId) return filtered;

    const selected = squareCatalogItems.find(
      (squareItem) => squareItem.id === item.squareItemId,
    );
    if (!selected) return filtered;

    const withoutSelected = filtered.filter(
      (squareItem) => squareItem.id !== item.squareItemId,
    );

    return [selected, ...withoutSelected];
  }, [squareCatalogItems, squareItemsQuery, item.squareItemId]);

  const handleSave = async () => {
    if (!name.trim() || !unitId) {
      return;
    }

    await updateItem({
      id: item._id,
      name: name.trim(),
      unitId: unitId,
    }).catch(toastError);

    setEditing(false);
  };

  const handleCancel = () => {
    setName(item.name);
    setUnitId(item.unitId);
    setEditing(false);
  };

  const loadSquareCatalogItems = async () => {
    setLoadingSquareItems(true);
    try {
      const items = await getSquareCatalogItems({});
      setSquareCatalogItems(items);
    } catch (e) {
      toastError(e);
    } finally {
      setLoadingSquareItems(false);
    }
  };

  const handleEditSquareConnection = async () => {
    setSquareDialogOpen(true);
    if (squareCatalogItems.length === 0) {
      await loadSquareCatalogItems();
    }
  };

  const setSquareConnection = async (squareItemId: string | undefined) => {
    setConnectingSquareItemId(squareItemId ?? null);
    try {
      await setSquareItemConnection({
        id: item._id,
        squareItemId,
      });
    } catch (e) {
      toastError(e);
    } finally {
      setConnectingSquareItemId(null);
    }
  };

  const toggleSquareSelection = async (squareItemId: string) => {
    const isSelected = item.squareItemId === squareItemId;
    await setSquareConnection(isSelected ? undefined : squareItemId);
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
      <div className="grid grid-cols-4 text-center place-items-center gap-4 py-2">
        {/* Item Name */}
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <h5 className="text-left justify-self-start">{item.name}</h5>
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

        {/* Square connection */}
        {editing ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void handleEditSquareConnection();
            }}
          >
            {item.squareItemId
              ? "Edit Square Connection"
              : "Connect to Square"}
          </Button>
        ) : (
          <div className="space-x-2 flex items-center">
          {(item.squareItemId ? <CircleCheck className="text-primary/50" size="20" /> : <CircleX className="text-destructive/50" size="20" />)}
          <span className={item.squareItemId ? "text-muted-foreground" : "text-muted-foreground"}>
            {item.squareItemId ? "Connected to Square" : "Not connected"}
          </span>
          </div>
        )}

        {/* Edit / Save */}
        <div className="flex space-x-4 items-center justify-self-end">
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
      </div>

      <AlertDialog open={squareDialogOpen} onOpenChange={setSquareDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Connect to Square</AlertDialogTitle>
            <AlertDialogDescription>
              Select the Square item to connect to "{item.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={loadingSquareItems}
                onClick={() => {
                  void loadSquareCatalogItems();
                }}
              >
                {loadingSquareItems ? "Loading..." : "Refresh list"}
              </Button>
            </div>

            <InputGroup>
              <InputGroupInput placeholder="Search..." value={squareItemsQuery} onChange={(e) => setSquareItemsQuery(e.target.value)} />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>

            <div className="max-h-[50vh] overflow-y-auto space-y-4">
            <Table>
              {displayedSquareItems.map((squareItem) => {
                const isSelected = squareItem.id === item.squareItemId;
                return (
                <TableRow key={squareItem.id}>
                  <button
                    type="button"
                    className="w-full text-left space-y-1 p-3 disabled:opacity-50 cursor-pointer"
                    disabled={connectingSquareItemId !== null}
                    onClick={() => {
                      void toggleSquareSelection(squareItem.id);
                    }}
                  >
                    <p className="font-medium flex items-center gap-2">
                      {squareItem.name}
                      {isSelected && (
                        <span className="text-xs rounded bg-primary/10 text-primary px-2 py-0.5">
                          Currently selected
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {descriptionSnippet(squareItem.description)}
                    </p>
                    {isSelected && (
                      <p className="text-xs text-muted-foreground">
                        Click again to unselect.
                      </p>
                    )}
                  </button>
                </TableRow>
                );
              })}

              {!loadingSquareItems && displayedSquareItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No Square items found.
                </p>
              )}
            </Table>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

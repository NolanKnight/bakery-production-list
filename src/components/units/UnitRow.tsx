import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import { Doc } from "../../../convex/_generated/dataModel";
import { Separator } from "../ui/separator";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";

type Props = {
  unit: Doc<"units">;
};

export default function CatalogItemRow({ unit }: Props) {
  const updateUnit = useMutation(api.units.updateUnit);
  const deleteUnit = useMutation(api.units.deleteUnit);

  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(unit.name);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    await updateUnit({
      id: unit._id,
      name: name.trim(),
    })
      .then(() => toast.success(`Successfully updated ${name.trim()}.`))
      .catch(toastError);

    setEditing(false);
  };

  const handleCancel = () => {
    setName(unit.name);
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteUnit({
      id: unit._id,
    })
      .then(() => {
        toast.success("Successfully deleted unit.");
      })
      .catch(toastError)
      .finally(() => {
        setOpen(false);
      });
  };

  return (
    <>
      <Separator />
      <div className="grid grid-cols-2 items-center gap-4 py-2">
        {/* Item Name */}
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <span>{unit.name}</span>
        )}

        <div className="flex justify-end space-x-4">
          {/* Edit / Save */}
          {editing ? (
            <Button size="sm" onClick={handleSave}>
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
                  <AlertDialogTitle>Delete "{unit.name}"?</AlertDialogTitle>

                  <AlertDialogDescription>
                    This will delete the unit forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </>
  );
}

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Separator } from "../ui/separator";
import { toastError } from "@/lib/errors";

type Props = {
  onSave: () => void;
  onCancel: () => void;
};

export default function CatalogNewItemRow({ onSave, onCancel }: Props) {
  const addUnit = useMutation(api.units.addUnit);
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    await addUnit({
      name,
    }).catch(toastError);

    setName("");
    onSave();
  };

  return (
    <>
      <Separator />
      <div className="grid grid-cols-3 items-center gap-4 py-2">
        {/* Name */}
        <Input
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Save */}
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>

        {/* Cancel */}
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Props = {
  onSave: (name: string, unit: Id<"units">) => Promise<void>;
  onCancel: () => void;
};

export default function CatalogNewItemRow({ onSave, onCancel }: Props) {
  const units = useQuery(api.units.getUnits);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Doc<"units"> | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !unit) {
      toast.error("Please enter an item name and unit.");
      return;
    }

    await onSave(name.trim(), unit._id);

    toast.success(
      <p>
        Successfully created <b>{name.trim()}</b>
      </p>,
    );

    setName("");
    setUnit(null);
  };

  return (
    <div className="flex justify-between items-center gap-4 border-b py-2">
      {/* Name */}
      <div className="flex space-x-4 items-center">
        <Input
          placeholder="Item name"
          className="w-80"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Unit */}
        <Select
          value={unit}
          itemToStringLabel={(unit) => unit.name}
          onValueChange={(unit) => setUnit(unit)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an item" />
          </SelectTrigger>

          <SelectContent>
            {units?.map((unit) => (
              <SelectItem key={unit._id} value={unit}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-4">
        {/* Save */}
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>

        {/* Cancel */}
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

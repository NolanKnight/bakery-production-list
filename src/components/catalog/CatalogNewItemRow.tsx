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
import { Id } from "convex/_generated/dataModel";

type Props = {
  onSave: (name: string, unit: Id<"units">) => Promise<void>;

  onCancel: () => void;
};

export default function CatalogNewItemRow({ onSave, onCancel }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Id<"units"> | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !unit) {
      return;
    }

    await onSave(name.trim(), unit);

    setName("");
    setUnit(null);
  };

  return (
    <div className="grid grid-cols-[1fr_150px_auto_auto] items-center gap-4 border-b py-2">
      {/* Name */}
      <Input
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      {/* Unit */}
      <Select value={unit} onValueChange={(unit) => setUnit(unit)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="items">items</SelectItem>

          <SelectItem value="quarts">quarts</SelectItem>
        </SelectContent>
      </Select>

      {/* Save */}
      <Button size="sm" onClick={handleSave}>
        Save
      </Button>

      {/* Cancel */}
      <Button size="sm" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

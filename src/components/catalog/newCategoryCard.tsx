import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError } from "@/lib/errors";

type Props = {
  onSave: () => void;
  onCancel: () => void;
};

export default function NewCategoryCard({ onSave, onCancel }: Props) {
  const addCategory = useMutation(api.categories.addCategory);

  const [category, setCategory] = useState("");

  const handleSave = async () => {
    if (!category.trim()) {
      return;
    }

    await addCategory({ name: category.trim() }).catch(toastError);

    onSave();
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Category name"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        autoFocus
      />

      <Button onClick={handleSave}>Save</Button>

      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

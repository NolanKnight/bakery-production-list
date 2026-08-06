import { SubmitEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import Loading from "@/components/loading";
import { toastError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Checkbox from "@/components/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { ChevronDown, ChevronUp } from "lucide-react";

const getCategoryState = (
  itemIds: Id<"itemCatalog">[],
  selectedItemIds: Set<Id<"itemCatalog">>,
) => {
  const selectedCount = itemIds.filter((itemId) =>
    selectedItemIds.has(itemId),
  ).length;
  return {
    allSelected: selectedCount === itemIds.length && itemIds.length > 0,
    partiallySelected: selectedCount > 0 && selectedCount < itemIds.length,
  };
};

export default function BakerRolesPage() {
  const data = useQuery(api.bakerRoles.getRoleManagementData);
  const createRole = useMutation(api.bakerRoles.createRole);
  const deleteRole = useMutation(api.bakerRoles.deleteRole);

  const [name, setName] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<
    Set<Id<"itemCatalog">>
  >(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  const selectedCount = selectedItemIds.size;
  const selectedArray = useMemo(() => [...selectedItemIds], [selectedItemIds]);

  const setCategoryChecked = (
    categoryItemIds: Id<"itemCatalog">[],
    shouldSelectAll: boolean,
  ) => {
    const next = new Set(selectedItemIds);

    for (const itemId of categoryItemIds) {
      if (shouldSelectAll) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
    }

    setSelectedItemIds(next);
  };

  const setItemChecked = (itemId: Id<"itemCatalog">, checked: boolean) => {
    const next = new Set(selectedItemIds);
    if (checked) next.add(itemId);
    else next.delete(itemId);
    setSelectedItemIds(next);
  };

  const handleCreateRole = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);

    void createRole({
      name,
      itemIds: selectedArray,
    })
      .then(() => {
        setName("");
        setSelectedItemIds(new Set());
        toast.success("Baker role created.");
      })
      .catch(toastError)
      .finally(() => setIsCreating(false));
  };

  const handleDeleteRole = (roleId: Id<"bakerRoles">) => {
    void deleteRole({ roleId })
      .then(() => toast.success("Baker role deleted."))
      .catch(toastError);
  };

  const toggleAccordion = (value: string) => {
    if (accordionValue.find((v) => v === value)) {
      setAccordionValue((v) => v.filter((v) => v !== value));
    } else {
      setAccordionValue((v) => [...v, value]);
    }
  };

  const Arrow = ({ value }: { value: string }) => {
    if (accordionValue.find((v) => v === value)) {
      return <ChevronUp />;
    }

    return <ChevronDown />;
  };

  if (!data) return <Loading />;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create baker role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="role-name">Role name</FieldLabel>
              <Input
                id="role-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Morning baker"
              />
            </Field>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select the items this role is responsible for baking.
              </p>
              <Accordion
                value={accordionValue as any}
                onValueChange={setAccordionValue}
              >
                {data.catalog.map((entry) => {
                  const categoryItemIds = entry.items.map((item) => item._id);
                  const state = getCategoryState(
                    categoryItemIds,
                    selectedItemIds,
                  );

                  return (
                    <AccordionItem
                      key={entry.category._id}
                      value={entry.category._id}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            state={state}
                            onChange={(event) =>
                              setCategoryChecked(
                                categoryItemIds,
                                event.target.checked,
                              )
                            }
                          />
                          <span>{entry.category.name}</span>
                        </div>
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={() => toggleAccordion(entry.category._id)}
                        >
                          <Arrow value={entry.category._id} />
                        </button>
                      </div>

                      <AccordionContent className="mt-3 ml-6 space-y-2">
                        {entry.items.map((item) => (
                          <label
                            key={item._id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              state={selectedItemIds.has(item._id)}
                              onChange={(event) =>
                                setItemChecked(item._id, event.target.checked)
                              }
                            />
                            <span>{item.name}</span>
                          </label>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
              </span>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create role"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing baker roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.roles.map((role) => (
            <div
              key={role._id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-sm text-muted-foreground">
                  {role.itemIds.length} assigned item
                  {role.itemIds.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void handleDeleteRole(role._id)}
              >
                Delete
              </Button>
            </div>
          ))}
          {data.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No baker roles yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Loading from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DailyProductionPage() {
  const none = { name: "None (all items)" };

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [selectedBakerRole, setSelectedBakerRole] = useState<typeof none>(none);

  const setOverride = useMutation(api.production.setOverride);
  const overrides = useQuery(api.production.getOverrides, { date });
  const deleteOverride = useMutation(api.production.deleteOverride);

  const lock = useQuery(api.production.getLock, { date });
  const toggleLock = useMutation(api.production.toggleLock);

  const data = useQuery(api.production.getDailyProduction, { date });
  const bakerRoles = useQuery(api.bakerRoles.listRolesForProduction);

  const updateOverride = (itemId: Id<"itemCatalog">, value: string) => {
    const override = getOverride(itemId);

    if (value === "" && override) {
      deleteOverride({ overrideId: override._id }).catch(toastError);
      return;
    }

    setOverride({
      date,
      itemId,
      overrideQuantity: Number(value),
    }).catch(toastError);
  };

  const getOverride = (itemId: Id<"itemCatalog">) => {
    if (!overrides) return null;
    return (
      overrides.find((o) => o.itemId === itemId && o.date === date) ?? null
    );
  };

  const handlePrint = () => {
    if (!lock?.locked) {
      setShowPrintWarning(true);
    } else {
      window.print();
    }
  };

  const effectiveSelectedBakerRole =
    selectedBakerRole === none ||
    bakerRoles?.some((role) => role === selectedBakerRole)
      ? selectedBakerRole
      : none;

  const selectedRole =
    effectiveSelectedBakerRole === none
      ? null
      : (bakerRoles?.find((role) => role === effectiveSelectedBakerRole) ??
        null);

  const selectedRoleItemIds = useMemo(
    () => (selectedRole ? new Set(selectedRole.itemIds) : null),
    [selectedRole],
  );

  const visibleData = useMemo(() => {
    if (!data) return null;
    if (!selectedRoleItemIds) return data;

    return data
      .map((entry) => ({
        ...entry,
        items: entry.items.filter((item) =>
          selectedRoleItemIds.has(item.itemId),
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [data, selectedRoleItemIds]);

  if (!data || !visibleData) return <Loading />;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h3 className="text-xl font-bold">Daily Production</h3>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">Date:</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48"
              />
              <div className="flex items-center gap-2">
                <span className="font-medium">Baker role:</span>
                <Select
                  value={effectiveSelectedBakerRole}
                  itemToStringLabel={(item) => item.name}
                  onValueChange={(v) => {
                    if (v) setSelectedBakerRole(v);
                  }}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder={none.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={none}>{none.name}</SelectItem>
                    {bakerRoles?.map((role) => (
                      <SelectItem key={role._id} value={role}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" onClick={handlePrint}>
                Print
              </Button>

              <Button
                onClick={() => void toggleLock({ date }).catch(toastError)}
                variant={lock?.locked ? "destructive" : "default"}
              >
                {lock?.locked ? "Unlock Sheet" : "Lock Sheet"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production List */}
      {visibleData.map((entry) => (
        <Card key={entry.category._id}>
          <CardHeader>
            <CardTitle>{entry.category.name}</CardTitle>
          </CardHeader>

          <CardContent>
            <Table className="text-center">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Par</TableHead>
                  <TableHead className="text-center">Wholesale</TableHead>
                  <TableHead className="text-center">Retail</TableHead>
                  <TableHead className="text-center">Inventory</TableHead>
                  <TableHead className="text-center">Computed</TableHead>
                  <TableHead className="text-center">Override</TableHead>
                  <TableHead className="text-center">Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.items.map((item) => (
                  <TableRow
                    key={item.itemId}
                    className="print:break-inside-avoid"
                  >
                    <TableCell className="uppercase font-light text-left">
                      {item.name}
                    </TableCell>
                    <TableCell>{item.par}</TableCell>
                    <TableCell>{item.wholesale}</TableCell>
                    <TableCell>{item.retail}</TableCell>
                    <TableCell>{item.currentInventory}</TableCell>
                    <TableCell>{item.computedTotal}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="None"
                        value={getOverride(item.itemId)?.overrideQuantity ?? ""}
                        disabled={lock?.locked}
                        onChange={(e) =>
                          updateOverride(item.itemId, e.target.value)
                        }
                        className="w-24 print:hidden"
                      />
                      <span className="hidden print:inline">
                        {getOverride(item.itemId)?.overrideQuantity ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="font-light uppercase">
                      {item.finalTotal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Unlock warning dialog */}
      <AlertDialog open={showPrintWarning} onOpenChange={setShowPrintWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sheet is not locked</AlertDialogTitle>
            <AlertDialogDescription>
              This production sheet is currently unlocked — overrides can still
              be changed. Are you sure you want to print now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setShowPrintWarning(false);
                setTimeout(window.print, 500);
              }}
            >
              Print anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

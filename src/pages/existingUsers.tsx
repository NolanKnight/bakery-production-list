import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AssignableUserRole } from "@/../shared/userRole";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

const manageableRoles: Exclude<AssignableUserRole, "admin">[] = [
  "employee",
  "client",
];

export default function ExistingUsersPage() {
  const [search, setSearch] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.auth.listExistingUsers,
    { search },
    { initialNumItems: 25 },
  );
  const updateRole = useMutation(api.auth.updateExistingUserRole);
  const removeUser = useMutation(api.auth.removeExistingUser);

  const handleRoleChange = async (
    userId: string,
    role: Exclude<AssignableUserRole, "admin">,
  ) => {
    await updateRole({ userId, role })
      .then(() => toast.success("User role updated."))
      .catch(toastError);
  };

  const handleRemove = async (userId: string, name: string) => {
    setRemovingUserId(userId);
    await removeUser({ userId })
      .then(() => toast.success(`${name} was removed from the app.`))
      .catch(toastError)
      .finally(() => setRemovingUserId(null));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Field className="max-w-md">
            <FieldLabel htmlFor="user-search">
              Search by name or email
            </FieldLabel>
            <Input
              id="user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      "admin"
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(role) => {
                          if (role) {
                            void handleRoleChange(
                              user.id,
                              role as Exclude<AssignableUserRole, "admin">,
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="No access" />
                        </SelectTrigger>
                        <SelectContent>
                          {manageableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <span className="text-muted-foreground">Protected</span>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button size="sm" variant="destructive" />}
                        >
                          Remove
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {user.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes their account and access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                void handleRemove(user.id, user.name)
                              }
                              disabled={removingUserId === user.id}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && status !== "LoadingFirstPage" ? (
                <TableRow>
                  <TableCell colSpan={4}>No users found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {status === "CanLoadMore" ? (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => loadMore(25)}
            >
              Load more
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

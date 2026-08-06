import { SubmitEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AssignableUserRole } from "@/../shared/userRole";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";

const requestableRoles: AssignableUserRole[] = ["client", "employee", "admin"];

export default function PendingAccessPage() {
  const [desiredRole, setDesiredRole] = useState<AssignableUserRole>("client");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingInvite, setIsSyncingInvite] = useState(false);

  const access = useQuery(api.auth.getCurrentUserRole);
  const requestAccess = useMutation(api.auth.requestAccess);
  const syncRoleFromInvitations = useMutation(api.auth.syncRoleFromInvitations);

  const pendingMessage = useMemo(() => {
    if (!access) return "Loading access status...";
    if (!access.isAuthenticated) return "Please log in to continue.";
    if (access.pendingInvite) {
      return `You have a pending ${access.pendingInvite.role} invitation.`;
    }
    if (access.pendingRequest) {
      return `Your ${access.pendingRequest.role} access request is pending approval.`;
    }
    return "You do not have access yet. Submit a request below.";
  }, [access]);

  const handleRequest = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await requestAccess({
      desiredRole,
      note: note.trim() === "" ? undefined : note.trim(),
    })
      .then(() => toast.success("Access request submitted."))
      .catch(toastError)
      .finally(() => setIsSubmitting(false));
  };

  const handleSyncInvitation = async () => {
    setIsSyncingInvite(true);
    await syncRoleFromInvitations()
      .then((result) => {
        if (result.role === "none") {
          toast.message("No pending invitation found for this account.");
          return;
        }
        toast.success(`Access granted as ${result.role}.`);
      })
      .catch(toastError)
      .finally(() => setIsSyncingInvite(false));
  };

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <div className="w-full min-h-screen bg-blue-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Pending access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{pendingMessage}</p>
          <Button onClick={handleSyncInvitation} disabled={isSyncingInvite}>
            {isSyncingInvite ? "Checking invitations..." : "Check invitations"}
          </Button>
          <form onSubmit={handleRequest} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="requested-role">Requested role</FieldLabel>
              <Select
                value={desiredRole}
                onValueChange={(role) => {
                  if (role) setDesiredRole(role);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {requestableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="request-note">Note (optional)</FieldLabel>
              <Input
                id="request-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything your admins should know"
              />
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Request access"}
            </Button>
          </form>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

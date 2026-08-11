import { SubmitEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignableUserRole } from "@/../shared/userRole";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inviteRoles: AssignableUserRole[] = ["employee", "client"];

export default function AdminAccessPage() {
  const invitations = useQuery(api.auth.listInvitations, { status: "pending" });
  const createInvitation = useMutation(api.auth.createInvitation);
  const createQuickSignInLink = useMutation(api.auth.createQuickSignInLink);
  const resolveInvitation = useMutation(api.auth.resolveInvitation);

  const [email, setEmail] = useState("");
  const [quickSignInEmail, setQuickSignInEmail] = useState("");
  const [quickSignInLink, setQuickSignInLink] = useState("");
  const [role, setRole] = useState<AssignableUserRole>("client");
  const [note, setNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingQuickSignInLink, setIsGeneratingQuickSignInLink] =
    useState(false);

  const handleCreate = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    await createInvitation({
      email,
      role,
      note: note.trim() === "" ? undefined : note.trim(),
    })
      .then(() => {
        setEmail("");
        setRole("client");
        setNote("");
        toast.success("Invitation created.");
      })
      .catch(toastError)
      .finally(() => setIsCreating(false));
  };

  const handleGenerateQuickSignInLink = async (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsGeneratingQuickSignInLink(true);
    await createQuickSignInLink({ email: quickSignInEmail })
      .then((token) => {
        setQuickSignInLink(
          `${window.location.origin}/quick-signup?token=${encodeURIComponent(token)}`,
        );
        toast.success("Sign-up link generated.");
      })
      .catch(toastError)
      .finally(() => setIsGeneratingQuickSignInLink(false));
  };

  const handleCopyQuickSignInLink = async () => {
    await navigator.clipboard
      .writeText(quickSignInLink)
      .then(() => toast.success("Sign-up link copied."))
      .catch(() => toast.error("Unable to copy the sign-up link."));
  };

  const handleResolve = async (
    invitation: Doc<"accessInvitations">,
    approve: boolean,
  ) => {
    await resolveInvitation({ invitationId: invitation._id, approve })
      .then(() =>
        toast.success(
          approve
            ? "Approved request."
            : invitation.source === "request"
              ? "Revoked invitation."
              : "Declined request.",
        ),
      )
      .catch(toastError);
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate client sign-up link</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              void handleGenerateQuickSignInLink(event);
            }}
            className="grid gap-4 md:grid-cols-[1fr_auto]"
          >
            <Field>
              <FieldLabel htmlFor="quick-sign-in-email">
                Client email
              </FieldLabel>
              <Input
                id="quick-sign-in-email"
                type="email"
                required
                value={quickSignInEmail}
                onChange={(event) => setQuickSignInEmail(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={isGeneratingQuickSignInLink}>
                {isGeneratingQuickSignInLink
                  ? "Generating..."
                  : "Generate Sign Up Link"}
              </Button>
            </div>
          </form>
          {quickSignInLink ? (
            <div className="mt-4 flex gap-2">
              <Input
                readOnly
                value={quickSignInLink}
                aria-label="Sign-up link"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleCopyQuickSignInLink();
                }}
              >
                Copy link
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select
                id="invite-role"
                value={role}
                onValueChange={(event) => setRole(event as AssignableUserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoles.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-note">Note</FieldLabel>
              <Input
                id="invite-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations and requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations?.map((invitation) => (
                <TableRow key={invitation._id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>{invitation.role}</TableCell>
                  <TableCell>{invitation.source}</TableCell>
                  <TableCell>{invitation.requestedByName ?? "N/A"}</TableCell>
                  <TableCell className="space-x-2">
                    {invitation.source === "request" ? (
                      <Button
                        size="sm"
                        onClick={() => handleResolve(invitation, true)}
                      >
                        Approve
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(invitation, false)}
                    >
                      {invitation.source === "request" ? "Decline" : "Revoke"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invitations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No pending items.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

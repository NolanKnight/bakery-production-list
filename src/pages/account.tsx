import { SubmitEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AccountPage() {
  const session = authClient.useSession();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(session.data?.user?.name ?? "");
  }, [session.data?.user?.name]);

  const handleProfileSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error("Name is required.");
      return;
    }

    setIsSaving(true);
    const result = await authClient.updateUser({ name: trimmedName });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to update profile.");
    } else {
      toast.success("Profile updated.");
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <div className="w-full flex justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="account-name">Name</FieldLabel>
              <Input
                id="account-name"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-email">Email</FieldLabel>
              <Input
                id="account-email"
                type="email"
                value={session.data?.user?.email ?? ""}
                disabled
                readOnly
              />
              <FieldDescription>
                Email changes are not available yet.
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </form>

          <div className="pt-2 border-t border-border">
            <Button variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

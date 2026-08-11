import { SubmitEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

export default function QuickSignupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const link = useQuery(
    api.auth.getQuickSignInLink,
    token === "" ? "skip" : { token },
  );
  const acceptQuickSignInLink = useMutation(api.auth.acceptQuickSignInLink);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!link) return;
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: link.email,
      password,
    });

    if (result.error) {
      toast.error(result.error.message ?? "Failed to create account.");
      setIsSubmitting(false);
      return;
    }

    window.sessionStorage.setItem("quick-sign-in-token", token);
    await acceptQuickSignInLink({ token })
      .then(() => {
        window.sessionStorage.removeItem("quick-sign-in-token");
        toast.success("Your client access has been activated.");
      })
      .catch(toastError)
      .finally(() => setIsSubmitting(false));
  };

  const invalidLink = link === null || token === "";
  return (
    <div className="w-full min-h-screen bg-blue-200 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client sign up</CardTitle>
        </CardHeader>
        <CardContent>
          {link === undefined ? (
            <p>Checking sign-up link...</p>
          ) : invalidLink ? (
            <p>
              This sign-up link is invalid, expired, or has already been used.
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="space-y-4"
            >
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" disabled value={link.email} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-sm">
            Need to sign up with a different email?{" "}
            <Link className="underline" to="/signup">
              Go to regular sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

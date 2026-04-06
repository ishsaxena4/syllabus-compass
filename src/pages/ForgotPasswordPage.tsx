import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().email("Please enter a valid email address.");

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await requestPasswordReset(parsed.data);
      if (resetError) {
        toast({
          variant: "destructive",
          title: "Unable to send reset email",
          description: resetError.message,
        });
        return;
      }

      setSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists, you'll receive a reset email shortly.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-elevated p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send a password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, we sent a
              recovery link to that inbox.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
            <Button asChild type="button" variant="ghost" className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

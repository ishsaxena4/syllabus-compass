import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters.");

type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");

  const hasRecoveryToken = useMemo(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    return (
      hash.includes("type=recovery") ||
      search.includes("type=recovery") ||
      hash.includes("access_token=") ||
      search.includes("access_token=")
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const markStateFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      if (session?.user) {
        setRecoveryState("ready");
      } else if (!hasRecoveryToken) {
        setRecoveryState("invalid");
      }
    };

    void markStateFromSession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session?.user)) {
        setRecoveryState("ready");
      }
    });

    const fallbackTimer = window.setTimeout(async () => {
      if (!isMounted) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      setRecoveryState(session?.user ? "ready" : "invalid");
    }, 1200);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      data.subscription.unsubscribe();
    };
  }, [hasRecoveryToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0]?.message ?? "Please enter a valid password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      toast({
        title: "Password updated",
        description: "Your password was reset successfully. Please sign in with your new password.",
      });
      navigate("/auth", { replace: true });
    } finally {
      setIsLoading(false);
    }
  }

  if (recoveryState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying reset link...
        </div>
      </div>
    );
  }

  if (recoveryState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md card-elevated p-6 md:p-8 space-y-4">
          <h1 className="text-2xl font-semibold">Reset link is invalid</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or expired. Request a new one to continue.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/forgot-password">Request new reset link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card-elevated p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-10"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pl-10"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

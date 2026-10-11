import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getAppUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useId } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type Mode = "signin" | "signup" | "reset";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" }>({
    text: "",
    type: "info",
  });

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  function switchMode(next: Mode) {
    setMode(next);
    setMessage({ text: "", type: "info" });
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    if (!isSupabaseConfigured) {
      setMessage({
        text: "Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        type: "error",
      });
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setBusy(true);
    setMessage({ text: "", type: "info" });

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${getAppUrl()}/?reset=1`,
        });
        if (error) throw error;
        setMessage({
          text: "Password reset email sent. Check your inbox and follow the link.",
          type: "info",
        });
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: getAppUrl() },
        });
        if (error) throw error;
        if (data.session) {
          onOpenChange(false);
          toast.success("Account created — welcome to GoCollabo!");
        } else {
          setMessage({
            text: "Almost there! Check your email to confirm your account, then sign in.",
            type: "info",
          });
        }
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      onOpenChange(false);
      toast.success("Signed in — welcome back!");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setMessage({ text: msg, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
  };

  const descriptions: Record<Mode, string> = {
    signin: "Sign in to GoCollabo to access your creator or brand workspace.",
    signup: "Join GoCollabo — create together, make things happen.",
    reset: "Enter your email and we'll send you a reset link.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor={emailId}>Email address</Label>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              aria-required="true"
            />
          </div>

          {/* Password (hidden on reset) */}
          {mode !== "reset" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={passwordId}>Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--navy)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] rounded"
                    onClick={() => switchMode("reset")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  placeholder={mode === "signup" ? "Min. 8 characters" : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="pr-10"
                  aria-required="true"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687087] hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy)] rounded"
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm password (signup only) */}
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor={confirmPasswordId}>Confirm password</Label>
              <Input
                id={confirmPasswordId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
                aria-required="true"
              />
            </div>
          )}

          {/* Feedback message */}
          {message.text && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm rounded-lg px-3 py-2 ${message.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-blue-700"
                }`}
            >
              {message.text}
            </p>
          )}

          {!isSupabaseConfigured && (
            <p className="text-xs text-[#8a6570] rounded-lg bg-amber-50 px-3 py-2">
              Supabase Auth is unavailable — set client environment variables to enable sign-in.
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="w-full rounded-full bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset email"}
          </button>

          {/* Mode switcher */}
          <p className="text-center text-sm text-[#687087]">
            {mode === "signin" ? (
              <>
                New to GoCollabo?{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--navy)] underline underline-offset-2"
                  onClick={() => switchMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--navy)] underline underline-offset-2"
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage("Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the client environment.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          onOpenChange(false);
          toast.success("Account created");
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onOpenChange(false);
        toast.success("Signed in");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">{mode === "signin" ? "Welcome back" : "Create your account"}</DialogTitle>
          <DialogDescription>
            {mode === "signin" ? "Sign in to access your saved marketplace work." : "Use your email to create a creator or brand account."}
          </DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
          </div>
          {message && <p role="status" className="text-sm text-[#687087]">{message}</p>}
          <button type="submit" disabled={busy || !isSupabaseConfigured} className="w-full rounded-full bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {!isSupabaseConfigured && <p className="text-xs text-[#8a6570]">Supabase Auth is unavailable until client configuration is set.</p>}
          <p className="text-center text-sm text-[#687087]">
            {mode === "signin" ? "New to FrameFoundry?" : "Already have an account?"}{" "}
            <button type="button" className="font-bold text-[var(--navy)] underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

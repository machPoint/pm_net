"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic email validation
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    // Simulate async submission; replace with real API later
    await new Promise((r) => setTimeout(r, 800));

    setStatus("success");
    setMessage("You're subscribed! Check your inbox for a confirmation email.");
    setEmail("");
  };

  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Stay in the loop</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Engineering insights, release notes, and tips — straight to your inbox. No spam.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full gap-3">
            <div className="grid w-full gap-2">
              <Label htmlFor="newsletter-email" className="sr-only">Email address</Label>
              <Input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="bg-background/60 placeholder:text-muted-foreground/60"
                aria-invalid={status === "error"}
                aria-describedby="newsletter-help"
              />
              <p id="newsletter-help" className="text-xs text-muted-foreground">
                We’ll never share your email.
              </p>
              {message && (
                <p
                  role={status === "error" ? "alert" : undefined}
                  className={[
                    "text-xs",
                    status === "error" ? "text-destructive" : "text-foreground/80",
                  ].join(" ")}
                >
                  {message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0"
            >
              {status === "loading" ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Proxima Engineering. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
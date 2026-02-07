"use client";

import { useForm, ValidationError } from "@formspree/react";

export const EmailCapture = () => {
  const [state, handleSubmit] = useForm("xnngdwjn");

  if (state.succeeded) {
    return (
      <div className="mt-6 sm:mt-8 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-md p-4">
          <p className="text-sm text-green-400 font-medium">submitted</p>
        </div>
      </div>
    );
  }

  return (
    <form 
      className="mt-6 sm:mt-8 w-full max-w-md" 
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
        <label htmlFor="email" className="sr-only">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          placeholder="you@company.com"
          required
          className="flex-1 rounded-md bg-black/40 border border-white/20 px-3 py-3 sm:py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
          aria-label="Email address"
          disabled={state.submitting}
        />
        <ValidationError 
          prefix="Email" 
          field="email"
          errors={state.errors}
          className="text-red-400 text-xs"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-white/10 border border-white/20 px-4 py-3 sm:py-2 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={state.submitting}
        >
          {state.submitting ? "Sending…" : "Notify me"}
        </button>
      </div>
    </form>
  );
};
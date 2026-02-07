"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, ValidationError } from '@formspree/react';

export default function ComingSoon() {
  const [state, handleSubmit] = useForm("mvgwqell");
  const [email, setEmail] = useState("");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1628]">
      {/* Background Image - Subtle */}
      <div className="absolute inset-0 opacity-30">
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1759805477090.png"
          alt="Background"
          fill
          className="object-cover"
          priority />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-6 lg:px-12 !text-base">
          <div className="max-w-2xl">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1759805667426.png"
                alt="MachPoint AI Logo"
                width={300}
                height={150}
                className="h-auto w-[280px] md:w-[320px]"
                priority />

            </div>

            {/* Tagline */}
            <h1 className="mb-3 text-[30px] font-bold text-white leading-tight !w-[729px] !h-11">
              The memory layer for communicating intelligence.
            </h1>

            {/* Description */}
            <p className="mb-8 text-base text-gray-300 leading-relaxed md:text-lg !w-full !h-[229px]">
              MachPoint is building the foundational layer for autonomous enterprise systems, 
              a platform where AI, data, and process intelligence converge. Rather than building 
              another ephemeral assistant, MachPoint delivers a persistent, identity-driven 
              architecture that allows organizations to deploy and own their own AI infrastructure. 
              It turns disconnected automation into coordinated intelligence, giving businesses 
              continuous memory, auditability, and control across their workflows. For investors, 
              MachPoint represents the infrastructure play behind the next wave of AI adoption: 
              durable, compliance-ready, and built for scale.
            </p>

            {/* Email Form */}
            {state.succeeded ? (
              <div className="max-w-md">
                <p className="text-green-400 text-lg font-semibold mb-2">🎉 Thanks for joining!</p>
                <p className="text-gray-300 text-sm">We'll notify you when MachPoint launches.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-2 max-w-md">
                <div className="flex-1">
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20" />
                  <ValidationError 
                    prefix="Email" 
                    field="email"
                    errors={state.errors}
                    className="text-red-400 text-sm mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={state.submitting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white font-semibold px-8">
                  {state.submitting ? "Sending..." : "Notify Me"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>);

}
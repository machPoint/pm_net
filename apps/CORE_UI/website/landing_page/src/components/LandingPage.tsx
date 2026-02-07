"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SunMoon, House, Grid3x2, PencilRuler, LayoutPanelTop, CornerRightUp, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

type LandingPageProps = {
  className?: string;
  style?: React.CSSProperties;
  onDemoClick?: () => void;
};

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("theme");
    const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved as "dark" | "light" || (prefersDark ? "dark" : "light");
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("theme", next);
  }, [theme]);

  return { theme, toggle };
}

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            observer.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, visible };
}

type Feature = {
  title: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const FEATURES: Feature[] = [
{
  title: "Pulse Feed",
  description:
  "Real-time stream of relevant changes across requirements, tickets, and docs—signal, not noise.",
  Icon: LayoutPanelTop
},
{
  title: "Impact Analysis",
  description:
  "Instantly see what changes ripple through your system, before they become surprises.",
  Icon: CornerRightUp
},
{
  title: "Trace Graph",
  description:
  "Visual traceability that connects requirements, decisions, tests, and commits end-to-end.",
  Icon: Grid3x2
},
{
  title: "Notes + Tasks",
  description:
  "Capture decisions and actions inline with context. Nothing gets lost in chat again.",
  Icon: PencilRuler
},
{
  title: "Daily Summary Reports",
  description:
  "Concise, AI-assisted briefs of what changed, what matters, and where you're blocked.",
  Icon: LayoutTemplate
},
{
  title: "Themes",
  description:
  "Organize threads across time. Follow topics like 'Safety' or 'Power Budget' effortlessly.",
  Icon: SunMoon
}];


function SectionHeader(props: {overline?: string;title: string;subtitle?: string;}) {
  return (
    <div className="mx-auto w-full max-w-3xl text-center">
      {props.overline ?
      <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {props.overline}
        </p> :
      null}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight !whitespace-pre-line !whitespace-pre-line">
        {props.title}
      </h2>
      {props.subtitle ?
      <p className="mt-3 text-sm sm:text-base text-muted-foreground !whitespace-pre-line !whitespace-pre-line">
          {props.subtitle}
        </p> :
      null}
    </div>);

}

function FeatureCard({ feature, index }: {feature: Feature;index: number;}) {
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[
      "group relative rounded-lg bg-card/60 ring-1 ring-border p-5 sm:p-6 transition",
      "hover:ring-primary/40 hover:shadow-[0_0_0_1px_var(--ring)] hover:shadow-primary/20",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      "duration-700 ease-out"].
      join(" ")}
      style={{ transitionDelay: `${index * 60}ms` }}>

      <div className="flex items-start gap-4">
        <div className="rounded-md bg-secondary/60 text-primary p-2.5 ring-1 ring-border group-hover:bg-secondary transition-colors">
          <feature.Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-medium leading-snug">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground break-words">{feature.description}</p>
        </div>
      </div>
    </div>);

}

export default function LandingPage({ className, style, onDemoClick }: LandingPageProps) {
  const { theme, toggle } = useTheme();
  const { ref: heroRef } = useInView<HTMLDivElement>();
  const { ref: probRef } = useInView<HTMLDivElement>();
  const { ref: solRef } = useInView<HTMLDivElement>();
  const { ref: credRef } = useInView<HTMLDivElement>();
  const { ref: ctaRef, visible: ctaVisible } = useInView<HTMLDivElement>();
  const [kfTab, setKfTab] = useState<"workflows" | "logic" | "formatting">("workflows");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const handleDemo = useCallback(() => {
    if (onDemoClick) return onDemoClick();
  }, [onDemoClick]);

  const nav = useMemo(
    () =>
    <nav className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/80 border-b border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                <House className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-semibold tracking-tight text-sm sm:text-base truncate">
                Proxima Engineering
              </span>
              <span className="mx-2 h-4 w-px bg-border hidden sm:inline-block" aria-hidden="true" />
              <span className="text-muted-foreground text-xs sm:text-sm truncate">
                CORE-SE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground">

                <SunMoon className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
              onClick={handleDemo}
              className="bg-primary text-primary-foreground hover:bg-primary/90">

                Get a Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>,

    [toggle, handleDemo]
  );

  return (
    <section
      className={[
      "w-full bg-background text-foreground",
      "antialiased",
      className].filter(Boolean).join(" ")}
      style={style}>

      {nav}

      <header className="relative">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* full-cover blurry grayscale background */}
          <div className="absolute inset-0 -z-20 bg-gradient-to-br from-muted/20 to-muted/40 blur-2xl opacity-60 scale-105" />
          {/* soft grain/vignette feel using layered gradients (monochrome) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,245,245,0.06)_0%,rgba(0,0,0,0.85)_70%)] blur-3xl scale-110" />
          {/* neutral, monochrome accent line (no blue) */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
          {/* side vignettes, grayscale */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/50 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/50 to-transparent" />
        </div>
        <div
          ref={heroRef}
          className="relative">
          
          {/* background video (loops, muted) with image poster fallback */}
          <div className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-secondary/10 to-muted/30">
            {/* Video placeholder - replace with actual video file */}
          </div>

          <div className="container mx-auto max-w-5xl text-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
              Take Control of Complexity. Engineer with Confidence.
            </h1>
            <p className="mt-4 text-sm sm:text-lg md:text-xl text-muted-foreground">
              CORE-SE unifies requirements, conversations, and context into one trusted
              workspace—so you can move fast without breaking systems.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                onClick={handleDemo}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Request a demo">

                Get a Demo
              </Button>
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">

                Explore features
              </a>
            </div>
          </div>

          {/* Full-width screenshot placeholder (replace later) */}
          <div className="mt-10 sm:mt-12">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-border">
                <div className="aspect-[16/9] w-full">
                  <div
                    className="h-full w-full bg-center bg-cover bg-secondary/20 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center"
                    role="img"
                    aria-label="App preview image">
                    <div className="text-center text-muted-foreground p-8">
                      <p className="text-lg font-medium mb-2">Dashboard Screenshot</p>
                      <p className="text-sm">Add hero-dashboard.png to /public folder</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        ref={probRef}
        className="!w-full !h-[412px] md:!py-20">




         

        <div className="mx-auto max-w-4xl rounded-lg bg-card/60 ring-1 ring-border p-6 sm:p-8">
          <SectionHeader
            overline="Problem"
            title="Modern Engineering is Drowning in Noise"
            subtitle="Data scattered across tools. Decisions buried in chats. Requirements drifting out of sync. Engineers are overwhelmed, and systems pay the price." />

          {/* Combined Solution copy */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase text-center">Solution</p>
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-center !whitespace-pre-line md:!text-[40px]">Find the Signal</h3>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground text-center">
              A unified workspace that tracks what matters across your systems—connecting requirements, trade-offs, and conversations into a living model. So your team can reason clearly, decide confidently, and execute fast.
            </p>
          </div>
        </div>
      </section>

      <section
        ref={solRef}
        className="py-0">




         

        <div className="mx-auto max-w-4xl text-center">
          {/* Text combined with Problem card above; keep media only */}

          <div className="mt-6 sm:mt-8 relative">
            <div className="rounded-lg bg-secondary/50 ring-1 ring-border p-4 sm:p-5 md:p-6">
              <div className="relative overflow-hidden rounded-md">
                <div className="aspect-[16/9] w-full rounded-md bg-card/60 ring-1 ring-border">
                  <div className="h-full w-full bg-gradient-to-br from-secondary/20 to-muted/40 flex items-center justify-center text-muted-foreground text-sm opacity-90">
                    Dashboard Preview
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-border/60 rounded-md" />
              </div>
              <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                Clear context. Connected artifacts. Decisions that compound.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container mx-auto max-w-6xl py-10 sm:py-12 md:py-14">
        <SectionHeader
          overline="Capabilities"
          title="Key Features to Reduce Complexity"
          subtitle="Designed for engineers who need tight traceability, strong signal, and relevant, timely information related to their requirements and tickets\xA0." />

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {FEATURES.map((f, i) =>
          <FeatureCard key={f.title} feature={f} index={i} />
          )}
        </div>
      </section>

      {/* Highlights grid (replicates image 1) */}
      <section className="container mx-auto max-w-6xl py-10 sm:py-12 md:py-14">
        <div className="rounded-lg bg-secondary/60 ring-1 ring-border p-6 sm:p-8">
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Highlights</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-semibold !whitespace-pre-line">AI Enabled for Technical Clarity</h3>
            </div>
            <p className="text-sm text-muted-foreground md:max-w-md">No blue backgrounds. Streamlined, grayscale UI with subtle accents, designed for engineering clarity and speed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md bg-card/60 ring-1 ring-border p-4">
              <div className="mb-3 text-sm font-medium">Parcel Code Editor</div>
              <div className="aspect-[16/9] rounded ring-1 ring-border overflow-hidden">
                <div className="h-full w-full bg-gradient-to-br from-secondary/20 to-muted/40 flex items-center justify-center text-muted-foreground text-sm">
                  Code Editor Preview
                </div>
              </div>
            </div>
            <div className="rounded-md bg-card/60 ring-1 ring-border p-4">
              <div className="mb-3 text-sm font-medium">Smart Chatbot</div>
              <div className="aspect-[16/9] rounded ring-1 ring-border flex items-center justify-center text-muted-foreground text-xs bg-secondary/20">Chat UI preview</div>
            </div>
            <div className="rounded-md bg-card/60 ring-1 ring-border p-4">
              <div className="mb-3 text-sm font-medium">Simple UI Components</div>
              <div className="h-24 rounded bg-secondary/60 ring-1 ring-border flex items-center justify-center text-muted-foreground text-xs">Buttons • Containers • Forms</div>
            </div>
            <div className="rounded-md bg-card/60 ring-1 ring-border p-4">
              <div className="mb-3 text-sm font-medium">Visual Workflow Builder</div>
              <div className="h-24 rounded bg-secondary/60 ring-1 ring-border flex items-center justify-center text-muted-foreground text-xs">Triggers → Actions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features with tabs (replicates image 2) */}
      <section className="container mx-auto max-w-6xl py-10 sm:py-12 md:py-14">
        <div className="rounded-lg bg-secondary/60 ring-1 ring-border p-6 sm:p-8">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Key Features</p>
          <h3 className="mt-2 text-2xl sm:text-3xl font-semibold !whitespace-pre-line">Integration, not replacement</h3>
          <div className="mt-6 grid grid-cols-1 gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {[
              { id: "workflows", label: "usewith current tools." },
              { id: "logic", label: "Local Libraries" },
              { id: "formatting", label: "AI Enabled" }].
              map((t) =>
              <button
                key={t.id}
                onClick={() => setKfTab(t.id as typeof kfTab)}
                className="!whitespace-pre-line">




                  {t.label}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="rounded-md bg-card/60 ring-1 ring-border p-5">
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {kfTab === "workflows" && "Multistep Workflows"}
                  {kfTab === "logic" && "Conditional Logic"}
                  {kfTab === "formatting" && "Data Formatting"}
                </p>
                <h4 className="mt-2 text-xl font-semibold !whitespace-pre-line !whitespace-pre-line">
                  {kfTab === "workflows" && "Jama Connected"}
                  {kfTab === "logic" && "Local Libraries"}
                  {kfTab === "formatting" && "AI Enabled"}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                  {kfTab === "workflows" && "ProximaSE doesn't ask you to abandon the tools you rely on. With built-in Jama connectivity, requirements flow seamlessly into your workspace. Every update, change, and relationship stays visible without leaving your familiar environment — ensuring traceability while reducing context switching and noise."}
                  {kfTab === "logic" && "Keep your own engineering knowledge at your fingertips. ProximaSE supports personal and team libraries where you can store notes, standards, references, and best practices. These libraries stay local, fast, and always accessible, so you can build up a trusted base of knowledge that grows alongside your projects."}
                  {kfTab === "formatting" && "ProximaSE isn't just a viewer, it's an assistant. With AI-enabled actions, you can instantly summarize changes, generate subtasks, or create daily reports directly from your data stream. Our AI is tuned for engineering clarity, giving you concise, actionable insights while keeping you in full control."}
                </p>
                <div className="mt-4">
                  <Button onClick={handleDemo} variant="outline">Learn More</Button>
                </div>
              </div>
              <div className="rounded-md bg-card/60 ring-1 ring-border p-4">
                <div className="aspect-[16/10] rounded ring-1 ring-border overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-br from-secondary/20 to-muted/40 flex items-center justify-center text-muted-foreground text-sm">
                    {
                    kfTab === "workflows" ?
                    "Workflow Preview" :
                    kfTab === "logic" ?
                    "Logic Preview" :
                    "Formatting Preview"
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (replicates image 3) */}
      <section className="container mx-auto max-w-6xl py-10 sm:py-12 md:py-14">
        <div className="rounded-lg bg-secondary/60 ring-1 ring-border p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">FAQ</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-semibold">Frequently asked questions</h3>
              <div className="mt-4">
                <Button variant="outline" onClick={handleDemo}>Contact Us →</Button>
              </div>
            </div>
            <div className="md:col-span-2 space-y-3">
              {[
              {
                q: "Who is CORE-SE for?",
                a: "Teams that need traceability and clarity across requirements, issues, parts, and communications—without changing all their tools."
              },
              {
                q: "What types of workflows can I automate?",
                a: "Change tracking, impact analysis notifications, test coverage checks, daily summaries, and more."
              },
              { q: "Do I need programming skills?", a: "No. Configure visually; extend with code when needed." },
              { q: "Can CORE-SE integrate with my existing tools?", a: "Yes—Jama, Jira, Windchill, Outlook, and more via adapters." },
              { q: "Is support available?", a: "Yes. We offer implementation help and priority support." }].
              map((item, i) =>
              <div key={i} className="rounded-md bg-card/60 ring-1 ring-border">
                  <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left">

                    <span className="font-medium">{item.q}</span>
                    <span className="text-muted-foreground text-xl leading-none">{faqOpen === i ? "×" : "+"}</span>
                  </button>
                  {faqOpen === i ?
                <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">{item.a}</div> :
                null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={ctaRef}
        className={[
        "container mx-auto max-w-6xl",
        "py-12 sm:py-14 md:py-16",
        ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        "transition-all duration-700 ease-out"].
        join(" ")}>

        <div className="relative overflow-hidden rounded-lg bg-secondary/60 ring-1 ring-border px-6 py-8 sm:px-8 md:px-10">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* monochrome radial gradient + subtle vignettes (no blue) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,245,245,0.06)_0%,rgba(0,0,0,0.85)_70%)] blur-2xl scale-110" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/40 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/40 to-transparent" />
          </div>
          <div className="relative mx-auto max-w-4xl text-center">
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              See CORE-SE in Action
            </h3>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Request a live walkthrough tailored to your system and workflow.
            </p>
            <div className="mt-6">
              <Button
                onClick={handleDemo}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Request a demo of CORE-SE">

                Get a Demo
              </Button>
            </div>
          </div>
        </div>
        <p className="sr-only">End of landing content</p>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto max-w-6xl py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                <House className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-medium text-foreground">Proxima Engineering</span>
              <span aria-hidden="true" className="mx-2 h-4 w-px bg-border" />
              <span>CORE-SE</span>
            </div>
            <div className="flex items-center gap-4">
              <span>© {new Date().getFullYear()}</span>
              <button
                onClick={toggle}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>

                <SunMoon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {theme === "dark" ? "Dark" : "Light"} mode
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>);

}